import type { AppFunctionsSchema } from '@rayfin-app/functions/types';

export type ScanResult = AppFunctionsSchema['scanShortcutInventory']['output'];
export type InventoryRow = ScanResult['rows'][number];

/** One shortcut, with display names already resolved (ids as fallback). */
export interface ShortcutRow {
  id: string;
  name: string;
  path: string;
  workspaceId: string;
  workspaceName: string;
  itemId: string;
  itemName: string;
  itemType: string;
  targetType: string;
  targetWorkspaceId: string | null;
  targetWorkspaceName: string;
  targetItemId: string | null;
  targetItemName: string;
  targetSubpath: string;
  targetLocation: string;
  isExternal: boolean;
  isOrphan: boolean;
  orphanReason: string;
  isCircular: boolean;
  circularPath: string;
}

export interface ItemError {
  itemName: string;
  workspaceName: string;
  error: string;
}

export interface InventoryTotals {
  workspaces: number;
  items: number;
  shortcuts: number;
  external: number;
  orphans: number;
  circular: number;
  errors: number;
}

export interface ShortcutFilters {
  query: string;
  workspace: string;
  targetType: string;
}

export const DEFAULT_FILTERS: ShortcutFilters = {
  query: '',
  workspace: '',
  targetType: '',
};

/** Rows of the scan that describe a shortcut; item-level error rows are left out. */
export function toShortcutRows(rows: readonly InventoryRow[]): ShortcutRow[] {
  return rows
    .filter((r) => r.shortcut_name)
    .map((r, index) => ({
      id: `${r.item_id}|${r.shortcut_path ?? ''}|${r.shortcut_name}|${index}`,
      name: r.shortcut_name ?? '',
      path: r.shortcut_path ?? '',
      workspaceId: r.workspace_id,
      workspaceName: r.workspace_name || r.workspace_id,
      itemId: r.item_id,
      itemName: r.item_name || r.item_id,
      itemType: r.item_type ?? '',
      targetType: r.target_type || 'Desconocido',
      targetWorkspaceId: r.target_workspace_id,
      targetWorkspaceName: r.target_workspace_name || r.target_workspace_id || '',
      targetItemId: r.target_item_id,
      targetItemName: r.target_item_name || r.target_item_id || '',
      targetSubpath: r.target_subpath ?? '',
      targetLocation: r.target_location_display || r.target_location || '',
      isExternal: r.is_external === true,
      isOrphan: r.is_orphan === true,
      orphanReason: r.orphan_reason ?? '',
      isCircular: r.is_circular === true,
      circularPath: r.circular_path ?? '',
    }));
}

/** Items whose shortcuts could not be listed (permissions, throttling, deadline). */
export function itemErrors(rows: readonly InventoryRow[]): ItemError[] {
  return rows
    .filter((r) => !r.shortcut_name && r.error)
    .map((r) => ({
      itemName: r.item_name || r.item_id,
      workspaceName: r.workspace_name || r.workspace_id,
      error: r.error ?? '',
    }));
}

export function computeTotals(result: ScanResult): InventoryTotals {
  const shortcuts = toShortcutRows(result.rows);
  return {
    workspaces: result.workspaceCount,
    items: result.itemCount,
    shortcuts: shortcuts.length,
    external: shortcuts.filter((s) => s.isExternal).length,
    orphans: shortcuts.filter((s) => s.isOrphan).length,
    circular: shortcuts.filter((s) => s.isCircular).length,
    errors: itemErrors(result.rows).length,
  };
}

export function filterShortcuts(
  rows: readonly ShortcutRow[],
  filters: ShortcutFilters
): ShortcutRow[] {
  const needle = filters.query.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (filters.workspace === '' || r.workspaceName === filters.workspace) &&
      (filters.targetType === '' || r.targetType === filters.targetType) &&
      (needle === '' ||
        [r.name, r.path, r.itemName, r.workspaceName, r.targetLocation].some((v) =>
          v.toLowerCase().includes(needle)
        ))
  );
}

export function isDefaultFilters(filters: ShortcutFilters): boolean {
  return (
    filters.query.trim() === '' && filters.workspace === '' && filters.targetType === ''
  );
}

/** Option counts for a filter menu: most frequent first, then by name. */
export function countBy(
  rows: readonly ShortcutRow[],
  key: 'workspaceName' | 'targetType'
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r[key], (counts.get(r[key]) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
