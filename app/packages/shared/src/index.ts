/**
 * Browser-safe contracts shared by the data registration package and frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * `@rayfin-app/data`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 */
export interface ScanRunRecord {
  id: string;
  scannedAt: Date;
  scopeMode: 'all' | 'list';
  scopeWorkspaces?: string | null;
  workspaceCount: number;
  itemCount: number;
  rowCount: number;
  partial: boolean;
  warnings?: string | null;
  complete: boolean;
}

export interface ShortcutRecordRecord {
  id: string;
  scan_id: string;
  scan?: ScanRunRecord;
  position: number;
  workspace_id: string;
  workspace_name?: string | null;
  item_id: string;
  item_name?: string | null;
  item_type?: string | null;
  target_type?: string | null;
  target_workspace_id?: string | null;
  target_item_id?: string | null;
  target_subpath?: string | null;
  target_location?: string | null;
  is_external?: boolean | null;
  shortcut_name?: string | null;
  shortcut_path?: string | null;
  target_workspace_name?: string | null;
  target_item_name?: string | null;
  target_location_display?: string | null;
  is_orphan?: boolean | null;
  orphan_reason?: string | null;
  is_circular?: boolean | null;
  circular_path?: string | null;
  item_sensitivity_label?: string | null;
  item_endorsement?: string | null;
  governance_flag?: boolean | null;
  error?: string | null;
}

export type UniversalAppSchema = {
  ScanRun: ScanRunRecord;
  ShortcutRecord: ShortcutRecordRecord;
};
