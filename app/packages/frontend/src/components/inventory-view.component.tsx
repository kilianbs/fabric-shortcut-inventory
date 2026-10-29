import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ref } from 'react';
import {
  ExternalLink,
  Folder,
  MousePointerClick,
  Search,
  Shapes,
  TriangleAlert,
  X,
} from 'lucide-react';

import { FilterMenu } from '@/components/filter-menu.component';
import { InventorySummary } from '@/components/inventory-summary.component';
import { TypeBadge } from '@/components/item-type.component';
import { ShortcutTable, StatusChips } from '@/components/shortcut-table.component';
import { EmptyState } from '@/components/states';
import { fabricLinks } from '@/lib/fabric-links';
import {
  countBy,
  DEFAULT_FILTERS,
  filterShortcuts,
  isDefaultFilters,
} from '@/lib/shortcut-view';
import type {
  InventoryTotals,
  ItemError,
  ShortcutFilters,
  ShortcutRow,
} from '@/lib/shortcut-view';
import { cn, formatNumber } from '@/lib/utils';

export interface InventoryViewProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Shortcuts this page lists (all, orphans or circular). */
  rows: readonly ShortcutRow[];
  totals: InventoryTotals;
  warnings: readonly string[];
  errors: readonly ItemError[];
  /** Shown when the page has no rows before any filter is applied. */
  emptyTitle: string;
  emptyHint: string;
  /** Fabric portal base URL from the deployment config (public cloud if unset). */
  portalUrl?: string;
}

const FOCUS =
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none';

const CONTROL_CLASS = cn(
  'border-input bg-background text-foreground text-300 h-800 rounded-lg border px-300',
  FOCUS
);

/** Detail sits beside the grid from Tailwind's `2xl` breakpoint (96rem). */
const SIDE_BY_SIDE_QUERY = '(min-width: 96rem)';

const SECONDARY_BUTTON = cn(
  'border-border bg-background hover:bg-accent text-300 inline-flex h-800 items-center gap-200 rounded-lg border px-300 font-medium transition-[color,background-color,border-color,scale] duration-150 active:scale-95',
  FOCUS
);

/**
 * A shortcut inventory page: global figures, scan notices, filters and a
 * table of shortcuts, with the selected row's detail beside it.
 */
