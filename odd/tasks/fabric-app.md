# Fabric App (Rayfin) for the shortcut inventory
Objective: second way to obtain the shortcut inventory, a Rayfin Fabric App next to the notebook.
Branch: feat/fabric-app · Delivery: single-pr · Test runner: node --test (functions logic), vitest (frontend).

## Specs
- S1 "Quiero crear una Fabric App con rayfin sobre este repositorio, de esta forma habrán dos maneras de obtener el inventario de shortcuts, mediante notebook como hasta ahora o con una Fabric App." The notebook stays unchanged; the app lives in `app/`.
- S2 Source decision (user, 2026-10-26): "Escaneo propio (Function)": the app scans live through a Rayfin Function using the app identity (`ctx.Tokens.Fabric`).
- S3 Port notebook logic: workspace scope (all/list), item discovery, shortcut extraction for Lakehouse/KQLDatabase/MirroredDatabase, target parsing, orphan detection, circular detection, target name resolution, same output columns.
- S4 UI: summary totals and tabs General, Circulares, Orphan, Governance with row colors (orphan/circular/governance).
- S5 "Hacer el desarrollo en una rama a parte y añadir archivo CHANGELOG para preparar release y version para este desarrollo"
- Assumption: governance enrichment (sempy admin scan) is not ported in v1; the Governance tab is shown as not available.

## Tasks
- [x] T1 S1,S5 branch `feat/fabric-app` + Rayfin blankapp scaffold in `app/` + functions pack · inline
- [x] T2 S3 pure inventory logic + node tests · inline · 6/6 pass (logic written before tests; no RED observed)
- [x] T3 S2,S3 `scanShortcutInventory` function · inline · tsc build OK; not invoked against Fabric yet
- [x] T4 S4 frontend inventory view · inline · validate:functions, typecheck, lint, build OK; 6/6 node + 50/50 vitest (first `npm test` run failed once, two reruns green)
- [x] T5 S5 CHANGELOG.md + app version 1.1.0 + README section · inline
- [ ] T6 deploy + typegen + live scan check · deployed to DataGym as `shortcut-inventory`, typegen done, signed-out redirect verified; signed-in live scan pending (needs the user's Entra sign-in)

## Log
- L1 2026-10-26 user: "Quiero crear una Fabric App con rayfin sobre este repositorio, de esta forma habrán dos maneras de obtener el inventario de shortcuts, mediante notebook como hasta ahora o con una Fabric App. Hacer el desarrollo en una rama a parte y añadir archivo CHANGELOG para preparar release y version para este desarrollo"
- L2 Rayfin never exposes user tokens to the browser; Functions call Fabric as the app item owner (functions/index.md). User chose live scan via Function.
- L3 Notebook defines `flag_orphans` and `detect_cycles` but never calls them; reported, not changed.
- L4 Function typegen (`types.ts`) only runs under `rayfin dev`/`dev functions apply`, which require an active deployment (`rayfin up`) → needs user approval of the target workspace.
- L5 2026-10-26 user: "en DataGym". Deployed with `rayfin up --json --workspace "DataGym" --item-name shortcut-inventory` (status success, no connectors). `rayfin dev functions apply` regenerated `types.ts`. Hosting URL https://true-cape-0be5a9d98d-westeurope.webapp.fabricapps.net shows "Sign in required" when signed out.
