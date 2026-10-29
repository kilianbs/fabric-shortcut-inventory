import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Info,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Repeat,
  SlidersHorizontal,
  Unlink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import fabricLogo from '@fabric-msft/svg-icons/fabric_48_color.svg';

import { routeHref } from '@/hooks/use-hash-route';
import type { AppRoute } from '@/hooks/use-hash-route';
import { cn, formatNumber, formatTimestamp } from '@/lib/utils';

interface NavItem {
  route: AppRoute;
  label: string;
  icon: LucideIcon;
}

const NAV_SECTIONS: readonly { title: string; items: readonly NavItem[] }[] = [
  {
    title: 'Explore',
    items: [
      { route: 'inventory', label: 'Inventory', icon: LayoutDashboard },
      { route: 'orphans', label: 'Orphans', icon: Unlink },
      { route: 'circular', label: 'Circular', icon: Repeat },
    ],
  },
  {
    title: 'System',
    items: [{ route: 'about', label: 'About', icon: Info }],
  },
];

const PAGE_TITLES: Record<AppRoute, string> = {
  inventory: 'Inventory',
  orphans: 'Orphans',
  circular: 'Circular',
  about: 'About',
};

export interface AppShellProps {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  scopeLabel: string;
  shortcutCount: number;
  /** Per-route counters shown next to the nav labels. */
  counts: Partial<Record<AppRoute, number>>;
  scannedAt: string;
  partial: boolean;
  isScanning: boolean;
  onRescan: () => void;
  onChangeScope: () => void;
  children: ReactNode;
}

const ACTION_FOCUS =
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none';

/** Per-viewer UI preference; storage may be unavailable, so never rely on it. */
const COLLAPSED_KEY = 'fsci.sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    // Ignore: the preference simply is not remembered.
  }
}

