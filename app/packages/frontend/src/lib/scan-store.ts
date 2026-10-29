import type { ScopeMode } from '@/components/home.component';
import type { getRayfinClient } from '@/lib/rayfin-client';
import type { InventoryRow, ScanResult } from '@/lib/shortcut-view';
import type { ShortcutRecordRecord } from '@rayfin-app/shared';

export type ScanData = Awaited<ReturnType<typeof getRayfinClient>>['data'];

export interface SavedScope {
  mode: ScopeMode;
  workspaces: string[];
}

export interface SavedScan {
  result: ScanResult;
  scope: SavedScope;
}

// The client has no bulk create, so rows are saved one request each.
const SAVE_CONCURRENCY = 8;
const PAGE_SIZE = 1_000;
const LINES_MAX = 4_000;

// Same limits as the `@text({ max })` decorators in @rayfin-app/data.
const TEXT_MAX = {
  workspace_id: 64,
  workspace_name: 256,
  item_id: 64,
  item_name: 256,
  item_type: 64,
  target_type: 64,
  target_workspace_id: 64,
  target_item_id: 64,
  target_subpath: 1_000,
  target_location: 2_000,
  shortcut_name: 256,
  shortcut_path: 1_000,
  target_workspace_name: 256,
  target_item_name: 256,
  target_location_display: 2_000,
  orphan_reason: 500,
  circular_path: 2_000,
  item_sensitivity_label: 256,
  item_endorsement: 64,
  error: 1_000,
} as const;

const BOOLEAN_FIELDS = ['is_external', 'is_orphan', 'is_circular', 'governance_flag'] as const;

const RUN_FIELDS = [
  'id',
  'scannedAt',
  'scopeMode',
  'scopeWorkspaces',
  'workspaceCount',
  'itemCount',
  'rowCount',
  'partial',
  'warnings',
] as const;

const ROW_FIELDS = [...(Object.keys(TEXT_MAX) as (keyof typeof TEXT_MAX)[]), ...BOOLEAN_FIELDS];

const clip = (value: string | null, max: number) => (value === null ? null : value.slice(0, max));
const joinLines = (lines: string[]) => (lines.length ? lines.join('\n').slice(0, LINES_MAX) : null);
const splitLines = (text: string | null | undefined) => (text ? text.split('\n') : []);

function toRecord(row: InventoryRow, scanId: string, position: number): Omit<ShortcutRecordRecord, 'id'> {
  const record: Record<string, unknown> = { scan_id: scanId, position };
  for (const [key, max] of Object.entries(TEXT_MAX)) {
    record[key] = clip(row[key as keyof typeof TEXT_MAX], max);
  }
  for (const key of BOOLEAN_FIELDS) record[key] = row[key];
  return record as Omit<ShortcutRecordRecord, 'id'>;
}

function fromRecord(record: Partial<ShortcutRecordRecord>, scanTimestamp: string): InventoryRow {
  const row: Record<string, unknown> = { scan_timestamp: scanTimestamp };
  for (const key of ROW_FIELDS) row[key] = record[key] ?? null;
  return row as InventoryRow;
}

async function forEachPooled<T>(inputs: T[], fn: (x: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < inputs.length) {
      const i = next++;
      await fn(inputs[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(SAVE_CONCURRENCY, inputs.length) }, worker));
}

/**
 * Saves a scan and its rows. The run is marked complete only after every row
 * is stored, so a failed or interrupted save never becomes the latest scan.
 */
export async function saveScan(
  data: ScanData,
  { result, scope }: SavedScan,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const run = await data.ScanRun.create({
    scannedAt: new Date(result.scanTimestamp),
    scopeMode: scope.mode,
    scopeWorkspaces: joinLines(scope.mode === 'list' ? scope.workspaces : []),
    workspaceCount: result.workspaceCount,
    itemCount: result.itemCount,
    rowCount: result.rows.length,
    partial: result.partial,
    warnings: joinLines(result.warnings),
    complete: false,
  });
  let done = 0;
  await forEachPooled(result.rows, async (row, i) => {
    await data.ShortcutRecord.create(toRecord(row, run.id, i));
    onProgress?.(++done, result.rows.length);
  });
  await data.ScanRun.update({ id: run.id }, { complete: true });
}

/** The most recent completely saved scan, or null when there is none. */
export async function loadLatestScan(data: ScanData): Promise<SavedScan | null> {
  const [run] = await data.ScanRun.select([...RUN_FIELDS])
    .where({ complete: { eq: true } })
    .orderBy({ scannedAt: 'desc' })
    .first(1)
    .execute();
  if (!run) return null;

  const scanTimestamp = new Date(run.scannedAt).toISOString();
  const rows: InventoryRow[] = [];
  let cursor: string | undefined;
  for (;;) {
    let query = data.ShortcutRecord.select([...ROW_FIELDS])
      .where({ scan_id: { eq: run.id } })
      .orderBy({ position: 'asc' })
      .first(PAGE_SIZE);
    if (cursor) query = query.after(cursor);
    const page = await query.executePaginated();
    rows.push(...page.items.map((r) => fromRecord(r, scanTimestamp)));
    if (!page.hasNextPage || !page.endCursor) break;
    cursor = page.endCursor;
  }

  return {
    result: {
      scanTimestamp,
      workspaceCount: run.workspaceCount,
      itemCount: run.itemCount,
      rows,
      warnings: splitLines(run.warnings),
      partial: run.partial,
    },
    scope: { mode: run.scopeMode, workspaces: splitLines(run.scopeWorkspaces) },
  };
}
