import { useState } from 'react';
import { Loader2, ScanSearch } from 'lucide-react';
import type { AppFunctionsSchema } from '@rayfin-app/functions/types';
import { getRayfinClient } from '@/lib/rayfin-client';
import { cn } from '@/lib/utils';

type ScanResult = AppFunctionsSchema['scanShortcutInventory']['output'];
type Row = ScanResult['rows'][number];

// The UDF host aborts any invocation at 250 s.
const SCAN_TIMEOUT_MS = 250_000;

const COLUMNS: (keyof Row)[] = [
  'workspace_name',
  'item_name',
  'shortcut_name',
  'shortcut_path',
  'target_type',
  'target_location_display',
  'target_workspace_name',
  'target_item_name',
  'is_orphan',
  'is_circular',
  'error',
];

const TABS = [
  { id: 'all', label: 'Vista general', filter: () => true },
  { id: 'circular', label: 'Circulares', filter: (r: Row) => !!r.is_circular },
  { id: 'orphan', label: 'Huérfanos', filter: (r: Row) => !!r.is_orphan },
  { id: 'governance', label: 'Governance', filter: (r: Row) => !!r.governance_flag },
] as const;

type TabId = (typeof TABS)[number]['id'];

function rowTone(r: Row) {
  if (r.is_orphan) return 'bg-orphan';
  if (r.is_circular) return 'bg-circular';
  if (r.governance_flag) return 'bg-governance';
  return '';
}

function formatCell(v: Row[keyof Row]) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}

