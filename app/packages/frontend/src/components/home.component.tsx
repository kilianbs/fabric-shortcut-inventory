import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  FolderTree,
  Link2,
  Repeat,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Unlink,
} from 'lucide-react';

import fabricLogo from '@fabric-msft/svg-icons/fabric_48_color.svg';

import { ErrorState } from '@/components/states';
import { cn } from '@/lib/utils';

export type ScopeMode = 'list' | 'all';

/** The Functions host aborts any invocation at 250 s. */
export const SCAN_LIMIT_MS = 250_000;

const FEATURES = [
  { icon: FolderTree, title: 'Workspaces', text: 'A list by name or ID, or everything accessible' },
  { icon: Link2, title: 'Shortcuts', text: 'From Lakehouse, KQL Database and Mirrored Database' },
  { icon: Unlink, title: 'Orphans', text: 'Targets that no longer exist in scope' },
  { icon: Repeat, title: 'Circular', text: 'Shortcut chains that lead back to their source' },
] as const;

const FOCUS =
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none';

export interface HomeProps {
  scopeMode: ScopeMode;
  listText: string;
  onScopeMode: (mode: ScopeMode) => void;
  onListText: (text: string) => void;
  isScanning: boolean;
  /** Epoch ms when the running scan started. */
  startedAt: number | null;
  error: string | null;
  canScan: boolean;
  onScan: () => void;
  /** Present when a previous result exists, to go back without scanning. */
  onBack?: () => void;
}

/** Re-renders every second while `active`, for the elapsed-time readout. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * The landing view before the first scan (and when changing the scope):
 * explains what the app checks, collects the scope and runs the scan.
 */