/** Left navigation, a top bar with the page actions, and the page content. */
export function AppShell({
  route,
  onNavigate,
  scopeLabel,
  shortcutCount,
  counts,
  scannedAt,
  partial,
  isScanning,
  onRescan,
  onChangeScope,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleCollapsed = () =>
    setCollapsed((current) => {
      writeCollapsed(!current);
      return !current;
    });
  /** Classes applied only while collapsed, and only on the lg+ side rail. */
  const whenCollapsed = (classes: string) => (collapsed ? classes : undefined);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside
        data-collapsed={collapsed ? '' : undefined}
        className={cn(
          'border-border bg-card flex flex-col gap-400 border-b px-300 py-300 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0 lg:py-400 lg:transition-[width] lg:duration-200',
          whenCollapsed('lg:w-16 lg:px-200')
        )}
      >
        <div
          className={cn(
            'flex items-center gap-300 px-200',
            whenCollapsed('lg:flex-col lg:px-0')
          )}
        >
          <img
            src={fabricLogo}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-700 w-700 shrink-0 select-none"
          />
          <div className={cn('min-w-0 flex-1', whenCollapsed('lg:sr-only'))}>
            <p className="font-heading text-400 truncate font-semibold leading-tight">
              Shortcut Inventory
            </p>
            <p className="text-200 mt-100 truncate text-muted-foreground">
              Microsoft Fabric
            </p>
          </div>
        </div>

        <nav
          aria-label="Principal"
          className="flex flex-wrap gap-x-400 gap-y-300 lg:flex-col"
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-100">
              <p
                className={cn(
                  'text-100 px-300 pb-100 font-semibold uppercase tracking-widest text-muted-foreground',
                  whenCollapsed('lg:sr-only')
                )}
              >
                {section.title}
              </p>
              {section.items.map(({ route: target, label, icon: Icon }) => {
                const active = target === route;
                const count = counts[target];
                return (
                  <a
                    key={target}
                    href={routeHref(target)}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? label : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      onNavigate(target);
                    }}
                    className={cn(
                      'text-300 inline-flex items-center gap-200 rounded-lg border-l-4 px-300 py-200 font-medium transition-[color,background-color,border-color,translate] duration-200 hover:translate-x-100-nudge',
                      ACTION_FOCUS,
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-accent border-transparent',
                      whenCollapsed(
                        'lg:justify-center lg:px-0 lg:hover:translate-x-0'
                      )
                    )}
                  >
                    <Icon aria-hidden="true" className="icon-size-200 shrink-0" />
                    <span className={cn('flex-1', whenCollapsed('lg:sr-only'))}>
                      {label}
                    </span>
                    {count !== undefined && count > 0 ? (
                      <span
                        className={cn(
                          'text-100 rounded-full px-200 py-100-nudge font-semibold tabular-nums',
                          target === 'orphans'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-warning text-warning-foreground',
                          whenCollapsed('lg:sr-only')
                        )}
                      >
                        {formatNumber(count)}
                      </span>
                    ) : null}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="hidden flex-col gap-300 lg:mt-auto lg:flex">
          <div
            className={cn(
              'border-border bg-background rounded-xl border p-300',
              whenCollapsed('hidden')
            )}
          >
            <p className="text-100 font-semibold uppercase tracking-widest text-muted-foreground">
              Fabric scope
            </p>
            <p className="text-300 mt-100 font-semibold break-words">{scopeLabel}</p>
            <p className="text-200 mt-100 flex items-center gap-200 text-muted-foreground">
              <span aria-hidden="true" className="bg-primary h-100 w-100 rounded-full" />
              {formatNumber(shortcutCount)} shortcut{shortcutCount === 1 ? '' : 's'}
            </p>
            <p className="text-200 mt-100 flex items-center gap-200 text-muted-foreground">
              <span
                aria-hidden="true"
                className={cn(
                  'h-100 w-100 shrink-0 rounded-full',
                  isScanning
                    ? 'bg-primary animate-pulse'
                    : partial
                      ? 'bg-warning-emphasis'
                      : 'bg-primary'
                )}
              />
              <span>
                <span className="font-medium text-foreground">
                  {isScanning ? 'Scanning' : partial ? 'Partial' : 'Scanned'}
                </span>{' '}
                · {formatTimestamp(scannedAt)}
              </span>
            </p>
            <button
              type="button"
              onClick={onChangeScope}
              disabled={isScanning}
              className={cn(
                'text-200 text-primary mt-200 inline-flex items-center gap-100 rounded-md font-medium hover:underline underline-offset-2 disabled:opacity-60',
                ACTION_FOCUS
              )}
            >
              <SlidersHorizontal aria-hidden="true" className="icon-size-100" />
              Change scope
            </button>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className={cn(
              'hover:bg-accent text-300 inline-flex h-800 items-center gap-200 rounded-lg px-300 text-muted-foreground transition-colors duration-150 hover:text-foreground',
              ACTION_FOCUS,
              whenCollapsed('justify-center px-0')
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="icon-size-200 shrink-0" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="icon-size-200 shrink-0" />
            )}
            <span aria-hidden="true" className={whenCollapsed('sr-only')}>
              Collapse
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-border bg-card flex flex-wrap items-center justify-between gap-300 border-b px-500 py-300">
          <p className="text-300 text-muted-foreground">
            Fabric · Shortcut Inventory ·{' '}
            <span className="font-medium text-foreground">{PAGE_TITLES[route]}</span>
          </p>
          <div className="flex flex-wrap items-center gap-200">
            <button
              type="button"
              onClick={onChangeScope}
              disabled={isScanning}
              className={cn(
                'border-border bg-background hover:bg-accent text-300 inline-flex items-center gap-200 rounded-lg border px-400 py-200 font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 lg:hidden',
                ACTION_FOCUS
              )}
            >
              <SlidersHorizontal aria-hidden="true" className="icon-size-200" />
              Scope
            </button>
            <button
              type="button"
              onClick={onRescan}
              disabled={isScanning}
              className={cn(
                'bg-primary text-primary-foreground hover:bg-primary/90 text-300 inline-flex items-center gap-200 rounded-lg px-400 py-200 font-medium transition-[background-color,scale,box-shadow] duration-150 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
                ACTION_FOCUS
              )}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn('icon-size-200', isScanning && 'animate-spin')}
              />
              {isScanning ? 'Scanning…' : 'Scan again'}
            </button>
          </div>
        </div>
        <div key={route} className="bg-accent animate-fade-in min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
