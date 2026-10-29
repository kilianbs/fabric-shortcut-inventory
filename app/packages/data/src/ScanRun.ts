import { authenticated, boolean, date, entity, int, set, text, uuid } from '@microsoft/rayfin-core';

/**
 * One saved scan. Its shortcuts are `ShortcutRecord` rows pointing here.
 *
 * Shared by every signed-in user: the scan runs as the app identity, so all
 * users would see the same result anyway. There is no delete grant, so the
 * history is kept.
 *
 * `complete` stays false until every row has been saved; the app only opens
 * complete runs, so a save interrupted halfway is never shown.
 */
@entity()
@authenticated(['read', 'create', 'update'])
export class ScanRun {
  @uuid() id!: string;
  @date() scannedAt!: Date;
  @set('all', 'list') scopeMode!: 'all' | 'list';
  /** Workspace names or IDs of a `list` scope, one per line. */
  @text({ optional: true, max: 4000 }) scopeWorkspaces?: string;
  @int() workspaceCount!: number;
  @int() itemCount!: number;
  @int() rowCount!: number;
  @boolean() partial!: boolean;
  /** Scan warnings, one per line. */
  @text({ optional: true, max: 4000 }) warnings?: string;
  @boolean({ default: false }) complete!: boolean;
}
