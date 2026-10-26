import { describe, expect, it } from 'vitest';

import {
  computeTotals,
  countBy,
  DEFAULT_FILTERS,
  filterShortcuts,
  isDefaultFilters,
  itemErrors,
  toShortcutRows,
} from '@/lib/shortcut-view';
import type { InventoryRow, ScanResult } from '@/lib/shortcut-view';

function row(overrides: Partial<InventoryRow>): InventoryRow {
  return {
    workspace_id: 'w1',
    workspace_name: 'Sales',
    item_id: 'i1',
    item_name: 'lh_sales',
    item_type: 'Lakehouse',
    target_type: 'OneLake',
    target_workspace_id: 'w2',
    target_item_id: 'i2',
    target_subpath: 'Tables/orders',
    target_location: 'onelake://w2/i2/Tables/orders',
    is_external: false,
    scan_timestamp: '2026-10-26T20:00:00Z',
    shortcut_name: 'orders',
    shortcut_path: 'Tables',
    target_workspace_name: 'Core',
    target_item_name: 'lh_core',
    target_location_display: 'onelake://Core/lh_core/Tables/orders',
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

const rows: InventoryRow[] = [
  row({}),
  row({
    shortcut_name: 'events',
    target_type: 'AmazonS3',
    is_external: true,
    target_workspace_id: null,
    target_item_id: null,
    target_location_display: 's3://bucket/events',
  }),
  row({
    workspace_id: 'w3',
    workspace_name: 'Finance',
    item_id: 'i3',
    item_name: 'lh_fin',
    shortcut_name: 'ghost',
    is_orphan: true,
    orphan_reason: 'Target item not found',
  }),
  row({ item_id: 'i4', item_name: 'lh_loop', shortcut_name: 'loop', is_circular: true, circular_path: 'w1/i4 -> w1/i1' }),
  // Item whose shortcuts could not be read: an error row without a shortcut.
  row({
    item_id: 'i5',
    item_name: 'lh_denied',
    shortcut_name: null,
    shortcut_path: null,
    target_type: null,
    error: 'HTTP 403',
  }),
];

const result: ScanResult = {
  scanTimestamp: '2026-10-26T20:00:00Z',
  workspaceCount: 3,
  itemCount: 7,
  rows,
  warnings: [],
  partial: false,
};

describe('toShortcutRows', () => {
  it('keeps only rows that describe a shortcut, with unique ids', () => {
    const shortcuts = toShortcutRows(rows);
    expect(shortcuts.map((s) => s.name)).toEqual(['orders', 'events', 'ghost', 'loop']);
    expect(new Set(shortcuts.map((s) => s.id)).size).toBe(4);
  });

  it('falls back to ids when names are missing', () => {
    const [shortcut] = toShortcutRows([
      row({ workspace_name: null, item_name: null, target_item_name: null }),
    ]);
    expect(shortcut.workspaceName).toBe('w1');
    expect(shortcut.itemName).toBe('i1');
    expect(shortcut.targetItemName).toBe('i2');
  });
});

describe('itemErrors', () => {
  it('lists items whose shortcuts could not be read', () => {
    expect(itemErrors(rows)).toEqual([
      { itemName: 'lh_denied', workspaceName: 'Sales', error: 'HTTP 403' },
    ]);
  });
});

describe('computeTotals', () => {
  it('counts shortcuts, external, orphan, circular and item errors', () => {
    expect(computeTotals(result)).toEqual({
      workspaces: 3,
      items: 7,
      shortcuts: 4,
      external: 1,
      orphans: 1,
      circular: 1,
      errors: 1,
    });
  });
});

describe('filterShortcuts', () => {
  const shortcuts = toShortcutRows(rows);

  it('returns everything with the default filters', () => {
    expect(filterShortcuts(shortcuts, DEFAULT_FILTERS)).toHaveLength(4);
    expect(isDefaultFilters(DEFAULT_FILTERS)).toBe(true);
  });

  it('searches name, item, workspace and target, ignoring case', () => {
    const byTarget = filterShortcuts(shortcuts, { ...DEFAULT_FILTERS, query: 'S3://BUCKET' });
    expect(byTarget.map((s) => s.name)).toEqual(['events']);
    const byItem = filterShortcuts(shortcuts, { ...DEFAULT_FILTERS, query: 'lh_fin' });
    expect(byItem.map((s) => s.name)).toEqual(['ghost']);
  });

  it('combines workspace and target type filters', () => {
    const filters = { ...DEFAULT_FILTERS, workspace: 'Sales', targetType: 'OneLake' };
    expect(filterShortcuts(shortcuts, filters).map((s) => s.name)).toEqual(['orders', 'loop']);
    expect(isDefaultFilters(filters)).toBe(false);
  });
});

describe('countBy', () => {
  it('counts values, most frequent first, then by name', () => {
    expect(countBy(toShortcutRows(rows), 'workspaceName')).toEqual([
      { value: 'Sales', count: 3 },
      { value: 'Finance', count: 1 },
    ]);
  });
});
