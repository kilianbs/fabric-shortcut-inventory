//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from 'react';

import { About } from '@/components/about.component';
import { AppShell } from '@/components/app-shell.component';
import { Home, SCAN_LIMIT_MS } from '@/components/home.component';
import type { ScopeMode } from '@/components/home.component';
import { InventoryView } from '@/components/inventory-view.component';
import { ErrorState } from '@/components/states';
import { useHashRoute } from '@/hooks/use-hash-route';
import { getRayfinClient } from '@/lib/rayfin-client';
import { computeTotals, itemErrors, toShortcutRows } from '@/lib/shortcut-view';
import type { ScanResult } from '@/lib/shortcut-view';

interface Scope {
  mode: ScopeMode;
  workspaces: string[];
}

interface Inventory {
  result: ScanResult;
  scope: Scope;
}

function scopeLabel({ mode, workspaces }: Scope): string {
  return mode === 'all' ? 'Todos los workspaces accesibles' : workspaces.join(', ');
}

const PAGES = {
  inventory: {
    eyebrow: 'Shortcut inventory',
    title: 'Shortcuts de OneLake',
    subtitle: 'Origen, destino y validaciones de cada shortcut del ámbito',
    emptyTitle: 'No hay shortcuts en el ámbito',
    emptyHint: 'Ningún Lakehouse, KQL Database ni Mirrored Database escaneado tiene shortcuts.',
  },
  orphans: {
    eyebrow: 'Validación',
    title: 'Shortcuts huérfanos',
    subtitle: 'Shortcuts cuyo ítem de destino no existe en el ámbito escaneado',
    emptyTitle: 'Ningún shortcut huérfano',
    emptyHint: 'Todos los destinos OneLake existen en el ámbito escaneado.',
  },
  circular: {
    eyebrow: 'Validación',
    title: 'Shortcuts circulares',
    subtitle: 'Shortcuts que forman parte de una cadena que vuelve a su origen',
    emptyTitle: 'Ningún shortcut circular',
    emptyHint: 'No hay ciclos entre los shortcuts del ámbito.',
  },
} as const;

function parseList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The home (scope + scan) until a scan returns, then the app shell with the
 * inventory pages. The result lives only in memory.
 */
function App() {
  const [route, navigate] = useHashRoute();
  const [scopeMode, setScopeMode] = useState<ScopeMode>('list');
  const [listText, setListText] = useState('');
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [editingScope, setEditingScope] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | undefined>(undefined);

  const workspaceList = parseList(listText);
  const isScanning = startedAt !== null;
  const canScan = scopeMode === 'all' || workspaceList.length > 0;

  async function scan(scope: Scope) {
    setStartedAt(Date.now());
    setError(null);
    try {
      const client = await getRayfinClient();
      setPortalUrl(client.runtimeConfig?.portalUrl);
      const result = await client.functions.scanShortcutInventory.invoke(
        { scopeMode: scope.mode, workspaceList: scope.mode === 'list' ? scope.workspaces : [] },
        { timeoutMs: SCAN_LIMIT_MS }
      );
      setInventory({ result, scope });
      setEditingScope(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado al escanear.');
    } finally {
      setStartedAt(null);
    }
  }

  if (inventory === null || editingScope) {
    return (
      <div className="bg-accent text-foreground flex min-h-screen flex-col">
        <Home
          scopeMode={scopeMode}
          listText={listText}
          onScopeMode={setScopeMode}
          onListText={setListText}
          isScanning={isScanning}
          startedAt={startedAt}
          error={error}
          canScan={canScan}
          onScan={() => void scan({ mode: scopeMode, workspaces: workspaceList })}
          onBack={inventory ? () => setEditingScope(false) : undefined}
        />
      </div>
    );
  }

  const { result, scope } = inventory;
  const label = scopeLabel(scope);
  const rescan = () => void scan(scope);
  const shortcuts = toShortcutRows(result.rows);
  const totals = computeTotals(result);
  const shared = {
    totals,
    warnings: result.warnings,
    errors: itemErrors(result.rows),
    portalUrl,
  };

  const renderRoute = () => {
    switch (route) {
      case 'about':
        return (
          <About
            lastScan={{
              scopeLabel: label,
              scannedAt: result.scanTimestamp,
              partial: result.partial,
              totals,
            }}
          />
        );
      case 'orphans':
        return (
          <InventoryView
            {...shared}
            {...PAGES.orphans}
            rows={shortcuts.filter((s) => s.isOrphan)}
          />
        );
      case 'circular':
        return (
          <InventoryView
            {...shared}
            {...PAGES.circular}
            rows={shortcuts.filter((s) => s.isCircular)}
          />
        );
      default:
        return <InventoryView {...shared} {...PAGES.inventory} rows={shortcuts} />;
    }
  };

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      {isScanning ? (
        <div
          className="bg-primary text-primary-foreground text-200 flex items-center gap-200 px-400 py-200"
          role="status"
        >
          <span aria-hidden="true" className="h-100 w-100 animate-pulse rounded-full bg-current" />
          Escaneando workspaces en busca de shortcuts…
        </div>
      ) : null}
      {error ? (
        <div className="px-400 py-300">
          <ErrorState message={error} onRetry={rescan} />
        </div>
      ) : null}
      <AppShell
        route={route}
        onNavigate={navigate}
        scopeLabel={label}
        shortcutCount={totals.shortcuts}
        counts={{ orphans: totals.orphans, circular: totals.circular }}
        scannedAt={result.scanTimestamp}
        partial={result.partial}
        isScanning={isScanning}
        onRescan={rescan}
        onChangeScope={() => setEditingScope(true)}
      >
        {renderRoute()}
      </AppShell>
    </div>
  );
}

export default App;