export function InventoryView({
  eyebrow,
  title,
  subtitle,
  rows,
  totals,
  warnings,
  errors,
  emptyTitle,
  emptyHint,
  portalUrl,
}: InventoryViewProps) {
  const [filters, setFilters] = useState<ShortcutFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  const updateFilter = <K extends keyof ShortcutFilters>(key: K, value: ShortcutFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  // Below 2xl the detail stacks under the grid; bring it into view on select.
  useEffect(() => {
    if (selectedId === null) return;
    if (window.matchMedia?.(SIDE_BY_SIDE_QUERY).matches) return;
    detailRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const workspaceOptions = useMemo(
    () => countBy(rows, 'workspaceName').map((o) => ({ ...o, label: o.value })),
    [rows]
  );
  const targetOptions = useMemo(
    () => countBy(rows, 'targetType').map((o) => ({ ...o, label: o.value })),
    [rows]
  );
  const visible = useMemo(() => filterShortcuts(rows, filters), [rows, filters]);
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const filtersChanged = !isDefaultFilters(filters);
  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const activeChips = [
    filters.query.trim() !== '' && {
      key: 'query',
      label: 'Search',
      value: `“${filters.query.trim()}”`,
      clear: () => updateFilter('query', ''),
    },
    filters.workspace !== '' && {
      key: 'workspace',
      label: 'Workspace',
      value: filters.workspace,
      clear: () => updateFilter('workspace', ''),
    },
    filters.targetType !== '' && {
      key: 'targetType',
      label: 'Target',
      value: filters.targetType,
      clear: () => updateFilter('targetType', ''),
    },
  ].filter((chip) => chip !== false);

  return (
    <main className="px-300 py-500 sm:px-500">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-500">
        <header className="animate-fade-up">
          <p className="text-100 font-semibold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="font-heading text-hero-800 mt-100 font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-300 mt-100 text-muted-foreground">{subtitle}</p>
        </header>

        <InventorySummary totals={totals} />

        <ScanNotices warnings={warnings} errors={errors} />

        <div className="grid items-start gap-400 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section
            aria-labelledby="shortcuts-heading"
            className="border-border bg-card animate-fade-up min-w-0 rounded-2xl border shadow-sm [animation-delay:240ms]"
          >
            <div className="flex flex-col gap-300 p-400">
              <div className="flex items-baseline justify-between gap-300">
                <h2 id="shortcuts-heading" className="font-heading text-400 font-semibold">
                  Shortcuts
                </h2>
                <p className="text-200 tabular-nums text-muted-foreground" aria-live="polite">
                  <span className="font-semibold text-foreground">
                    {formatNumber(visible.length)}
                  </span>
                  &nbsp;of {formatNumber(rows.length)}
                </p>
              </div>

              <div
                role="search"
                aria-label="Filter shortcuts"
                className="flex flex-wrap items-center gap-200"
              >
                <div className="relative min-w-0 flex-1 basis-56">
                  <label htmlFor="shortcut-search" className="sr-only">
                    Search shortcuts
                  </label>
                  <Search
                    aria-hidden="true"
                    className="icon-size-200 pointer-events-none absolute top-1/2 left-300 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="shortcut-search"
                    type="search"
                    placeholder="Search by name, item, workspace or target…"
                    value={filters.query}
                    onChange={(event) => updateFilter('query', event.target.value)}
                    className={cn(CONTROL_CLASS, 'w-full pr-800 pl-800')}
                  />
                  {filters.query !== '' ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => updateFilter('query', '')}
                      className={cn(
                        'hover:bg-accent animate-fade-in absolute top-1/2 right-100 inline-flex h-600 w-600 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground',
                        FOCUS
                      )}
                    >
                      <X aria-hidden="true" className="icon-size-200" />
                    </button>
                  ) : null}
                </div>
                <FilterMenu
                  label="Workspace"
                  allLabel="All workspaces"
                  icon={Folder}
                  value={filters.workspace}
                  onChange={(value) => updateFilter('workspace', value)}
                  options={workspaceOptions}
                />
                <FilterMenu
                  label="Target"
                  allLabel="All targets"
                  icon={Shapes}
                  value={filters.targetType}
                  onChange={(value) => updateFilter('targetType', value)}
                  options={targetOptions}
                />
              </div>

              {filtersChanged ? (
                <div
                  aria-label="Active filters"
                  role="group"
                  className="animate-fade-in flex flex-wrap items-center gap-200"
                >
                  {activeChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="border-primary/30 bg-primary/5 text-200 inline-flex max-w-full items-center gap-100 rounded-full border py-100-nudge pr-100 pl-300"
                    >
                      <span className="text-muted-foreground">{chip.label}</span>
                      <span className="truncate font-medium">{chip.value}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${chip.label.toLowerCase()} filter`}
                        onClick={chip.clear}
                        className={cn(
                          'hover:bg-primary/15 inline-flex h-500 w-500 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground',
                          FOCUS
                        )}
                      >
                        <X aria-hidden="true" className="icon-size-100" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={cn(
                      'text-200 rounded-md px-200 py-100 font-medium text-muted-foreground hover:text-foreground hover:underline underline-offset-2',
                      FOCUS
                    )}
                  >
                    Clear all
                  </button>
                </div>
              ) : null}
            </div>

            <div className="border-border border-t">
              {visible.length === 0 ? (
                <div className="p-400">
                  {filtersChanged ? (
                    <EmptyState
                      title="No shortcut matches the filters"
                      hint="Change the search or the filters to see more."
                      action={
                        <button type="button" onClick={clearFilters} className={SECONDARY_BUTTON}>
                          <X aria-hidden="true" className="icon-size-200" />
                          Show all
                        </button>
                      }
                    />
                  ) : (
                    <EmptyState title={emptyTitle} hint={emptyHint} />
                  )}
                </div>
              ) : (
                <ShortcutTable rows={visible} selectedId={selectedId} onSelect={setSelectedId} />
              )}
            </div>
          </section>

          {selected ? (
            <ShortcutDetail
              key={selected.id}
              ref={detailRef}
              shortcut={selected}
              portalUrl={portalUrl}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="border-border bg-card animate-fade-in flex items-center gap-300 rounded-2xl border border-dashed px-400 py-300 2xl:sticky 2xl:top-400 2xl:flex-col 2xl:gap-200 2xl:px-500 2xl:py-800 2xl:text-center">
              <MousePointerClick
                aria-hidden="true"
                className="icon-size-300 2xl:icon-size-400 shrink-0 animate-bounce text-muted-foreground [animation-iteration-count:3]"
              />
              <div className="flex flex-col gap-100">
                <p className="text-300 font-medium">No shortcut selected</p>
                <p className="text-200 text-muted-foreground">
                  Select a row to see its target and checks.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/** Partial-scan warnings and items whose shortcuts could not be listed. */
function ScanNotices({
  warnings,
  errors,
}: {
  warnings: readonly string[];
  errors: readonly ItemError[];
}) {
  if (warnings.length === 0 && errors.length === 0) return null;
  return (
    <section
      aria-label="Scan notices"
      className="border-warning-border bg-warning text-warning-foreground animate-fade-up flex items-start gap-300 rounded-xl border px-400 py-300"
    >
      <TriangleAlert aria-hidden="true" className="icon-size-200 mt-100 shrink-0" />
      <div className="text-300 flex min-w-0 flex-1 flex-col gap-100">
        {warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
        {errors.length > 0 ? (
          <details>
            <summary className="cursor-pointer font-medium">
              {formatNumber(errors.length)} unreadable item{errors.length === 1 ? '' : 's'}
            </summary>
            <ul className="text-200 mt-200 flex flex-col gap-100">
              {errors.map((e, index) => (
                <li key={`${e.workspaceName}-${e.itemName}-${index}`} className="break-words">
                  <span className="font-medium">
                    {e.workspaceName} / {e.itemName}
                  </span>
                  : {e.error}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function ShortcutDetail({
  ref,
  shortcut,
  portalUrl,
  onClose,
}: {
  ref: Ref<HTMLElement>;
  shortcut: ShortcutRow;
  portalUrl: string | undefined;
  onClose: () => void;
}) {
  const links = fabricLinks(shortcut, portalUrl);
  const targetLinks = fabricLinks({ workspaceId: shortcut.targetWorkspaceId }, portalUrl);
  const fields: [string, string][] = [
    ['Path', shortcut.path ? `${shortcut.path}/${shortcut.name}` : shortcut.name],
    ['Target type', shortcut.targetType],
    ['Target workspace', shortcut.targetWorkspaceName],
    ['Target item', shortcut.targetItemName],
    ['Subpath', shortcut.targetSubpath],
    ['Location', shortcut.targetLocation],
  ];

  return (
    <section
      ref={ref}
      className="border-border bg-card animate-slide-in scroll-mt-400 rounded-2xl border p-500 shadow-sm 2xl:sticky 2xl:top-400"
      aria-label="Shortcut detail"
    >
      <div className="flex items-start justify-between gap-300">
        <div className="min-w-0">
          <p className="text-100 text-primary font-semibold uppercase tracking-widest">
            Shortcut detail
          </p>
          <h2 className="font-heading text-500 mt-100 font-semibold break-words">
            {shortcut.name}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close detail"
          onClick={onClose}
          className={cn(
            'hover:bg-accent inline-flex h-700 w-700 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,rotate] duration-200 hover:rotate-90',
            FOCUS
          )}
        >
          <X aria-hidden="true" className="icon-size-200" />
        </button>
      </div>
      <div className="mt-200 flex flex-wrap items-center gap-200">
        <TypeBadge value={shortcut.itemType || 'Item'} />
        <span className="text-200 font-medium">{shortcut.itemName}</span>
        <span className="text-200 inline-flex items-center gap-100 text-muted-foreground">
          <Folder aria-hidden="true" className="icon-size-100" />
          {shortcut.workspaceName}
        </span>
      </div>

      {links.workspace ? (
        <div className="mt-300 flex flex-wrap items-center gap-200">
          {links.item ? (
            <a
              href={links.item}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${shortcut.itemName} in Fabric (new tab)`}
              className={cn(
                'bg-primary text-primary-foreground hover:bg-primary/90 text-300 inline-flex h-800 items-center gap-200 rounded-lg px-300 font-medium transition-colors duration-150',
                FOCUS
              )}
            >
              <ExternalLink aria-hidden="true" className="icon-size-200" />
              Open in Fabric
            </a>
          ) : null}
          <a
            href={links.workspace}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open the ${shortcut.workspaceName} workspace in Fabric (new tab)`}
            className={SECONDARY_BUTTON}
          >
            <Folder aria-hidden="true" className="icon-size-200" />
            Open workspace
          </a>
          {targetLinks.workspace && !shortcut.isOrphan ? (
            <a
              href={targetLinks.workspace}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the target workspace ${shortcut.targetWorkspaceName} in Fabric (new tab)`}
              className={SECONDARY_BUTTON}
            >
              <ExternalLink aria-hidden="true" className="icon-size-200" />
              Target workspace
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-300">
        <StatusChips row={shortcut} />
      </div>

      {shortcut.isOrphan || shortcut.isCircular ? (
        <div className="mt-300 flex flex-col gap-200">
          {shortcut.isOrphan ? (
            <p className="bg-destructive/10 text-destructive text-200 rounded-lg px-300 py-200 break-words">
              {shortcut.orphanReason || 'The target item does not exist in the scanned scope.'}
            </p>
          ) : null}
          {shortcut.isCircular ? (
            <p className="bg-warning text-warning-foreground text-200 font-monospace rounded-lg px-300 py-200 break-words">
              {shortcut.circularPath || 'Part of a shortcut cycle.'}
            </p>
          ) : null}
        </div>
      ) : null}

      <dl className="border-border text-300 mt-400 grid grid-cols-[auto_1fr] gap-x-400 gap-y-200 border-t pt-400">
        {fields.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="break-words font-medium">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
