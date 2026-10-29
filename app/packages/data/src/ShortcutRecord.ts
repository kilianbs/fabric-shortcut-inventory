import { authenticated, boolean, entity, int, one, text, uuid } from '@microsoft/rayfin-core';

import { ScanRun } from './ScanRun.js';

/**
 * One inventory row of a saved scan, with the same columns as the notebook
 * output (the scan timestamp lives on the `ScanRun`).
 *
 * Every `@text` has a `max`: without one MSSQL gets NVARCHAR(MAX), which can
 * break the generated GraphQL schema. The app truncates values to these
 * limits before saving.
 */
@entity()
@authenticated(['read', 'create'])
export class ShortcutRecord {
  @uuid() id!: string;
  @uuid() scan_id!: string;
  @one(() => ScanRun) scan!: ScanRun;
  /** Row order within the scan, so a reload shows the rows as scanned. */
  @int() position!: number;
  @text({ max: 64 }) workspace_id!: string;
  @text({ optional: true, max: 256 }) workspace_name?: string;
  @text({ max: 64 }) item_id!: string;
  @text({ optional: true, max: 256 }) item_name?: string;
  @text({ optional: true, max: 64 }) item_type?: string;
  @text({ optional: true, max: 64 }) target_type?: string;
  @text({ optional: true, max: 64 }) target_workspace_id?: string;
  @text({ optional: true, max: 64 }) target_item_id?: string;
  @text({ optional: true, max: 1000 }) target_subpath?: string;
  @text({ optional: true, max: 2000 }) target_location?: string;
  @boolean({ optional: true }) is_external?: boolean;
  @text({ optional: true, max: 256 }) shortcut_name?: string;
  @text({ optional: true, max: 1000 }) shortcut_path?: string;
  @text({ optional: true, max: 256 }) target_workspace_name?: string;
  @text({ optional: true, max: 256 }) target_item_name?: string;
  @text({ optional: true, max: 2000 }) target_location_display?: string;
  @boolean({ optional: true }) is_orphan?: boolean;
  @text({ optional: true, max: 500 }) orphan_reason?: string;
  @boolean({ optional: true }) is_circular?: boolean;
  @text({ optional: true, max: 2000 }) circular_path?: string;
  @text({ optional: true, max: 256 }) item_sensitivity_label?: string;
  @text({ optional: true, max: 64 }) item_endorsement?: string;
  @boolean({ optional: true }) governance_flag?: boolean;
  @text({ optional: true, max: 1000 }) error?: string;
}
