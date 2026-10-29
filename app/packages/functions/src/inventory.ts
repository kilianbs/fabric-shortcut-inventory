// Pure inventory logic ported from shortcut_inventory.ipynb. No imports, so
// `node --test` can load it directly with type stripping.

export type Workspace = { id: string; name: string | null };

export type Item = {
  workspace_id: string;
  workspace_name: string | null;
  item_id: string;
  item_name: string | null;
  item_type: string | null;
};

export type ShortcutTarget = {
  target_type: string | null;
  target_workspace_id: string | null;
  target_item_id: string | null;
  target_subpath: string | null;
  target_location: string | null;
  is_external: boolean | null;
};

export type InventoryRow = Item &
  ShortcutTarget & {
    scan_timestamp: string | null;
    shortcut_name: string | null;
    shortcut_path: string | null;
    target_workspace_name: string | null;
    target_item_name: string | null;
    target_location_display: string | null;
    is_orphan: boolean | null;
    orphan_reason: string | null;
    is_circular: boolean | null;
    circular_path: string | null;
    item_sensitivity_label: string | null;
    item_endorsement: string | null;
    governance_flag: boolean | null;
    error: string | null;
  };

// Only these Fabric item types expose the /shortcuts REST endpoint.
export const SHORTCUT_SUPPORTED_TYPES = new Set(['Lakehouse', 'KQLDatabase', 'MirroredDatabase']);

const EXTERNAL_TYPES = new Set([
  'AmazonS3',
  'AdlsGen2',
  'GoogleCloudStorage',
  'S3Compatible',
  'Dataverse',
  'AzureBlobStorage',
  'OneDriveSharePoint',
]);

// target_type -> key in the API target object holding its details
const DETAIL_KEY: Record<string, string> = {
  OneLake: 'oneLake',
  AmazonS3: 'amazonS3',
  AdlsGen2: 'adlsGen2',
  GoogleCloudStorage: 'googleCloudStorage',
  S3Compatible: 's3Compatible',
  Dataverse: 'dataverse',
  AzureBlobStorage: 'azureBlobStorage',
  OneDriveSharePoint: 'oneDriveSharePoint',
};

type Json = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function parseShortcutTarget(target: Json): ShortcutTarget {
  const ttype = str(target.type);
  const detail = ((ttype && target[DETAIL_KEY[ttype] ?? '']) || {}) as Json;
  if (ttype === 'OneLake') {
    const path = str(detail.path) ?? '';
    const wsid = str(detail.workspaceId);
    const itid = str(detail.itemId);
    return {
      target_type: 'OneLake',
      target_workspace_id: wsid,
      target_item_id: itid,
      target_subpath: path,
      target_location: `onelake://${wsid}/${itid}/${path}`,
      is_external: false,
    };
  }
  const location = str(detail.location) ?? '';
  const subpath = str(detail.subpath) ?? '';
  return {
    target_type: ttype,
    target_workspace_id: null,
    target_item_id: null,
    target_subpath: subpath,
    target_location: `${location}${subpath}`,
    is_external: ttype !== null && EXTERNAL_TYPES.has(ttype),
  };
}

export function emptyRow(item: Item): InventoryRow {
  return {
    ...item,
    scan_timestamp: null,
    shortcut_name: null,
    shortcut_path: null,
    target_type: null,
    target_workspace_id: null,
    target_workspace_name: null,
    target_item_id: null,
    target_item_name: null,
    target_subpath: null,
    target_location: null,
    target_location_display: null,
    is_external: null,
    is_orphan: null,
    orphan_reason: null,
    is_circular: null,
    circular_path: null,
    item_sensitivity_label: null,
    item_endorsement: null,
    governance_flag: null,
    error: null,
  };
}

export function shortcutRows(item: Item, shortcuts: Json[]): InventoryRow[] {
  return shortcuts.map((sc) => ({
    ...emptyRow(item),
    shortcut_name: str(sc.name),
    shortcut_path: str(sc.path),
    ...parseShortcutTarget((sc.target ?? {}) as Json),
  }));
}

