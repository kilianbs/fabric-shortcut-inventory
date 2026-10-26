const DEFAULT_PORTAL_URL = 'https://app.fabric.microsoft.com';

/**
 * Portal path segment per item type, for the item's own page.
 * Types not listed here link to their workspace instead.
 */
const ITEM_SEGMENTS: Readonly<Record<string, string>> = {
  Lakehouse: 'lakehouses',
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FabricLinks {
  /** The item's own page, or null when its URL shape is not known. */
  item: string | null;
  /** The workspace's item list, or null without a valid workspace id. */
  workspace: string | null;
}

/** https origin of the configured portal, falling back to the public cloud. */
export function portalOrigin(portalUrl: string | undefined): string {
  if (portalUrl) {
    try {
      const url = new URL(portalUrl);
      if (url.protocol === 'https:') return url.origin;
    } catch {
      // Fall through to the default.
    }
  }
  return DEFAULT_PORTAL_URL;
}

/** Portal links for an item; ids that are not GUIDs produce no link. */
export function fabricLinks(
  item: { workspaceId?: string | null; itemId?: string | null; itemType?: string },
  portalUrl?: string
): FabricLinks {
  const origin = portalOrigin(portalUrl);
  const { workspaceId, itemId, itemType } = item;
  if (!workspaceId || !GUID.test(workspaceId)) return { item: null, workspace: null };
  const segment = itemType ? ITEM_SEGMENTS[itemType] : undefined;
  return {
    item:
      segment && itemId && GUID.test(itemId)
        ? `${origin}/groups/${workspaceId}/${segment}/${itemId}`
        : null,
    workspace: `${origin}/groups/${workspaceId}/list`,
  };
}
