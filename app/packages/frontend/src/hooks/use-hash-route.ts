import { useCallback, useSyncExternalStore } from 'react';

export type AppRoute = 'inventory' | 'about';

const ROUTE_HASHES: Record<AppRoute, string> = {
  inventory: '#/',
  about: '#/about',
};

export function routeHref(route: AppRoute): string {
  return ROUTE_HASHES[route];
}

export function parseRoute(hash: string): AppRoute {
  const path = hash.replace(/^#\/?/, '');
  // Unknown paths (including the removed #/orphans and #/circular) open the inventory.
  return path === 'about' ? 'about' : 'inventory';
}

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

/** Hash-based routing: static hosting has no server fallback for deep paths. */
export function useHashRoute(): [AppRoute, (route: AppRoute) => void] {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => ''
  );
  const navigate = useCallback((route: AppRoute) => {
    window.location.hash = routeHref(route);
  }, []);
  return [parseRoute(hash), navigate];
}