export function flagOrphans(rows: InventoryRow[], items: Item[]): InventoryRow[] {
  const known = new Set(items.map((it) => `${it.workspace_id}/${it.item_id}`));
  return rows.map((r) => {
    if (r.target_type !== 'OneLake') return { ...r, is_orphan: false, orphan_reason: null };
    const found = known.has(`${r.target_workspace_id}/${r.target_item_id}`);
    return {
      ...r,
      is_orphan: !found,
      orphan_reason: found
        ? null
        : `OneLake target item ${r.target_item_id} in workspace ${r.target_workspace_id} not found in scanned scope`,
    };
  });
}

const isOneLakeEdge = (r: InventoryRow) => r.target_type === 'OneLake' && !!r.target_item_id;
const srcNode = (r: InventoryRow) => `${r.workspace_id}/${r.item_id}`;
const dstNode = (r: InventoryRow) => `${r.target_workspace_id}/${r.target_item_id}`;

export function detectCycles(rows: InventoryRow[]): InventoryRow[] {
  const edges = new Map<string, Set<string>>();
  for (const r of rows.filter(isOneLakeEdge)) {
    const s = srcNode(r);
    if (!edges.has(s)) edges.set(s, new Set());
    edges.get(s)!.add(dstNode(r));
  }
  // DFS with colouring: an edge back to an in-progress node closes a cycle.
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const cyclic = new Set<string>();
  const dfs = (u: string, path: string[]) => {
    color.set(u, GRAY);
    path.push(u);
    for (const v of edges.get(u) ?? []) {
      if (color.get(v) === GRAY) {
        const cycle = [...path.slice(path.indexOf(v)), v];
        for (let i = 0; i < cycle.length - 1; i++) cyclic.add(`${cycle[i]} -> ${cycle[i + 1]}`);
      } else if (!color.has(v)) {
        dfs(v, path);
      }
    }
    path.pop();
    color.set(u, BLACK);
  };
  for (const n of edges.keys()) if (!color.has(n)) dfs(n, []);

  return rows.map((r) => {
    const edge = isOneLakeEdge(r) ? `${srcNode(r)} -> ${dstNode(r)}` : null;
    const circular = edge !== null && cyclic.has(edge);
    return { ...r, is_circular: circular, circular_path: circular ? edge : null };
  });
}

/** Resolves OneLake target names; item keys are `${workspaceId}/${itemId}`. */
export function resolveTargetNames(
  rows: InventoryRow[],
  workspaceNames: Map<string, string | null>,
  itemNames: Map<string, string | null>,
): InventoryRow[] {
  return rows.map((r) => {
    if (r.target_type !== 'OneLake') {
      return { ...r, target_workspace_name: null, target_item_name: null, target_location_display: r.target_location };
    }
    const wsid = r.target_workspace_id;
    const itid = r.target_item_id;
    const wsName = (wsid && workspaceNames.get(wsid)) || null;
    const itName = (wsid && itid && itemNames.get(`${wsid}/${itid}`)) || null;
    return {
      ...r,
      target_workspace_name: wsName,
      target_item_name: itName,
      target_location_display: `onelake://${wsName ?? wsid ?? '?'}/${itName ?? itid ?? '?'}/${r.target_subpath ?? ''}`,
    };
  });
}

/** Picks the workspaces to scan from a "list" scope, matching by ID or display name. */
export function selectWorkspaces(
  all: Workspace[],
  entries: string[],
): { selected: Workspace[]; missing: string[] } {
  const selected: Workspace[] = [];
  const missing: string[] = [];
  for (const entry of entries) {
    const ws = all.find((w) => w.id === entry) ?? all.find((w) => w.name === entry);
    if (ws) selected.push(ws);
    else missing.push(entry);
  }
  return { selected, missing };
}
