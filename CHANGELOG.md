# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [1.1.0] - Sin publicar

### Añadido

- **Fabric App** (`app/`), construida con Rayfin: una segunda forma de obtener el inventario de shortcuts sin necesidad de ejecutar el notebook.
  - Escaneo en vivo mediante la Function `scanShortcutInventory`, que llama a la API REST de Fabric con la identidad de la app (el propietario del ítem Fabric App).
  - Ámbito por lista de workspaces (nombre o ID) o de todo el tenant (API de admin, con *fallback* a los workspaces accesibles).
  - Mismo esquema de columnas que el notebook, con detección de shortcuts **huérfanos** y **circulares** y resolución de nombres de destino.
  - Interfaz con el estilo de [Fabric Schedule Inventory](https://github.com/kilianbs/fabric-schedule-inventory): página de inicio con el ámbito y el tiempo de escaneo, navegación lateral (Inventario, Huérfanos, Circulares, Acerca de), tarjetas de resumen, tabla con búsqueda, filtros, orden y paginación, y panel de detalle con enlaces al portal de Fabric.
  - Persistencia de los escaneos en la base de datos de la app (servicio `data` de Rayfin, entidades `ScanRun` y `ShortcutRecord`): al abrir la app se carga el último escaneo guardado y solo se vuelve a escanear a petición. Se conserva el historial; un escaneo cuyo guardado se interrumpe nunca se muestra.
  - Tests de la lógica de inventario (`npm test` en `app/`).
- Documentación en inglés (`README_EN.md`) y notebook localizado (`shortcut_inventory_en.ipynb`), con enlace desde el README en español.

### Cambiado

- Celdas markdown del notebook reorganizadas para mejorar la legibilidad.

### Corregido

- El guardado en Delta fallaba con `CANNOT_DETERMINE_TYPE` cuando una columna era nula en todas las filas; ahora el DataFrame de Spark se crea con un esquema explícito (booleanos para `is_external`, `is_orphan`, `is_circular` y `governance_flag`, texto para el resto) y se omite la escritura si no hay filas.

### Limitaciones conocidas

- La comprobación de governance (etiquetas de sensibilidad y endorsement) solo está disponible en el notebook.
- Cada escaneo está limitado a ~250 s por el host de Functions; si se alcanza el límite, el resultado se marca como parcial.

## [1.0.0] - 2026-07-09

### Añadido

- Notebook `shortcut_inventory.ipynb` con inventario de shortcuts de OneLake, validaciones de huérfanos, circulares y governance, informe HTML y guardado opcional en Delta.

[Unreleased]: https://github.com/kilianbs/fabric-shortcut-inventory/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/kilianbs/fabric-shortcut-inventory/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kilianbs/fabric-shortcut-inventory/releases/tag/v1.0.0
