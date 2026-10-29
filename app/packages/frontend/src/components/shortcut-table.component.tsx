import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Folder,
} from 'lucide-react';

import { ItemTypeIcon } from '@/components/item-type.component';
import type { ShortcutRow } from '@/lib/shortcut-view';
import { nextSort, pageItems, paginate, sortRows } from '@/lib/table-view';
import type { SortDirection, SortState, SortValue } from '@/lib/table-view';
import { cn, formatNumber } from '@/lib/utils';

const FOCUS =
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none';

const PAGE_SIZES = [10, 20, 50] as const;

type ColumnKey = 'name' | 'itemName' | 'workspaceName' | 'targetType' | 'targetLocation' | 'status';

interface Column {
  key: ColumnKey;
  header: string;
  /** Direction applied the first time the column is sorted. */
  firstDirection: SortDirection;
  /** Share of the table width (the table scrolls below its minimum width). */
  width: string;
}

const COLUMNS: readonly Column[] = [
  { key: 'name', header: 'Shortcut', firstDirection: 'asc', width: 'w-[20%]' },
  { key: 'status', header: 'Status', firstDirection: 'desc', width: 'w-[15%]' },
  { key: 'itemName', header: 'Item', firstDirection: 'asc', width: 'w-[15%]' },
  { key: 'workspaceName', header: 'Workspace', firstDirection: 'asc', width: 'w-[15%]' },
  { key: 'targetType', header: 'Target', firstDirection: 'asc', width: 'w-[12%]' },
  { key: 'targetLocation', header: 'Location', firstDirection: 'asc', width: 'w-[23%]' },
];

const DEFAULT_SORT: SortState<ColumnKey> = { key: 'status', direction: 'desc' };

/** Orphans first, then circular, then external, then healthy shortcuts. */
function statusRank(row: ShortcutRow): number {
  return (row.isOrphan ? 4 : 0) + (row.isCircular ? 2 : 0) + (row.isExternal ? 1 : 0);
}

function sortValue(row: ShortcutRow, key: ColumnKey): SortValue {
  return key === 'status' ? statusRank(row) : row[key];
}

export interface ShortcutTableProps {
  rows: readonly ShortcutRow[];
  selectedId: string | null;
  /** Called with the row id, or null when the selected row is picked again. */
  onSelect: (id: string | null) => void;
}

/**
 * The shortcut table: sortable headers, a pager with page size, and row
 * selection. Below `md` the rows become a card list with a sort picker.
 */
