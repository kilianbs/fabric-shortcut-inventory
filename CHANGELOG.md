# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - Unreleased

### Added

- **Fabric App** (`app/`), built with Rayfin: a second way to get the shortcut inventory without running the notebook.
  - Live scan through the `scanShortcutInventory` Function, which calls the Fabric REST API with the app identity (the owner of the Fabric App item).
  - Scope by workspace list (name or ID) or the whole tenant (admin API, falling back to the accessible workspaces).
  - Same column schema as the notebook, with **orphan** and **circular** shortcut detection and target name resolution.
  - Interface in the style of [Fabric Schedule Inventory](https://github.com/kilianbs/fabric-schedule-inventory): a home page with the scope and scan time, side navigation (Inventory, About), summary cards, a table with search, workspace, target and status filters, sorting and paging, and a detail panel with links to the Fabric portal.
  - Scans are saved in the app database (Rayfin `data` service, `ScanRun` and `ShortcutRecord` entities): the app opens the latest saved scan and only scans again on demand. History is kept; a scan whose save is interrupted is never shown.
  - Tests for the inventory logic and the frontend (`npm test` in `app/`).

### Changed

- English is the only language of the repository: the README, the notebook and the Fabric App are in English. The Spanish README and notebook were removed and the English notebook is now `shortcut_inventory.ipynb`.
- Notebook markdown cells reorganized for readability.
- The README presents the Fabric App as the main solution, with screenshots, and the notebook as the alternative.

### Fixed

- Saving to Delta failed with `CANNOT_DETERMINE_TYPE` when a column was null in every row; the Spark DataFrame is now created with an explicit schema (booleans for `is_external`, `is_orphan`, `is_circular` and `governance_flag`, strings for the rest) and the write is skipped when there are no rows.

### Known limitations

- The governance check (sensitivity labels and endorsement) is only available in the notebook.
- Each scan is limited to ~250 s by the Functions host; when the limit is reached, the result is marked as partial.

## [1.0.0] - 2026-07-09

### Added

- `shortcut_inventory.ipynb` notebook with an inventory of OneLake shortcuts, orphan, circular and governance checks, an HTML report and optional saving to Delta.

[Unreleased]: https://github.com/kilianbs/fabric-shortcut-inventory/compare/v1.1.0...HEAD