export function InventoryView() {
  const [scopeMode, setScopeMode] = useState<'all' | 'list'>('list');
  const [listText, setListText] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [tab, setTab] = useState<TabId>('all');

  const workspaceList = listText
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const canScan = status !== 'loading' && (scopeMode === 'all' || workspaceList.length > 0);

  async function scan() {
    setStatus('loading');
    setError(null);
    try {
      const client = await getRayfinClient();
      const res = await client.functions.scanShortcutInventory.invoke(
        { scopeMode, workspaceList: scopeMode === 'list' ? workspaceList : [] },
        { timeoutMs: SCAN_TIMEOUT_MS },
      );
      setResult(res);
      setTab('all');
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado al escanear.');
      setStatus('error');
    }
  }

  const shortcuts = result?.rows.filter((r) => r.shortcut_name) ?? [];
  const counts = {
    total: shortcuts.length,
    orphan: shortcuts.filter((r) => r.is_orphan).length,
    circular: shortcuts.filter((r) => r.is_circular).length,
    errors: result?.rows.filter((r) => r.error).length ?? 0,
    byType: Object.entries(
      shortcuts.reduce<Record<string, number>>((acc, r) => {
        const t = r.target_type ?? 'Desconocido';
        return { ...acc, [t]: (acc[t] ?? 0) + 1 };
      }, {}),
    ),
  };
  const activeTab = TABS.find((t) => t.id === tab)!;
  const visibleRows = result?.rows.filter(activeTab.filter) ?? [];

  return (
    <main className="mx-auto flex min-h-full max-w-screen-2xl flex-col gap-600 p-600">
      <header className="flex flex-col gap-200">
        <h1 className="font-heading text-hero-800 leading-hero-800 font-semibold">Shortcut inventory</h1>
        <p className="text-300 leading-300 text-muted-foreground">
          Escanea workspaces de Fabric y detecta shortcuts de OneLake huérfanos, circulares y externos. El escaneo
          usa la identidad de la app (propietario del ítem), no la del usuario que la abre.
        </p>
      </header>

      <section aria-label="Ámbito del escaneo" className="flex flex-col gap-400 rounded-xl border p-500">
        <fieldset className="flex flex-wrap gap-500">
          <legend className="mb-200 text-300 font-semibold">Ámbito</legend>
          {(['list', 'all'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-200 text-300">
              <input
                type="radio"
                name="scope"
                value={mode}
                checked={scopeMode === mode}
                onChange={() => setScopeMode(mode)}
              />
              {mode === 'list' ? 'Lista de workspaces' : 'Todos (tenant o accesibles)'}
            </label>
          ))}
        </fieldset>
        {scopeMode === 'list' && (
          <label className="flex flex-col gap-200 text-300">
            Nombres o IDs de workspace, uno por línea o separados por comas
            <textarea
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              rows={3}
              className="rounded-lg border border-input bg-background p-300 font-monospace text-300 focus-visible:outline-2 focus-visible:outline-ring"
            />
          </label>
        )}
        <div>
          <button
            type="button"
            onClick={scan}
            disabled={!canScan}
            className="inline-flex items-center gap-200 rounded-lg bg-primary px-500 py-200 text-300 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {status === 'loading' ? (
              <Loader2 className="icon-size-200 animate-spin" aria-hidden />
            ) : (
              <ScanSearch className="icon-size-200" aria-hidden />
            )}
            {status === 'loading' ? 'Escaneando…' : 'Escanear'}
          </button>
        </div>
      </section>

      {status === 'error' && (
        <p role="alert" className="rounded-lg border border-destructive p-400 text-300 text-destructive">
          No se pudo completar el escaneo: {error}
        </p>
      )}

      {status === 'idle' && (
        <p className="text-center text-300 text-muted-foreground">Elige un ámbito y pulsa Escanear.</p>
      )}

      {status === 'done' && result && (
        <section aria-label="Resultado" className="flex flex-col gap-500">
          <dl className="grid grid-cols-2 gap-400 md:grid-cols-5">
            {[
              ['Workspaces', result.workspaceCount],
              ['Shortcuts', counts.total],
              ['Huérfanos', counts.orphan],
              ['Circulares', counts.circular],
              ['Errores de ítem', counts.errors],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-400">
                <dt className="text-200 text-muted-foreground">{label}</dt>
                <dd className="font-numeric text-hero-700 leading-hero-700">{value}</dd>
              </div>
            ))}
          </dl>
          {counts.byType.length > 0 && (
            <p className="text-300 text-muted-foreground">
              Por tipo de destino: {counts.byType.map(([t, n]) => `${t} (${n})`).join(' · ')}
            </p>
          )}
          {result.warnings.length > 0 && (
            <ul className="flex flex-col gap-100 rounded-lg bg-governance p-400 text-300">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <div role="tablist" aria-label="Vistas" className="flex flex-wrap gap-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-lg border px-400 py-200 text-300 focus-visible:outline-2 focus-visible:outline-ring',
                  tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                )}
              >
                {t.label} ({result.rows.filter(t.filter).length})
              </button>
            ))}
          </div>

          <div role="tabpanel" className="flex flex-col gap-300">
            {tab === 'governance' && (
              <p className="text-300 text-muted-foreground">
                La comprobación de governance (etiquetas de sensibilidad y endorsement) solo está disponible en el
                notebook.
              </p>
            )}
            {visibleRows.length === 0 ? (
              <p className="text-center text-300 text-muted-foreground">No hay elementos en esta vista.</p>
            ) : (
              <div className="max-h-[70vh] overflow-auto rounded-xl border">
                <table className="w-full border-collapse text-200">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      {COLUMNS.map((c) => (
                        <th key={c} scope="col" className="px-300 py-200 text-left font-semibold whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r, i) => (
                      <tr key={`${r.item_id}-${r.shortcut_path}-${r.shortcut_name}-${i}`} className={cn('border-t', rowTone(r))}>
                        {COLUMNS.map((c) => (
                          <td key={c} className="px-300 py-200 align-top">
                            {formatCell(r[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex gap-300 text-200">
            <span className="rounded-md bg-orphan px-200 py-100">huérfano</span>
            <span className="rounded-md bg-circular px-200 py-100">circular</span>
          </div>
        </section>
      )}
    </main>
  );
}
