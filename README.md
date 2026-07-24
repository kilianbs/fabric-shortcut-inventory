# Fabric Shortcut Inventory

> 🌐 Read this in [English](README_EN.md).

Notebook de Microsoft Fabric que escanea workspaces y construye un **inventario completo de los shortcuts de OneLake**, detectando shortcuts **huérfanos**, **circulares** y **externos sin governance**, con un informe HTML interactivo y guardado opcional en tabla Delta.

![Vista general del informe HTML](assets/report-preview.png)

## ¿Por qué?

Los shortcuts de OneLake son fáciles de crear y difíciles de gobernar: con el tiempo se acumulan shortcuts que apuntan a ítems borrados, cadenas circulares entre lakehouses y conexiones a almacenamiento externo (S3, ADLS, GCS…) sin ninguna etiqueta de sensibilidad ni endorsement. Fabric no ofrece una vista centralizada de todo esto. Este notebook la construye en una sola ejecución.

## Qué hace

1. **Descubre workspaces** — todo el tenant (con permisos de admin) o una lista concreta, por nombre o ID.
2. **Descubre ítems** — lista los ítems de cada workspace vía la [API REST de Fabric](https://learn.microsoft.com/rest/api/fabric/).
3. **Extrae shortcuts** — en paralelo, de los tipos de ítem que los soportan (Lakehouse, KQL Database, Mirrored Database).
4. **Parsea destinos** — normaliza destinos OneLake (workspace/ítem/ruta) y externos (Amazon S3, ADLS Gen2, Google Cloud Storage, S3 compatible, Dataverse, Azure Blob Storage, OneDrive/SharePoint).
5. **Valida**:
   - **Huérfanos**: el ítem de destino ya no existe en el ámbito escaneado.
   - **Circulares**: cadenas de shortcuts que forman un ciclo (detección por DFS sobre el grafo de dependencias).
   - **Governance**: shortcuts externos en ítems sin etiqueta de sensibilidad ni endorsement (`Certified`/`Promoted`).
6. **Resuelve nombres** — convierte los GUIDs de destino en nombres legibles, incluso para destinos fuera del ámbito escaneado.
7. **Presenta** — informe HTML interactivo con 4 vistas (General, Circulares, Orphan, Governance) y código de colores por fila.
8. **Persiste (opcional)** — escribe el inventario en una tabla Delta para consultarlo con SQL o montar informes de Power BI.

## Requisitos

- Un **notebook de Microsoft Fabric** (usa `notebookutils`, `sempy` y `displayHTML`; no funciona fuera de Fabric sin adaptación).
- Permisos: como mínimo rol de **Viewer** en los workspaces a escanear.
  - `SCOPE_MODE = "all"` con cobertura de tenant completo → requiere **administrador de Fabric**.
  - `GOVERNANCE_CHECK = True` → requiere admin (usa el *admin scan* de `sempy`); si no hay permisos, degrada sin fallar.
- Para `AUTH_MODE = "sp"`: un service principal con acceso a la API de Fabric y su secreto guardado en **Azure Key Vault**.

## Uso

1. Importa `shortcut_inventory.ipynb` en un workspace de Fabric.
2. Ajusta la celda de **parámetros** (ver tabla siguiente).
3. Ejecuta todas las celdas en orden. El informe HTML aparece al final.

## Parámetros

| Parámetro | Valores | Descripción |
|---|---|---|
| `SCOPE_MODE` | `"all"` \| `"list"` | `"all"` escanea todo el tenant (o los workspaces accesibles si no eres admin). `"list"` limita a `WORKSPACE_LIST`. |
| `WORKSPACE_LIST` | lista de `str` | Nombres o IDs de workspaces. Solo con `SCOPE_MODE = "list"`. |
| `RESOLVE_NAMES` | bool | Permite usar nombres visibles (además de GUIDs) en `WORKSPACE_LIST`. |
| `AUTH_MODE` | `"user"` \| `"sp"` | `"user"`: token delegado del usuario del notebook. `"sp"`: service principal (recomendado para ejecuciones programadas). |
| `SP_TENANT_ID` | GUID | Tenant de Entra ID (solo `"sp"`). |
| `SP_CLIENT_ID` | GUID | Client ID de la app registration (solo `"sp"`). |
| `SP_KEYVAULT` | URL | Key Vault donde vive el secreto del SP — el secreto nunca se escribe en el notebook. |
| `SP_SECRET_NAME` | `str` | Nombre del secreto en el Key Vault. |
| `GOVERNANCE_CHECK` | bool | Enriquece con sensibilidad/endorsement y calcula `governance_flag`. |
| `SAVE_TO_DELTA` | bool | Guarda el resultado en una tabla Delta (modo overwrite). |
| `DELTA_TABLE` | `str` | Nombre de la tabla Delta destino. |
| `MAX_WORKERS` | int | Hilos en paralelo para la API de shortcuts. Bájalo si ves throttling (429). |

## Esquema de salida

Cada fila del inventario es un shortcut (o un error de extracción por ítem):

| Columna | Descripción |
|---|---|
| `scan_timestamp` | Momento del escaneo (UTC, ISO 8601). |
| `workspace_id` / `workspace_name` | Workspace que contiene el shortcut. |
| `item_id` / `item_name` / `item_type` | Ítem (lakehouse, etc.) que contiene el shortcut. |
| `shortcut_name` / `shortcut_path` | Nombre y ruta del shortcut dentro del ítem. |
| `target_type` | `OneLake` o el tipo de almacenamiento externo. |
| `target_workspace_id` / `target_workspace_name` | Workspace de destino (solo OneLake). |
| `target_item_id` / `target_item_name` | Ítem de destino (solo OneLake). |
| `target_subpath` | Subruta dentro del destino. |
| `target_location` / `target_location_display` | URI del destino (con GUIDs / con nombres legibles). |
| `is_external` | `True` si apunta a almacenamiento externo a OneLake. |
| `is_orphan` / `orphan_reason` | Destino inexistente en el ámbito escaneado y motivo. |
| `is_circular` / `circular_path` | Arista que participa en un ciclo de shortcuts. |
| `item_sensitivity_label` / `item_endorsement` | Metadatos de governance del ítem contenedor. |
| `governance_flag` | Shortcut externo sin sensibilidad ni endorsement. |
| `error` | Error de la API al extraer los shortcuts del ítem, si lo hubo. |

## Informe HTML

El informe se renderiza dentro del propio notebook, sin dependencias externas:

- **Resumen** con totales (shortcuts, huérfanos, circulares, flags de governance) y desglose por tipo de destino.
- **Pestañas**: Vista General, Circulares, Orphan y Governance, cada una con su contador.
- **Colores por fila**: 🟥 huérfano · 🟧 circular · 🟨 flag de governance.

![Vista general del informe HTML](assets/report-preview.png)

## Limitaciones conocidas

- Solo **Lakehouse**, **KQLDatabase** y **MirroredDatabase** exponen el endpoint de shortcuts; otros tipos de ítem se omiten.
- La detección de huérfanos se evalúa **contra el ámbito escaneado**: con `SCOPE_MODE = "list"`, un destino que vive en un workspace fuera de la lista aparecerá como huérfano aunque exista. Para un diagnóstico fiable, escanea con `"all"`.
- El enriquecimiento de governance depende del *admin scan* de `sempy` y de permisos de administrador; sin ellos, las columnas quedan vacías.
- El guardado en Delta usa modo `overwrite`; cambia a `append` en la última celda si quieres conservar histórico.

## Licencia

[MIT](LICENSE) — libre para usar, modificar y redistribuir con atribución.
