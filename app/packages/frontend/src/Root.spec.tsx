import type { OpaqueSession } from '@microsoft/rayfin-auth';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Root } from './Root';
import type { AuthConfig, IAuthService } from './services/rayfin-auth.service';

vi.mock('./Welcome.activity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./Welcome.activity')>();
  return { ...actual, useSourceActivity: () => null };
});

const authenticated: OpaqueSession = {
  user: null,
  isAuthenticated: true,
  isAnonymous: false,
};

function service(config: AuthConfig = { kind: 'ready' }): IAuthService {
  return {
    config,
    canSignIn: config.kind === 'ready',
    resolveSession: vi.fn(async () => null),
    signIn: vi.fn(async () => authenticated),
  };
}

describe('protected app content with standalone sign-in', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not render the welcome while session resolution is pending', () => {
    const auth = service();
    auth.resolveSession = vi.fn(
      () => new Promise<OpaqueSession | null>(() => {})
    );
    render(<Root rayfinAuthService={auth} />);
    expect(
      screen.queryByRole('heading', { name: 'Shortcut inventory' })
    ).toBeNull();
    expect(screen.getByText('Connecting to Fabric…')).toBeVisible();
  });

  it('offers sign-in outside the portal without rendering protected content', async () => {
    render(<Root rayfinAuthService={service()} />);
    expect(
      await screen.findByRole('button', { name: 'Sign in with Microsoft' })
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Shortcut inventory' })
    ).toBeNull();
    expect(screen.queryByText(/outside Fabric/)).toBeNull();
  });

  it('renders the welcome only after a silent authenticated session resolves', async () => {
    const auth = service();
    auth.resolveSession = vi.fn(async () => authenticated);
    render(<Root rayfinAuthService={auth} />);
    expect(
      await screen.findByRole('heading', { name: 'Shortcut inventory' })
    ).toBeVisible();
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('does not treat an anonymous SDK session as an authenticated app user', async () => {
    const auth = service();
    auth.resolveSession = vi.fn(async () => ({
      ...authenticated,
      isAnonymous: true,
    }));
    render(<Root rayfinAuthService={auth} />);
    expect(
      await screen.findByRole('button', { name: 'Sign in with Microsoft' })
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Shortcut inventory' })
    ).toBeNull();
  });

  it('recovers from failed local automatic sign-in through a user gesture', async () => {
    const auth = service();
    auth.resolveSession = vi.fn(async () => {
      throw new Error('Local sign-in unavailable.');
    });
    render(<Root rayfinAuthService={auth} />);
    const button = await screen.findByRole('button', {
      name: 'Try Sign in with Microsoft',
    });
    expect(
      screen.queryByRole('heading', { name: 'Shortcut inventory' })
    ).toBeNull();
    await act(async () => fireEvent.click(button));
    expect(auth.signIn).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('heading', { name: 'Shortcut inventory' })
    ).toBeVisible();
  });

  it('keeps content protected after interactive sign-in fails', async () => {
    const auth = service();
    auth.signIn = vi.fn(async () => {
      throw new Error('Sign-in was cancelled.');
    });
    render(<Root rayfinAuthService={auth} />);
    const button = await screen.findByRole('button', {
      name: 'Sign in with Microsoft',
    });
    await act(async () => fireEvent.click(button));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign-in was cancelled.'
    );
    expect(
      screen.queryByRole('heading', { name: 'Shortcut inventory' })
    ).toBeNull();
  });

  it('removes protected content when the authenticated session ends', async () => {
    const auth = service();
    auth.resolveSession = vi.fn(async () => authenticated);
    let notify: ((session: OpaqueSession | null) => void) | undefined;
    const unsubscribe = vi.fn();
    auth.onSessionChange = vi.fn((listener) => {
      notify = listener;
      return unsubscribe;
    });
    render(<Root rayfinAuthService={auth} />);
    expect(
      await screen.findByRole('heading', { name: 'Shortcut inventory' })
    ).toBeVisible();
    await act(async () => notify?.(null));
    expect(
      await screen.findByRole('button', { name: 'Sign in with Microsoft' })
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Shortcut inventory' })
    ).toBeNull();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it.each<AuthConfig>([
    { kind: 'not-deployed' },
    { kind: 'incomplete', missing: ['publishableKey'] },
    { kind: 'config-error', message: 'Runtime configuration is unavailable.' },
  ])('fails closed for $kind configuration', async (config) => {
    await act(async () => render(<Root rayfinAuthService={service(config)} />));
    expect(
      screen.queryByRole('heading', { name: 'Shortcut inventory' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Sign in with Microsoft' })
    ).toBeNull();
  });
});
