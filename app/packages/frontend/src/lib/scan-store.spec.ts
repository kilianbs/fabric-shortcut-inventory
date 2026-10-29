import { describe, expect, it } from 'vitest';

import { loadLatestScan, saveScan } from '@/lib/scan-store';
import type { SavedScan, ScanData } from '@/lib/scan-store';
import type { InventoryRow } from '@/lib/shortcut-view';

type Row = Record<string, unknown> & { id: string };
type Filter = Record<string, { eq: unknown }>;

/** In-memory stand-in for `client.data`, covering the calls the store makes. */
function fakeData(options: { failRowAt?: number } = {}) {
  const tables: Record<string, Row[]> = { ScanRun: [], ShortcutRecord: [] };
  let nextId = 0;
  let rowCreates = 0;

  const entity = (name: string) => {
    const query = (state: { where: Filter; order?: [string, string]; first?: number; after?: string }) => {
      const run = () => {
        let rows = tables[name].filter((r) =>
          Object.entries(state.where).every(([k, v]) => r[k] === v.eq)
        );
        if (state.order) {
          const [key, dir] = state.order;
          rows = [...rows].sort((a, b) => {
            const av = a[key] as number | string | Date;
            const bv = b[key] as number | string | Date;
            return (av < bv ? -1 : av > bv ? 1 : 0) * (dir === 'desc' ? -1 : 1);
          });
        }
        const start = state.after ? Number(state.after) : 0;
        const size = state.first ?? 100;
        const items = rows.slice(start, start + size);
        return { items, hasNextPage: start + size < rows.length, endCursor: String(start + size) };
      };
      const builder = {
        where: (w: Filter) => query({ ...state, where: { ...state.where, ...w } }),
        orderBy: (o: Record<string, string>) => query({ ...state, order: Object.entries(o)[0] as [string, string] }),
        first: (n: number) => query({ ...state, first: n }),
        after: (c: string) => query({ ...state, after: c }),
        execute: async () => run().items,
        executePaginated: async () => run(),
      };
      return builder;
    };
    return {
      select: () => query({ where: {} }),
      create: async (values: Record<string, unknown>) => {
        if (name === 'ShortcutRecord' && rowCreates++ === options.failRowAt) throw new Error('HTTP 500');
        const row = { id: `id-${nextId++}`, ...values } as Row;
        tables[name].push(row);
        return row;
      },
      update: async (where: { id: string }, values: Record<string, unknown>) => {
        const row = tables[name].find((r) => r.id === where.id);
        if (row) Object.assign(row, values);
        return row;
      },
    };
  };

  const data = { ScanRun: entity('ScanRun'), ShortcutRecord: entity('ShortcutRecord') };
  return { data: data as unknown as ScanData, tables };
}

function row(overrides: Partial<InventoryRow> = {}): InventoryRow {
  return {
    workspace_id: 'ws1',
    workspace_name: 'DataGym',
    item_id: 'it1',
    item_name: 'lh_bronze',
    item_type: 'Lakehouse',
    target_type: 'OneLake',
    target_workspace_id: 'ws1',
    target_item_id: 'it2',
    target_subpath: 'Tables/orders',
    target_location: null,
    is_external: false,
    scan_timestamp: '2026-10-26T20:00:00.000Z',
    shortcut_name: 'orders',
    shortcut_path: 'Tables',
    target_workspace_name: 'DataGym',
    target_item_name: 'lh_silver',
    target_location_display: 'onelake://DataGym/lh_silver/Tables/orders',
    is_orphan: false,
    orphan_reason: null,
    is_circular: false,
    circular_path: null,
    item_sensitivity_label: null,
    item_endorsement: null,
    governance_flag: null,
    error: null,
    ...overrides,
  };
}

function scan(rows: InventoryRow[], scannedAt = '2026-10-26T20:00:00.000Z'): SavedScan {
  return {
    result: {
      scanTimestamp: scannedAt,
      workspaceCount: 1,
      itemCount: 2,
      rows: rows.map((r) => ({ ...r, scan_timestamp: scannedAt })),
      warnings: ['Workspace not found or not accessible: Old'],
      partial: false,
    },
    scope: { mode: 'list', workspaces: ['DataGym', 'Old'] },
  };
}

describe('scan store', () => {
  it('returns null when nothing was saved yet', async () => {
    const { data } = fakeData();
    expect(await loadLatestScan(data)).toBeNull();
  });

  it('loads back exactly what was saved, rows in scan order', async () => {
    const { data } = fakeData();
    const saved = scan([row({ shortcut_name: 'b' }), row({ shortcut_name: 'a', is_orphan: true })]);

    await saveScan(data, saved);

    expect(await loadLatestScan(data)).toEqual(saved);
  });

  it('opens the most recent scan', async () => {
    const { data } = fakeData();
    await saveScan(data, scan([row({ shortcut_name: 'old' })], '2026-10-01T08:00:00.000Z'));
    const latest = scan([row({ shortcut_name: 'new' })], '2026-10-28T08:00:00.000Z');
    await saveScan(data, latest);

    expect(await loadLatestScan(data)).toEqual(latest);
  });

  it('never opens a scan whose save was interrupted', async () => {
    const { data, tables } = fakeData({ failRowAt: 2 });
    const first = scan([row({ shortcut_name: 'kept' })], '2026-10-01T08:00:00.000Z');
    await saveScan(data, first);

    const broken = scan([row(), row(), row()], '2026-10-28T08:00:00.000Z');
    await expect(saveScan(data, broken)).rejects.toThrow('HTTP 500');

    expect(tables.ScanRun).toHaveLength(2);
    expect(await loadLatestScan(data)).toEqual(first);
  });

  it('reads rows across several pages', async () => {
    const { data } = fakeData();
    const many = scan(Array.from({ length: 2_350 }, (_, i) => row({ shortcut_name: `s${i}` })));

    await saveScan(data, many);

    const loaded = await loadLatestScan(data);
    expect(loaded?.result.rows).toHaveLength(2_350);
    expect(loaded?.result.rows[2_349].shortcut_name).toBe('s2349');
  });

  it('reports save progress row by row', async () => {
    const { data } = fakeData();
    const progress: number[] = [];

    await saveScan(data, scan([row(), row(), row()]), (done) => progress.push(done));

    expect(progress.sort()).toEqual([1, 2, 3]);
  });

  it('cuts values to the column limits instead of failing the save', async () => {
    const { data, tables } = fakeData();

    await saveScan(data, scan([row({ circular_path: 'x'.repeat(5_000) })]));

    expect((tables.ShortcutRecord[0].circular_path as string).length).toBe(2_000);
  });
});
