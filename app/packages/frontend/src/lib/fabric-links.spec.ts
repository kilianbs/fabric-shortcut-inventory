import { describe, expect, it } from 'vitest';

import { fabricLinks } from '@/lib/fabric-links';

const WS = '3adb0ff0-0f5a-40ab-830b-ce1fc6e4882c';
const ITEM = '27dd506d-2d8d-4fd0-a77e-d345520f0c00';

describe('fabricLinks', () => {
  it('links a lakehouse to its own page and its workspace', () => {
    expect(fabricLinks({ workspaceId: WS, itemId: ITEM, itemType: 'Lakehouse' })).toEqual({
      item: `https://app.fabric.microsoft.com/groups/${WS}/lakehouses/${ITEM}`,
      workspace: `https://app.fabric.microsoft.com/groups/${WS}/list`,
    });
  });

  it('links other item types only to the workspace', () => {
    const links = fabricLinks({ workspaceId: WS, itemId: ITEM, itemType: 'KQLDatabase' });
    expect(links.item).toBeNull();
    expect(links.workspace).toContain(WS);
  });

  it('produces no links for ids that are not GUIDs', () => {
    expect(fabricLinks({ workspaceId: 'javascript:alert(1)', itemId: ITEM })).toEqual({
      item: null,
      workspace: null,
    });
  });

  it('uses the configured https portal origin and ignores other schemes', () => {
    const custom = fabricLinks({ workspaceId: WS }, 'https://app.fabric.microsoft.us/home');
    expect(custom.workspace).toBe(`https://app.fabric.microsoft.us/groups/${WS}/list`);
    const unsafe = fabricLinks({ workspaceId: WS }, 'http://evil.example');
    expect(unsafe.workspace).toBe(`https://app.fabric.microsoft.com/groups/${WS}/list`);
  });
});
