//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import type { InventoryRow, ScanResult } from '@/lib/shortcut-view';

const invoke = vi.fn();

vi.mock('@/lib/rayfin-client', () => ({
  getRayfinClient: async () => ({
    runtimeConfig: { portalUrl: 'https://app.fabric.microsoft.com' },
    functions: { scanShortcutInventory: { invoke } },
  }),
}));

import App from '@/App';

const WS = '3adb0ff0-0f5a-40ab-830b-ce1fc6e4882c';

function row(overrides: Partial<InventoryRow>): InventoryRow {
  return {
    workspace_id: WS,
    workspace_name: 'DataGym',
    item_id: '27dd506d-2d8d-4fd0-a77e-d345520f0c00',
    item_name: 'lh_bronze',
    item_type: 'Lakehouse',
    target_type: 'OneLake',
    target_workspace_id: WS,
    target_item_id: 'i2',
    target_subpath: 'Tables/orders',
    target_location: null,
    is_external: false,
    scan_timestamp: '2026-10-26T20:00:00Z',
    shortcut_name: 'orders',
    shortcut_path: 'Tables',
    target_workspace_name: 'DataGym',
    target_item_name: 'lh_silver',
    target_location_display: 'onelake://DataGym/lh_silver/Tables/orders',
    is_orphan: false,
    orphan_reason: null,
    is_circular: false,
    circular_path: null,
    item_sensitivity_label: null,
    item_endorsement: null,
    governance_flag: null,
    error: null,
    ...overrides,
  };
}

const result: ScanResult = {
  scanTimestamp: '2026-10-26T20:00:00Z',
  workspaceCount: 1,
  itemCount: 2,
  rows: [
    row({}),
    row({
      shortcut_name: 'ghost',
      is_orphan: true,
      orphan_reason: 'Target item not found in scanned scope',
    }),
  ],
  warnings: [],
  partial: false,
};

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '';
    invoke.mockResolvedValue(result);
  });
  afterEach(() => invoke.mockReset());

  it('starts on the home with the scan disabled until a workspace is given', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Fabric Shortcut Inventory' })).toBeVisible();
    const scanButton = screen.getByRole('button', { name: 'Escanear shortcuts' });
    expect(scanButton).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DataGym' } });
    expect(scanButton).toBeEnabled();
  });

  it('scans the given workspaces and shows the inventory, orphans page and detail', async () => {
    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DataGym, Core' } });
    fireEvent.click(screen.getByRole('button', { name: 'Escanear shortcuts' }));

    expect(
      await screen.findByRole('heading', { name: 'Shortcuts de OneLake' })
    ).toBeVisible();
    expect(invoke).toHaveBeenCalledWith(
      { scopeMode: 'list', workspaceList: ['DataGym', 'Core'] },
      { timeoutMs: 250_000 }
    );
    expect(screen.getByText('DataGym, Core')).toBeVisible();

    fireEvent.click(screen.getByRole('link', { name: /Huérfanos/ }));
    expect(
      await screen.findByRole('heading', { name: 'Shortcuts huérfanos' })
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'orders' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ghost' }));
    const detail = screen.getByRole('region', { name: 'Detalle del shortcut' });
    expect(within(detail).getByText('Target item not found in scanned scope')).toBeVisible();
    expect(within(detail).getByRole('link', { name: /Abrir lh_bronze en Fabric/ })).toHaveAttribute(
      'href',
      `https://app.fabric.microsoft.com/groups/${WS}/lakehouses/27dd506d-2d8d-4fd0-a77e-d345520f0c00`
    );
  });

  it('rescans with the scope of the last result', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'Todos los accesibles' }));
    fireEvent.click(screen.getByRole('button', { name: 'Escanear shortcuts' }));
    await screen.findByRole('heading', { name: 'Shortcuts de OneLake' });

    fireEvent.click(screen.getByRole('button', { name: 'Escanear de nuevo' }));
    expect(invoke).toHaveBeenLastCalledWith(
      { scopeMode: 'all', workspaceList: [] },
      { timeoutMs: 250_000 }
    );
  });

  it('shows the error and stays on the home when the scan fails', async () => {
    invoke.mockRejectedValueOnce(new Error('HTTP 401'));
    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DataGym' } });
    fireEvent.click(screen.getByRole('button', { name: 'Escanear shortcuts' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 401');
    expect(screen.getByRole('button', { name: 'Escanear shortcuts' })).toBeEnabled();
  });
});