export function Home({
  scopeMode,
  listText,
  onScopeMode,
  onListText,
  isScanning,
  startedAt,
  error,
  canScan,
  onScan,
  onBack,
}: HomeProps) {
  const now = useNow(isScanning);
  // `now` can lag behind `startedAt` until the first tick; clamp at zero.
  const elapsed = isScanning && startedAt !== null ? Math.max(0, now - startedAt) : 0;
  const share = Math.min(1, elapsed / SCAN_LIMIT_MS);

  const status = isScanning
    ? { label: 'Scanning', tone: 'bg-primary/10 text-primary' }
    : error
      ? { label: 'Last scan failed', tone: 'bg-destructive/10 text-destructive' }
      : { label: 'Ready to scan', tone: 'bg-primary/10 text-primary' };

  return (
    <div className="flex flex-1 flex-col justify-center px-400 py-600">
      <div className="border-border bg-card mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-sm">
        <header className="border-border flex flex-wrap items-center justify-between gap-300 border-b px-600 py-400">
          <div className="flex items-center gap-300">
            <img
              src={fabricLogo}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-700 w-700 shrink-0 select-none"
            />
            <div>
              <p className="font-heading text-400 font-semibold leading-none">
                Fabric Shortcut Inventory
              </p>
              <p className="text-200 mt-100 text-muted-foreground">
                OneLake shortcuts · Fabric workspaces
              </p>
            </div>
          </div>
          <span
            className={cn(
              'text-200 inline-flex items-center gap-200 rounded-full px-300 py-100 font-medium',
              status.tone
            )}
          >
            <span
              aria-hidden="true"
              className={cn('h-100 w-100 rounded-full bg-current', isScanning && 'animate-pulse')}
            />
            {status.label}
          </span>
        </header>

        <main className="grid gap-600 p-600 lg:grid-cols-[1.15fr_1fr]">
          <section className="flex flex-col">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={isScanning}
                className={cn(
                  'text-200 text-primary inline-flex w-fit items-center gap-100 rounded-md font-medium hover:underline underline-offset-2 disabled:opacity-60',
                  FOCUS
                )}
              >
                <ArrowLeft aria-hidden="true" className="icon-size-100" />
                Back to the inventory
              </button>
            ) : (
              <span className="text-200 bg-primary/10 text-primary inline-flex w-fit items-center gap-200 rounded-full px-300 py-100 font-medium">
                <Sparkles aria-hidden="true" className="h-300 w-300" />
                No inventory yet
              </span>
            )}
            <h1 className="font-heading text-hero-900 mt-400 font-semibold leading-tight tracking-tight">
              Fabric Shortcut Inventory
            </h1>
            <p className="font-heading text-hero-700 text-primary font-semibold leading-tight tracking-tight">
              What points where, and what no longer exists.
            </p>
            <p className="text-400 mt-300 max-w-xl leading-500 text-muted-foreground">
              A scan walks the chosen workspaces, lists the OneLake shortcuts of every item and
              detects orphan and circular shortcuts. The result is saved and the app opens it
              straight away next time.
            </p>

            <ul className="mt-auto grid gap-300 pt-600 sm:grid-cols-2 lg:auto-rows-fr">
              {FEATURES.map(({ icon: Icon, title, text }, index) => (
                <li
                  key={title}
                  className="border-border bg-background animate-fade-up flex items-start gap-300 rounded-xl border p-300"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span className="bg-primary/10 text-primary inline-flex h-600 w-600 shrink-0 items-center justify-center rounded-lg">
                    <Icon aria-hidden="true" className="h-300 w-300" />
                  </span>
                  <span>
                    <span className="text-300 block font-semibold">{title}</span>
                    <span className="text-200 text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-400">
            <div className="border-border bg-background rounded-xl border p-500">
              <div className="flex items-start justify-between gap-300">
                <div>
                  <p className="text-100 text-primary font-semibold uppercase tracking-widest">
                    Scan progress
                  </p>
                  <p className="text-400 mt-100 font-medium" role="status" aria-live="polite">
                    {isScanning
                      ? 'Reading workspaces, items and shortcuts…'
                      : 'Ready to build the inventory'}
                  </p>
                </div>
                <span className="text-200 text-muted-foreground">
                  {isScanning ? 'running' : 'idle'}
                </span>
              </div>
              <div className="my-500">
                <ElapsedRing share={share} label={isScanning ? formatDuration(elapsed) : '0:00'} />
              </div>
              <p className="text-200 text-center text-muted-foreground">
                Limit per scan: {formatDuration(SCAN_LIMIT_MS)}. If it is reached, the result is
                marked as partial.
              </p>
            </div>

            <div className="border-border bg-card rounded-xl border p-500 shadow-sm">
              <fieldset disabled={isScanning} className="flex flex-col gap-300">
                <legend className="text-100 text-primary font-semibold uppercase tracking-widest">
                  Scope
                </legend>
                <div className="grid grid-cols-2 gap-200" role="radiogroup" aria-label="Scope">
                  {(
                    [
                      ['list', 'Workspace list'],
                      ['all', 'All accessible'],
                    ] as const
                  ).map(([mode, label]) => (
                    <label
                      key={mode}
                      className={cn(
                        'text-300 flex cursor-pointer items-center gap-200 rounded-lg border px-300 py-200 font-medium transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                        scopeMode === mode
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-input hover:bg-accent'
                      )}
                    >
                      <input
                        type="radio"
                        name="scope"
                        value={mode}
                        checked={scopeMode === mode}
                        onChange={() => onScopeMode(mode)}
                        className="accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {scopeMode === 'list' ? (
                  <label className="text-200 flex flex-col gap-100 text-muted-foreground">
                    Names or IDs, one per line or comma-separated
                    <textarea
                      value={listText}
                      onChange={(event) => onListText(event.target.value)}
                      rows={3}
                      placeholder={'Sales\nFinance'}
                      className={cn(
                        'border-input bg-background text-300 font-monospace rounded-lg border p-300 text-foreground',
                        FOCUS
                      )}
                    />
                  </label>
                ) : (
                  <p className="text-200 text-muted-foreground">
                    The whole tenant with Fabric administrator permissions; otherwise, the
                    workspaces the app identity can access.
                  </p>
                )}
              </fieldset>
              <div className="bg-muted mt-400 h-200 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                  style={{ width: `${share * 100}%` }}
                />
              </div>
              <button
                type="button"
                onClick={onScan}
                disabled={!canScan || isScanning}
                className={cn(
                  'bg-primary text-primary-foreground hover:bg-primary/90 mt-400 inline-flex w-full items-center justify-center gap-200 rounded-lg px-500 py-300 text-400 font-medium transition-[background-color,scale] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
                  FOCUS
                )}
              >
                <ScanSearch
                  aria-hidden="true"
                  className={cn('h-300 w-300', isScanning && 'animate-pulse')}
                />
                {isScanning ? 'Scanning…' : 'Scan shortcuts'}
              </button>
            </div>

            {error ? <ErrorState message={error} /> : null}

            <p className="text-200 flex items-start gap-200 text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="h-300 w-300 shrink-0" />
              The scan uses the app identity (the owner of the item), not yours. Only the
              workspaces that identity can access are included.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Elapsed time as a ring that fills toward the scan limit. */
function ElapsedRing({ share, label }: { share: number; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative mx-auto h-[10rem] w-[10rem]">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
          className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-numeric text-hero-800 font-semibold tabular-nums">{label}</span>
        <span className="text-200 text-muted-foreground">elapsed</span>
      </div>
    </div>
  );
}
