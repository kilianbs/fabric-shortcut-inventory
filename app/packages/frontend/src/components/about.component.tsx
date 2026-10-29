import { FolderTree, Link2, ShieldCheck, Unlink } from 'lucide-react';

import type { InventoryTotals } from '@/lib/shortcut-view';
import { formatNumber, formatTimestamp } from '@/lib/utils';

const SCOPE = [
  {
    icon: FolderTree,
    title: 'Workspaces',
    text: 'The listed ones, or every workspace the app identity can see.',
  },
  {
    icon: Link2,
    title: 'Shortcuts',
    text: 'Those of every Lakehouse, KQL Database and Mirrored Database, with their target.',
  },
  {
    icon: Unlink,
    title: 'Checks',
    text: 'Orphans (missing target) and circular shortcuts (cycles between shortcuts).',
  },
] as const;

export interface LastScan {
  scopeLabel: string;
  scannedAt: string;
  partial: boolean;
  totals: InventoryTotals;
}

/** Explains what the app checks, under which identity, and what the last scan did. */
export function About({ lastScan }: { lastScan: LastScan }) {
  const { totals } = lastScan;
  const rows: [string, string][] = [
    ['Status', lastScan.partial ? 'partial (time limit)' : 'complete'],
    ['Scanned', formatTimestamp(lastScan.scannedAt)],
    ['Scope', lastScan.scopeLabel],
    ['Workspaces', formatNumber(totals.workspaces)],
    ['Items checked', formatNumber(totals.items)],
    ['Shortcuts', formatNumber(totals.shortcuts)],
    ['Orphans', formatNumber(totals.orphans)],
    ['Circular', formatNumber(totals.circular)],
    ['Unreadable items', formatNumber(totals.errors)],
  ];

  return (
    <main className="px-500 py-500">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-500">
        <header className="animate-fade-up">
          <p className="text-100 text-primary font-semibold uppercase tracking-widest">
            About
          </p>
          <h1 className="font-heading text-hero-800 mt-100 font-semibold tracking-tight">
            Fabric Shortcut Inventory
          </h1>
          <p className="text-400 mt-200 max-w-2xl leading-500 text-muted-foreground">
            Each scan walks the workspaces in scope, lists the OneLake shortcuts of their items,
            resolves the target names and flags orphan and circular shortcuts. It is the same
            logic as the repository notebook, run in a Function.
          </p>
        </header>

        <section aria-label="What is scanned">
          <ul className="grid gap-300 md:grid-cols-3">
            {SCOPE.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="border-border bg-card flex items-start gap-300 rounded-xl border p-400 shadow-sm"
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

        <div className="grid gap-400 lg:grid-cols-2">
          <section
            aria-label="Identity and limitations"
            className="border-border bg-card rounded-2xl border p-500 shadow-sm"
          >
            <p className="text-100 text-primary font-semibold uppercase tracking-widest">
              Identity and limitations
            </p>
            <p className="text-300 mt-200 leading-400 text-muted-foreground">
              The scan uses the app identity (the owner of the Fabric App item), not yours. Every
              user with access to the app sees what that identity can see.
            </p>
            <ul className="text-300 mt-300 flex list-disc flex-col gap-100 pl-500 leading-400 text-muted-foreground">
              <li>
                The governance check (sensitivity labels and endorsement) is only available in
                the notebook.
              </li>
              <li>
                With a workspace list, a target that lives outside the list shows up as an orphan
                even though it exists. For a reliable diagnosis, scan them all.
              </li>
              <li>Each scan is limited to about 250 s; on large tenants, use a list.</li>
            </ul>
            <p className="text-200 mt-300 flex items-start gap-200 text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="h-300 w-300 shrink-0" />
              Every scan is saved in the app database and every app user sees it. The app opens
              the latest one; it only scans again when you ask.
            </p>
          </section>

          <section
            aria-label="Last scan"
            className="border-border bg-card rounded-2xl border p-500 shadow-sm"
          >
            <p className="text-100 text-primary font-semibold uppercase tracking-widest">
              Last scan
            </p>
            <dl className="text-300 mt-300 grid grid-cols-[auto_1fr] gap-x-400 gap-y-200">
              {rows.map(([term, value]) => (
                <div key={term} className="contents">
                  <dt className="text-muted-foreground">{term}</dt>
                  <dd className="break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
