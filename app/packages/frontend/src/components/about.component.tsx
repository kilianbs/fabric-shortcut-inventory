import { FolderTree, Link2, ShieldCheck, Unlink } from 'lucide-react';

import type { InventoryTotals } from '@/lib/shortcut-view';
import { formatNumber, formatTimestamp } from '@/lib/utils';

const SCOPE = [
  {
    icon: FolderTree,
    title: 'Workspaces',
    text: 'Los de la lista, o todos los que la identidad de la app puede ver.',
  },
  {
    icon: Link2,
    title: 'Shortcuts',
    text: 'Los de cada Lakehouse, KQL Database y Mirrored Database, con su destino.',
  },
  {
    icon: Unlink,
    title: 'Validaciones',
    text: 'Huérfanos (destino inexistente) y circulares (ciclos entre shortcuts).',
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
    ['Estado', lastScan.partial ? 'parcial (límite de tiempo)' : 'completo'],
    ['Escaneado', formatTimestamp(lastScan.scannedAt)],
    ['Ámbito', lastScan.scopeLabel],
    ['Workspaces', formatNumber(totals.workspaces)],
    ['Ítems revisados', formatNumber(totals.items)],
    ['Shortcuts', formatNumber(totals.shortcuts)],
    ['Huérfanos', formatNumber(totals.orphans)],
    ['Circulares', formatNumber(totals.circular)],
    ['Ítems sin leer', formatNumber(totals.errors)],
  ];

  return (
    <main className="px-500 py-500">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-500">
        <header className="animate-fade-up">
          <p className="text-100 text-primary font-semibold uppercase tracking-widest">
            Acerca de
          </p>
          <h1 className="font-heading text-hero-800 mt-100 font-semibold tracking-tight">
            Fabric Shortcut Inventory
          </h1>
          <p className="text-400 mt-200 max-w-2xl leading-500 text-muted-foreground">
            Cada escaneo recorre los workspaces del ámbito, lista los shortcuts de OneLake de sus
            ítems, resuelve los nombres de los destinos y marca los huérfanos y los circulares.
            Es la misma lógica que el notebook del repositorio, ejecutada en una Function.
          </p>
        </header>

        <section aria-label="Qué se escanea">
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
            aria-label="Identidad y limitaciones"
            className="border-border bg-card rounded-2xl border p-500 shadow-sm"
          >
            <p className="text-100 text-primary font-semibold uppercase tracking-widest">
              Identidad y limitaciones
            </p>
            <p className="text-300 mt-200 leading-400 text-muted-foreground">
              El escaneo usa la identidad de la app (el propietario del ítem Fabric App), no la
              tuya. Todos los usuarios con acceso a la app ven lo que puede ver esa identidad.
            </p>
            <ul className="text-300 mt-300 flex list-disc flex-col gap-100 pl-500 leading-400 text-muted-foreground">
              <li>
                La comprobación de governance (etiquetas de sensibilidad y endorsement) solo está
                disponible en el notebook.
              </li>
              <li>
                Con una lista de workspaces, un destino que vive fuera de la lista aparece como
                huérfano aunque exista. Para un diagnóstico fiable, escanea todos.
              </li>
              <li>Cada escaneo está limitado a unos 250 s; en tenants grandes, usa una lista.</li>
            </ul>
            <p className="text-200 mt-300 flex items-start gap-200 text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="h-300 w-300 shrink-0" />
              El inventario solo vive en esta pestaña: no se guarda ningún dato.
            </p>
          </section>

          <section
            aria-label="Último escaneo"
            className="border-border bg-card rounded-2xl border p-500 shadow-sm"
          >
            <p className="text-100 text-primary font-semibold uppercase tracking-widest">
              Último escaneo
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
