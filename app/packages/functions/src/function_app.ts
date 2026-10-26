import {
  UserDataFunctions,
  AudienceType,
  type RayfinContext,
} from '@microsoft/fabric-user-data-functions';
import {
  SHORTCUT_SUPPORTED_TYPES,
  detectCycles,
  emptyRow,
  flagOrphans,
  resolveTargetNames,
  selectWorkspaces,
  shortcutRows,
  type InventoryRow,
  type Item,
  type Workspace,
} from './inventory.js';

const udf = new UserDataFunctions();

const FABRIC_API = 'https://api.fabric.microsoft.com/v1';
const MAX_WORKERS = 8;
const MAX_RETRIES = 5;
const MAX_LIST_ENTRIES = 100;
// The UDF host aborts at 250 s; stop early so the user gets a partial result instead of a timeout.
const SCAN_DEADLINE_MS = 220_000;

export type ScanResult = {
  scanTimestamp: string;
  workspaceCount: number;
  itemCount: number;
  rows: InventoryRow[];
  warnings: string[];
  partial: boolean;
};

type Json = Record<string, unknown>;

class FabricHttpError extends Error {
  constructor(readonly status: number, path: string) {
    super(`GET ${path} -> HTTP ${status}`);
  }
}

function fabricClient(token: string) {
  const get = async (path: string): Promise<Json> => {
    const url = path.startsWith('https://') ? path : `${FABRIC_API}${path}`;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const wait = Number(res.headers.get('Retry-After')) || 2 ** attempt;
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      // Never surface the response body: it can echo request details.
      if (!res.ok) throw new FabricHttpError(res.status, path);
      return (await res.json()) as Json;
    }
  };
  const getPaged = async (path: string): Promise<Json[]> => {
    const out: Json[] = [];
    let next: string | null = path;
    while (next) {
      const body = await get(next);
      out.push(...((body.value as Json[] | undefined) ?? []));
      next = body.continuationToken ? (body.continuationUri as string) : null;
    }
    return out;
  };
  return { get, getPaged };
}

type Fabric = ReturnType<typeof fabricClient>;

async function resolveWorkspaces(
  fabric: Fabric,
  scopeMode: string,
  list: string[],
  warnings: string[],
): Promise<Workspace[]> {
  const toWs = (w: Json): Workspace => ({ id: w.id as string, name: ((w.displayName ?? w.name) as string) ?? null });
  if (scopeMode === 'all') {
    try {
      const admin = await fabric.getPaged('/admin/workspaces');
      if (admin.length) return admin.map(toWs);
    } catch (e) {
      if (!(e instanceof FabricHttpError)) throw e;
      warnings.push('Admin API unavailable for the app identity; scanning only the workspaces it can access.');
    }
  }
  const accessible = (await fabric.getPaged('/workspaces')).map(toWs);
  if (scopeMode === 'all') return accessible;
  const { selected, missing } = selectWorkspaces(accessible, list);
  for (const m of missing) warnings.push(`Workspace not found or not accessible: ${m}`);
  return selected;
}

async function mapPool<T, R>(inputs: T[], fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(inputs.length);
  let next = 0;
  const worker = async () => {
    while (next < inputs.length) {
      const i = next++;
      out[i] = await fn(inputs[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_WORKERS, inputs.length) }, worker));
  return out;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Unexpected error');

udf.func(
  'scanShortcutInventory',
  async (
    ctx: RayfinContext<Record<string, any>, AudienceType.Fabric>,
    scopeMode: string,
    workspaceList: string[],
  ): Promise<ScanResult> => {
    if (scopeMode !== 'all' && scopeMode !== 'list') throw new Error('scopeMode must be "all" or "list".');
    const list = (Array.isArray(workspaceList) ? workspaceList : [])
      .filter((w): w is string => typeof w === 'string')
      .map((w) => w.trim())
      .filter((w) => w.length > 0 && w.length <= 256);
    if (scopeMode === 'list' && list.length === 0) throw new Error('Provide at least one workspace name or ID.');
    if (list.length > MAX_LIST_ENTRIES) throw new Error(`At most ${MAX_LIST_ENTRIES} workspaces per scan.`);

    const started = Date.now();
    const fabric = fabricClient(ctx.Tokens.Fabric);
    const warnings: string[] = [];
    let partial = false;

    const workspaces = await resolveWorkspaces(fabric, scopeMode, list, warnings);

    const itemsPerWs = await mapPool(workspaces, async (ws) => {
      try {
        return (await fabric.getPaged(`/workspaces/${encodeURIComponent(ws.id)}/items`)).map(
          (it): Item => ({
            workspace_id: ws.id,
            workspace_name: ws.name,
            item_id: it.id as string,
            item_name: (it.displayName as string) ?? null,
            item_type: (it.type as string) ?? null,
          }),
        );
      } catch (e) {
        warnings.push(`Could not list items of workspace ${ws.name ?? ws.id}: ${errorText(e)}`);
        return [];
      }
    });
    const items = itemsPerWs.flat();

    const supported = items.filter((it) => it.item_type && SHORTCUT_SUPPORTED_TYPES.has(it.item_type));
    const perItem = await mapPool(supported, async (it): Promise<InventoryRow[]> => {
      if (Date.now() - started > SCAN_DEADLINE_MS) {
        partial = true;
        return [{ ...emptyRow(it), error: 'Skipped: scan deadline reached' }];
      }
      try {
        const path = `/workspaces/${encodeURIComponent(it.workspace_id)}/items/${encodeURIComponent(it.item_id)}/shortcuts`;
        return shortcutRows(it, await fabric.getPaged(path));
      } catch (e) {
        return [{ ...emptyRow(it), error: errorText(e) }];
      }
    });
    if (partial) warnings.push('The scan hit the time limit; some items were skipped. Narrow the workspace list.');

    let rows = detectCycles(flagOrphans(perItem.flat(), items));

    // Names for targets in scope come from the catalog; others need a live lookup.
    const wsNames = new Map<string, string | null>(workspaces.map((w) => [w.id, w.name]));
    const itemNames = new Map<string, string | null>(items.map((i) => [`${i.workspace_id}/${i.item_id}`, i.item_name]));
    const oneLake = rows.filter((r) => r.target_type === 'OneLake' && r.target_workspace_id);
    const missingWs = [...new Set(oneLake.map((r) => r.target_workspace_id!))].filter((id) => !wsNames.has(id));
    const missingItems = [
      ...new Set(oneLake.filter((r) => r.target_item_id).map((r) => `${r.target_workspace_id}/${r.target_item_id}`)),
    ].filter((k) => !itemNames.has(k));
    await mapPool(missingWs, async (id) => {
      const body = await fabric.get(`/workspaces/${encodeURIComponent(id)}`).catch(() => null);
      wsNames.set(id, (body?.displayName as string) ?? null);
    });
    await mapPool(missingItems, async (key) => {
      const [wsId, itId] = key.split('/');
      const body = await fabric
        .get(`/workspaces/${encodeURIComponent(wsId)}/items/${encodeURIComponent(itId)}`)
        .catch(() => null);
      itemNames.set(key, (body?.displayName as string) ?? null);
    });
    rows = resolveTargetNames(rows, wsNames, itemNames);

    const scanTimestamp = new Date().toISOString();
    return {
      scanTimestamp,
      workspaceCount: workspaces.length,
      itemCount: items.length,
      rows: rows.map((r) => ({ ...r, scan_timestamp: scanTimestamp })),
      warnings,
      partial,
    };
  },
  [],
);
