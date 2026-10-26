import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  detectCycles,
  flagOrphans,
  parseShortcutTarget,
  resolveTargetNames,
  selectWorkspaces,
  shortcutRows,
  type Item,
} from '../src/inventory.ts';

const item = (ws: string, id: string): Item => ({
  workspace_id: ws,
  workspace_name: `name-${ws}`,
  item_id: id,
  item_name: `name-${id}`,
  item_type: 'Lakehouse',
});

const oneLake = (name: string, ws: string, id: string) => ({
  name,
  path: 'Tables',
  target: { type: 'OneLake', oneLake: { workspaceId: ws, itemId: id, path: 'Tables/t' } },
});

test('parses OneLake targets', () => {
  assert.deepEqual(
    parseShortcutTarget({ type: 'OneLake', oneLake: { workspaceId: 'w', itemId: 'i', path: 'Files/x' } }),
    {
      target_type: 'OneLake',
      target_workspace_id: 'w',
      target_item_id: 'i',
      target_subpath: 'Files/x',
      target_location: 'onelake://w/i/Files/x',
      is_external: false,
    },
  );
});

test('parses external targets and flags them as external', () => {
  const t = parseShortcutTarget({ type: 'AdlsGen2', adlsGen2: { location: 'https://acc.dfs.core.windows.net', subpath: '/c/d' } });
  assert.equal(t.target_location, 'https://acc.dfs.core.windows.net/c/d');
  assert.equal(t.is_external, true);
  assert.equal(parseShortcutTarget({ type: 'Unknown' }).is_external, false);
});

test('flags OneLake shortcuts whose target is not in scope as orphans', () => {
  const rows = shortcutRows(item('w1', 'a'), [oneLake('ok', 'w1', 'b'), oneLake('gone', 'w1', 'zzz')]);
  const [ok, gone] = flagOrphans(rows, [item('w1', 'a'), item('w1', 'b')]);
  assert.equal(ok.is_orphan, false);
  assert.equal(gone.is_orphan, true);
  assert.match(gone.orphan_reason ?? '', /zzz/);
});

test('marks only edges that are part of a cycle as circular', () => {
  const rows = [
    ...shortcutRows(item('w', 'a'), [oneLake('a->b', 'w', 'b')]),
    ...shortcutRows(item('w', 'b'), [oneLake('b->a', 'w', 'a'), oneLake('b->c', 'w', 'c')]),
  ];
  const byName = Object.fromEntries(detectCycles(rows).map((r) => [r.shortcut_name, r]));
  assert.equal(byName['a->b'].is_circular, true);
  assert.equal(byName['b->a'].is_circular, true);
  assert.equal(byName['b->a'].circular_path, 'w/b -> w/a');
  assert.equal(byName['b->c'].is_circular, false);
});

test('resolves target names and falls back to ids', () => {
  const rows = shortcutRows(item('w', 'a'), [oneLake('x', 'w', 'b'), oneLake('y', 'other', 'q')]);
  const [x, y] = resolveTargetNames(rows, new Map([['w', 'Sales']]), new Map([['w/b', 'LH']]));
  assert.equal(x.target_location_display, 'onelake://Sales/LH/Tables/t');
  assert.equal(y.target_location_display, 'onelake://other/q/Tables/t');
});

test('selects workspaces by id or name and reports missing ones', () => {
  const all = [{ id: '1', name: 'Sales' }, { id: '2', name: 'HR' }];
  assert.deepEqual(selectWorkspaces(all, ['2', 'Sales', 'Nope']), {
    selected: [all[1], all[0]],
    missing: ['Nope'],
  });
});
