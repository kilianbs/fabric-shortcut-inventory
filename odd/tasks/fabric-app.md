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
- Assumption: governance enrichment (sempy admin scan) is not ported in v1; the Governance tab is shown as not available.

## Tasks
- [x] T1 S1,S5 branch `feat/fabric-app` + Rayfin blankapp scaffold in `app/` + functions pack · inline
- [x] T2 S3 pure inventory logic + node tests · inline · 6/6 pass (logic written before tests; no RED observed)
- [x] T3 S2,S3 `scanShortcutInventory` function · inline · tsc build OK; not invoked against Fabric yet
- [x] T4 S4 frontend inventory view · inline · validate:functions, typecheck, lint, build OK; 6/6 node + 50/50 vitest (first `npm test` run failed once, two reruns green)
- [x] T5 S5 CHANGELOG.md + app version 1.1.0 + README section · inline
- [x] T7 S6 redesign frontend in the reference style · inline · RED observed (shortcut-view module missing) → GREEN 8/8; gates OK, 6 node + 64 vitest; visual check via local preview at 1600px and 390px (Estado column moved second, KPI grid overflow on mobile fixed)
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