export function ShortcutTable({ rows, selectedId, onSelect }: ShortcutTableProps) {
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [pageSize, setPageSize] = useState<number>(20);
  // The page resets whenever a new row set arrives (filters, a new scan).
  const [paging, setPaging] = useState({ rows, page: 1 });
  const requestedPage = paging.rows === rows ? paging.page : 1;
  const setPage = (page: number) => setPaging({ rows, page });

  const sorted = sortRows(rows, sort, sortValue, 'name');
  const slice = paginate(sorted, requestedPage, pageSize);

  const changeSort = (next: SortState<ColumnKey>) => {
    setSort(next);
    setPage(1);
  };
  const toggle = (id: string) => onSelect(id === selectedId ? null : id);

  return (
    <div>
      <MobileSort sort={sort} onChange={changeSort} />

      <ul className="divide-border divide-y md:hidden">
        {slice.rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              aria-pressed={row.id === selectedId}
              onClick={() => toggle(row.id)}
              className={cn(
                'flex w-full items-start gap-300 px-400 py-300 text-left transition-colors duration-150',
                FOCUS,
                row.id === selectedId ? 'bg-primary/5' : 'hover:bg-accent'
              )}
            >
              <ItemTypeIcon itemType={row.itemType} size="md" className="mt-100-nudge" />
              <span className="min-w-0 flex-1">
                <span className="text-300 block truncate font-medium">{row.name}</span>
                <span className="text-200 mt-100 block truncate text-muted-foreground">
                  {row.itemName} · {row.workspaceName} · {row.targetType}
                </span>
                <span className="mt-200 flex flex-wrap items-center gap-200">
                  <StatusChips row={row} />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden max-h-[70vh] overflow-auto md:block">
        <table className="w-full min-w-[60rem] table-fixed border-separate border-spacing-0">
          <caption className="sr-only">
            Shortcuts, sorted by{' '}
            {COLUMNS.find((column) => column.key === sort.key)?.header}{' '}
            {sort.direction === 'asc' ? 'ascending' : 'descending'}
          </caption>
          <colgroup>
            {COLUMNS.map((column) => (
              <col key={column.key} className={column.width} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <HeaderCell
                  key={column.key}
                  column={column}
                  sort={sort}
                  onSort={() => changeSort(nextSort(sort, column.key, column.firstDirection))}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.rows.map((row) => (
              <BodyRow
                key={row.id}
                row={row}
                selected={row.id === selectedId}
                onToggle={() => toggle(row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pager
        page={slice.page}
        pageCount={slice.pageCount}
        from={slice.from}
        to={slice.to}
        total={slice.total}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

/** Orphan, circular and external markers; a dash when the shortcut is healthy. */
export function StatusChips({ row }: { row: ShortcutRow }) {
  const chips = [
    row.isOrphan && { label: 'Orphan', tone: 'bg-destructive/10 text-destructive' },
    row.isCircular && { label: 'Circular', tone: 'bg-warning text-warning-foreground' },
    row.isExternal && { label: 'External', tone: 'border-border border text-muted-foreground' },
  ].filter((chip) => chip !== false);
  if (chips.length === 0) return <span className="text-300 text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-100">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={cn('text-200 rounded-full px-200 py-100-nudge font-medium', chip.tone)}
        >
          {chip.label}
        </span>
      ))}
    </span>
  );
}

const CELL = 'border-border border-b px-400';

function HeaderCell({
  column,
  sort,
  onSort,
}: {
  column: Column;
  sort: SortState<ColumnKey>;
  onSort: () => void;
}) {
  const active = sort.key === column.key;
  const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(CELL, 'bg-muted sticky top-0 z-10 py-0 text-left')}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          'text-100 group inline-flex h-800 max-w-full items-center gap-100 rounded-sm font-semibold uppercase tracking-widest',
          FOCUS,
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span className="truncate">{column.header}</span>
        <Icon
          aria-hidden="true"
          className={cn(
            'icon-size-100 shrink-0 transition-opacity duration-150',
            active ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
          )}
        />
      </button>
    </th>
  );
}

function BodyRow({
  row,
  selected,
  onToggle,
}: {
  row: ShortcutRow;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <tr
      data-selected={selected ? '' : undefined}
      onClick={onToggle}
      className={cn(
        'group cursor-pointer transition-colors duration-150',
        selected ? 'bg-primary/5' : 'hover:bg-accent'
      )}
    >
      <td className={cn(CELL, 'relative py-200')}>
        {selected ? (
          <span aria-hidden="true" className="bg-primary absolute inset-y-0 left-0 w-100" />
        ) : null}
        <span className="flex min-w-0 items-center gap-300">
          <ItemTypeIcon itemType={row.itemType} size="md" />
          {/* The row is clickable; this button is its keyboard/AT target. */}
          <button
            type="button"
            aria-pressed={selected}
            title={row.path ? `${row.path}/${row.name}` : row.name}
            className={cn(
              'text-300 min-w-0 truncate rounded-sm text-left font-medium',
              FOCUS,
              selected && 'text-primary'
            )}
          >
            {row.name}
          </button>
        </span>
      </td>
      <td className={cn(CELL, 'py-200')}>
        <StatusChips row={row} />
      </td>
      <td className={cn(CELL, 'py-200')}>
        <span className="text-300 block truncate" title={row.itemName}>
          {row.itemName}
        </span>
      </td>
      <td className={cn(CELL, 'py-200')}>
        <span className="text-300 flex min-w-0 items-center gap-200" title={row.workspaceName}>
          <Folder aria-hidden="true" className="icon-size-200 shrink-0 text-muted-foreground" />
          <span className="truncate">{row.workspaceName}</span>
        </span>
      </td>
      <td className={cn(CELL, 'py-200')}>
        <span className="text-300 block truncate text-muted-foreground" title={row.targetType}>
          {row.targetType}
        </span>
      </td>
      <td className={cn(CELL, 'py-200')}>
        <span
          className="text-200 font-monospace block truncate text-muted-foreground"
          title={row.targetLocation}
        >
          {row.targetLocation || '—'}
        </span>
      </td>
    </tr>
  );
}

/** Sort picker for the card list, where there are no column headers. */
function MobileSort({
  sort,
  onChange,
}: {
  sort: SortState<ColumnKey>;
  onChange: (next: SortState<ColumnKey>) => void;
}) {
  return (
    <div className="border-border flex items-center gap-200 border-b px-400 py-200 md:hidden">
      <label htmlFor="shortcut-sort" className="text-200 text-muted-foreground">
        Sort by
      </label>
      <select
        id="shortcut-sort"
        value={sort.key}
        onChange={(event) => {
          const column = COLUMNS.find((c) => c.key === event.target.value);
          if (column) onChange({ key: column.key, direction: column.firstDirection });
        }}
        className={cn(
          'border-input bg-background text-300 h-700 min-w-0 flex-1 rounded-lg border px-200',
          FOCUS
        )}
      >
        {COLUMNS.map((column) => (
          <option key={column.key} value={column.key}>
            {column.header}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() =>
          onChange({ key: sort.key, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
        }
        aria-label={sort.direction === 'asc' ? 'Sort descending' : 'Sort ascending'}
        className={cn(
          'border-input bg-background hover:bg-accent inline-flex h-700 w-700 items-center justify-center rounded-lg border',
          FOCUS
        )}
      >
        {sort.direction === 'asc' ? (
          <ArrowUp aria-hidden="true" className="icon-size-200" />
        ) : (
          <ArrowDown aria-hidden="true" className="icon-size-200" />
        )}
      </button>
    </div>
  );
}

const PAGE_BUTTON = cn(
  'text-300 inline-flex h-800 min-w-800 items-center justify-center rounded-lg border px-200 tabular-nums transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40',
  FOCUS
);

function Pager({
  page,
  pageCount,
  from,
  to,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-400 gap-y-200 rounded-b-2xl bg-muted/50 px-400 py-300">
      <p className="text-200 tabular-nums text-muted-foreground" aria-live="polite">
        Showing{' '}
        <span className="font-semibold text-foreground">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{' '}
        of <span className="font-semibold text-foreground">{formatNumber(total)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-x-400 gap-y-200">
        <div className="flex items-center gap-200">
          <label htmlFor="shortcut-page-size" className="text-200 text-muted-foreground">
            Rows per page
          </label>
          <select
            id="shortcut-page-size"
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
            className={cn(
              'border-input bg-background text-300 h-800 rounded-lg border px-200 tabular-nums',
              FOCUS
            )}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <nav aria-label="Pagination" className="flex items-center gap-100">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className={cn(PAGE_BUTTON, 'border-border bg-card hover:bg-accent')}
          >
            <ChevronLeft aria-hidden="true" className="icon-size-200" />
          </button>
          {pageItems(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              <span
                key={`gap-${index}`}
                aria-hidden="true"
                className="text-300 inline-flex h-800 min-w-600 items-center justify-center text-muted-foreground"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPage(item)}
                className={cn(
                  PAGE_BUTTON,
                  item === page
                    ? 'border-primary bg-primary text-primary-foreground font-semibold'
                    : 'border-border bg-card hover:bg-accent'
                )}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
            className={cn(PAGE_BUTTON, 'border-border bg-card hover:bg-accent')}
          >
            <ChevronRight aria-hidden="true" className="icon-size-200" />
          </button>
        </nav>
      </div>
    </div>
  );
}
