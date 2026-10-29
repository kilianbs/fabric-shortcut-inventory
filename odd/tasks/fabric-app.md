# Fabric App (Rayfin) for the shortcut inventory
Objective: second way to obtain the shortcut inventory, a Rayfin Fabric App next to the notebook.
Branch: feat/fabric-app · Delivery: single-pr · Test runner: node --test (functions logic), vitest (frontend).

## Specs
- S1 "Quiero crear una Fabric App con rayfin sobre este repositorio, de esta forma habrán dos maneras de obtener el inventario de shortcuts, mediante notebook como hasta ahora o con una Fabric App." The notebook stays unchanged; the app lives in `app/`.
- S2 Source decision (user, 2026-10-26): "Escaneo propio (Function)": the app scans live through a Rayfin Function using the app identity (`ctx.Tokens.Fabric`).
- S3 Port notebook logic: workspace scope (all/list), item discovery, shortcut extraction for Lakehouse/KQLDatabase/MirroredDatabase, target parsing, orphan detection, circular detection, target name resolution, same output columns.
- S4 UI: summary totals and tabs General, Circulares, Orphan, Governance with row colors (orphan/circular/governance).
- S5 "Hacer el desarrollo en una rama a parte y añadir archivo CHANGELOG para preparar release y version para este desarrollo"
- S6 "Quiero que el diseño de la app sea del estilo de esta https://github.com/kilianbs/fabric-schedule-inventory": app shell with sidebar (Explorar/Sistema), breadcrumb top bar with the primary action, home with hero and scope card, KPI tiles, searchable/filterable sortable table with pager and a detail panel, About page, Fabric item icons.
- S7 "La app debe de persistir los datos y no hacer el escaneo cada vez": each scan is saved in the Rayfin data service (ScanRun + ShortcutRecord, MSSQL); on open the app shows the latest complete saved scan and only scans again when the user asks. Assumptions: history is kept (no deletes), saved scans are shared by every app user (the scan already runs as the app identity).
- S8 "Antes quiero que solo te quedes con la versión en inglés, que será la única y el idioma global del repositorio. La app también tiene que estar en inglés": only the English README and notebook remain (as `README.md` and `shortcut_inventory.ipynb`), the CHANGELOG is in English, and all app UI copy is English. Verbatim user quotes in this document stay as written.
- S9 "La tabla de shortcuts, el filtro de Target aparece el recuadro debajo del apartado de Shorcut detail, debe solapar por encima. Además, quiero que añadas un filtro de Status a la tabla y quites las secciones de Orphans y Circular": the filter popovers (Target and the others) overlap the Shortcut detail panel; the table gets a Status filter (Orphan, Circular, External, No flags); the Orphans and Circular pages and their nav entries are removed (old `#/orphans` and `#/circular` links open the inventory).
- S10 "Te paso estas imágenes y las añades a assets y las pones en el README. Además, la Fabric App que pase a la  solución principal y el notebook como alternativa.": four app screenshots in `assets/` (home, inventory, shortcut detail, about) shown in the README; the README leads with the Fabric App and moves the notebook to an "Alternative: notebook" section.
- Assumption: governance enrichment (sempy admin scan) is not ported in v1; the Governance tab is shown as not available.

