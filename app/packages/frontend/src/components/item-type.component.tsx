import genericItem from '@fabric-msft/svg-icons/generic_placeholder_20_item.svg';
import kqlDatabase from '@fabric-msft/svg-icons/kql_database_20_item.svg';
import lakehouse from '@fabric-msft/svg-icons/lakehouse_20_item.svg';
import mirroredDatabase from '@fabric-msft/svg-icons/mirrored_generic_database_20_item.svg';

import { cn } from '@/lib/utils';

/** Icon per item type that exposes shortcuts (SHORTCUT_SUPPORTED_TYPES). */
const ITEM_ICONS: Readonly<Record<string, string>> = {
  Lakehouse: lakehouse,
  KQLDatabase: kqlDatabase,
  MirroredDatabase: mirroredDatabase,
};

const ICON_SIZE = {
  sm: 'icon-size-200',
  md: 'icon-size-300',
} as const;

/** The Fabric icon for an item type; decorative, so pair it with the name. */
export function ItemTypeIcon({
  itemType,
  size = 'sm',
  className,
}: {
  itemType: string | undefined;
  size?: keyof typeof ICON_SIZE;
  className?: string;
}) {
  return (
    <img
      src={(itemType && ITEM_ICONS[itemType]) || genericItem}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn(ICON_SIZE[size], 'shrink-0 select-none', className)}
    />
  );
}

/** Item type as an outlined pill with its Fabric icon. */
export function TypeBadge({ value }: { value: string }) {
  return (
    <span
      className="border-border text-200 inline-flex max-w-full items-center gap-100 rounded-full border py-100-nudge pr-200 pl-100 font-medium"
      title={value}
    >
      <ItemTypeIcon itemType={value} />
      <span className="truncate">{value}</span>
    </span>
  );
}
