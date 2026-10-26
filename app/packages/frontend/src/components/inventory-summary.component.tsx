import type { ReactNode } from 'react';
import { FolderTree, Link2, Repeat, Unlink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { InventoryTotals } from '@/lib/shortcut-view';
import { cn, formatNumber } from '@/lib/utils';

type Tone = 'primary' | 'danger' | 'warning';

const TONES: Record<Tone, { chip: string; value: string }> = {
  primary: { chip: 'bg-primary/10 text-primary', value: '' },
  danger: { chip: 'bg-destructive/10 text-destructive', value: 'text-destructive' },
  warning: { chip: 'bg-warning text-warning-foreground', value: 'text-warning-foreground' },
};

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  /** Attention tone, applied only when the figure is above zero. */
  tone?: Tone;
  children?: ReactNode;
  /** Position in the row; staggers the entrance animation. */
  index?: number;
}

/**
 * A compact KPI tile: the icon chip anchors the figure on the left, label,
 * value and hint stack on the right so values line up across the row.
 */
function Tile({ icon: Icon, label, value, hint, tone = 'primary', children, index = 0 }: TileProps) {
  const style = TONES[value > 0 ? tone : 'primary'];
  return (
    <li
      className="border-border bg-card animate-fade-up flex min-w-0 items-start gap-300 rounded-2xl border p-400 shadow-sm transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-100-nudge hover:border-primary/40 hover:shadow-md"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        className={cn(
          'inline-flex h-700 w-700 shrink-0 items-center justify-center rounded-xl',
          style.chip
        )}
      >
        <Icon aria-hidden="true" className="icon-size-300" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-100">
        <p className="text-200 font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'font-numeric text-hero-700 leading-hero-700 font-semibold tabular-nums',
            style.value
          )}
        >
          {formatNumber(value)}
        </p>
        <p className="text-200 truncate text-muted-foreground">{hint}</p>
        {children}
      </div>
    </li>
  );
}

/** OneLake vs external share of the shortcuts. */
function TargetMeter({ oneLake, external }: { oneLake: number; external: number }) {
  const total = oneLake + external;
  if (total === 0) return null;
  return (
    <div
      role="img"
      aria-label={`${formatNumber(oneLake)} OneLake, ${formatNumber(external)} externos`}
      className="bg-muted mt-100 flex h-100 w-full overflow-hidden rounded-full"
    >
      <span className="animate-grow-x flex h-full w-full origin-left [animation-delay:240ms]">
        <span className="bg-primary h-full" style={{ width: `${(oneLake / total) * 100}%` }} />
        <span className="bg-warning-emphasis h-full flex-1" />
      </span>
    </div>
  );
}

/** Global figures for the scan, as a row of KPI tiles. */
export function InventorySummary({ totals }: { totals: InventoryTotals }) {
  return (
    <section aria-label="Resumen del inventario">
      <ul className="grid grid-cols-1 gap-400 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={FolderTree}
          label="Workspaces"
          value={totals.workspaces}
          hint={`${formatNumber(totals.items)} ítems revisados`}
        />
        <Tile
          icon={Link2}
          label="Shortcuts"
          index={1}
          value={totals.shortcuts}
          hint={`${formatNumber(totals.external)} a almacenamiento externo`}
        >
          <TargetMeter oneLake={totals.shortcuts - totals.external} external={totals.external} />
        </Tile>
        <Tile
          icon={Unlink}
          label="Huérfanos"
          index={2}
          tone="danger"
          value={totals.orphans}
          hint={totals.orphans === 0 ? 'todos los destinos existen' : 'destino inexistente'}
        />
        <Tile
          icon={Repeat}
          label="Circulares"
          index={3}
          tone="warning"
          value={totals.circular}
          hint={totals.circular === 0 ? 'sin ciclos' : 'forman parte de un ciclo'}
        />
      </ul>
    </section>
  );
}