## Tasks
- [x] T1 S1,S5 branch `feat/fabric-app` + Rayfin blankapp scaffold in `app/` + functions pack · inline
- [x] T2 S3 pure inventory logic + node tests · inline · 6/6 pass (logic written before tests; no RED observed)
- [x] T3 S2,S3 `scanShortcutInventory` function · inline · tsc build OK; not invoked against Fabric yet
- [x] T4 S4 frontend inventory view · inline · validate:functions, typecheck, lint, build OK; 6/6 node + 50/50 vitest (first `npm test` run failed once, two reruns green)
- [x] T5 S5 CHANGELOG.md + app version 1.1.0 + README section · inline
- [x] T7 S6 redesign frontend in the reference style · inline · RED observed (shortcut-view module missing) → GREEN 8/8; gates OK, 6 node + 64 vitest; visual check via local preview at 1600px and 390px (Estado column moved second, KPI grid overflow on mobile fixed)
- [x] T8 S7 persist scans in Rayfin data and load the latest on open · inline · RED observed (scan-store module missing) → GREEN 7/7; typecheck, lint, build OK; 6 node + 75 vitest; deployed and checked by the user
- [x] T9 S8 English-only repository and app · inline · 75 vitest green after updating App.spec assertions
- [x] T10 S9 popover above detail, Status filter, Orphans/Circular pages removed · inline · RED observed (5 new tests failing) → GREEN; typecheck, lint, build OK; 81 vitest; popover overlap not checkable in jsdom (no layout), visual check pending after deploy
- [x] T11 S10 README reorganized around the Fabric App + screenshots · inline · passive docs (no runnable RED); structural check: every relative README link resolves
- [ ] T6 deploy + typegen + live scan check · deployed to DataGym as `shortcut-inventory`, typegen done, signed-out redirect verified; signed-in live scan pending (needs the user's Entra sign-in)

## Log
- L1 2026-10-26 user: "Quiero crear una Fabric App con rayfin sobre este repositorio, de esta forma habrán dos maneras de obtener el inventario de shortcuts, mediante notebook como hasta ahora o con una Fabric App. Hacer el desarrollo en una rama a parte y añadir archivo CHANGELOG para preparar release y version para este desarrollo"
- L2 Rayfin never exposes user tokens to the browser; Functions call Fabric as the app item owner (functions/index.md). User chose live scan via Function.
- L3 Notebook defines `flag_orphans` and `detect_cycles` but never calls them; reported, not changed.
- L4 Function typegen (`types.ts`) only runs under `rayfin dev`/`dev functions apply`, which require an active deployment (`rayfin up`) → needs user approval of the target workspace.
- L5 2026-10-26 user: "en DataGym". Deployed with `rayfin up --json --workspace "DataGym" --item-name shortcut-inventory` (status success, no connectors). `rayfin dev functions apply` regenerated `types.ts`. Hosting URL https://true-cape-0be5a9d98d-westeurope.webapp.fabricapps.net shows "Sign in required" when signed out.
- L6 2026-10-26 user: "Arregla la documentación, tanto el readme en inglés como registrar los cambios en el changelog que faltan" → a8ef3a0.
- L7 2026-10-26 user: "Quiero que el diseño de la app sea del estilo de esta https://github.com/kilianbs/fabric-schedule-inventory"
- L8 Design decisions: UI copy stays in Spanish; S4 Governance tab becomes a note in Acerca de (an always-empty page adds nothing); no live progress percentage exists for a single Function call, so the home shows elapsed time against the ~250 s limit instead of fake steps; adds @fabric-msft/svg-icons 8.2.0 (same as the reference) for the Fabric logo and item icons.
- L9 Redesign verified in a temporary local preview with sample data (not committed); deployed app not yet updated with the redesign.
- L10 2026-10-29 user: "La app debe de persistir los datos y no hacer el escaneo cada vez"
- L11 Design: data-modeling pack (mssql). The browser saves after the Function returns (the Function has no time left within the 250 s host limit; the client has no bulk create, so rows are created one by one with bounded concurrency). A ScanRun is created with complete=false and flipped to true after every row is saved, so an interrupted save is never shown. No delete permission: history is kept.
- L12 T8 done locally. Pending: `rayfin up` must provision the SQL Database and apply the ScanRun/ShortcutRecord schema; no offline schema validation exists in the CLI.
- L13 2026-10-29 user: "todo ok" (deployed with the data service, persistence works) → committed.
- L14 2026-10-29 user: "Antes quiero que solo te quedes con la versión en inglés, que será la única y el idioma global del repositorio. La app también tiene que estar en inglés"
- L15 Supersedes L8 "UI copy stays in Spanish". The two notebooks had identical code except the report tab labels, so the Spanish one was dropped without losing logic. Pending: `assets/report-preview.png` still shows Spanish tab labels ("Vista General", "Circulares") and needs a new screenshot from a notebook run.
- L16 2026-10-29 user: "Queda un texto en español en la tarjeta de Shortcuts. Aparece el texto almacenamiento externo" → fixed in 002c8fa.
- L17 2026-10-29 user: "Antes de volver ad esplegar quiero que corrijas unas cosas: La tabla de shortcuts, el filtro de Target aparece el recuadro debajo del apartado de Shorcut detail, debe solapar por encima. Además, quiero que añadas un filtro de Status a la tabla y quites las secciones de Orphans y Circular"
- L18 Cause of the overlap: the `animate-fade-up` entrance animation (fill-mode both) leaves a transform on the table card, so it is its own stacking context and the popover z-30 cannot rise above the later detail panel (which also animates). Fix: `relative z-10` on the table card. While there, translated the leftover Spanish strings in the filter menu search ("Buscar", "Sin coincidencias.") and in the mobile sort toggle and nav labels.
- L19 2026-10-29 user (deployed ccf3bf8, sent screenshots): "Te paso estas imágenes y las añades a assets y las pones en el README. Además, la Fabric App que pase a la  solución principal y el notebook como alternativa."
- L20 Kept the user's own `assets/hero.svg` banner (uncommitted README change) and committed it with T11. The deployed screenshots show the status filter and the nav with only Inventory and About.
