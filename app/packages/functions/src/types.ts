/**
 * Function schema types for RayfinClient.
 *
 * AUTO-GENERATED — do not edit manually.
 * Re-generated automatically when function source files change.
 *
 * If this file is not updating automatically, run:
 *   rayfin dev functions apply
 *
 * The schema is a closed object type: only the function names listed
 * below are accepted by RayfinClient.functions.<name>.invoke(...).
 * Adding, renaming, or changing the signature of a udf.func() call
 * regenerates this file and surfaces type errors at every consumer.
 *
 * IMPORTANT: This file must NOT import any Node.js packages — it is
 * resolved by the frontend app's TypeScript compiler.
 */

export type AppFunctionsSchema = {
  scanShortcutInventory: {
    input: { scopeMode: string; workspaceList: string[] };
    output: { scanTimestamp: string; workspaceCount: number; itemCount: number; rows: ({ workspace_id: string; workspace_name: null | string; item_id: string; item_name: null | string; item_type: null | string } & { target_type: null | string; target_workspace_id: null | string; target_item_id: null | string; target_subpath: null | string; target_location: null | string; is_external: null | false | true } & { scan_timestamp: null | string; shortcut_name: null | string; shortcut_path: null | string; target_workspace_name: null | string; target_item_name: null | string; target_location_display: null | string; is_orphan: null | false | true; orphan_reason: null | string; is_circular: null | false | true; circular_path: null | string; item_sensitivity_label: null | string; item_endorsement: null | string; governance_flag: null | false | true; error: null | string })[]; warnings: string[]; partial: boolean };
  };
};
