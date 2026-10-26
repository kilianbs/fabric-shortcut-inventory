import { useCallback, useSyncExternalStore } from 'react';

export type AppRoute = 'inventory' | 'orphans' | 'circular' | 'about';

const ROUTE_HASHES: Record<AppRoute, string> = {
  inventory: '#/',
  orphans: '#/orphans',
  circular: '#/circular',
  about: '#/about',
};

export function routeHref(route: AppRoute): string {
  return ROUTE_HASHES[route];
}

export function parseRoute(hash: string): AppRoute {
  const path = hash.replace(/^#\/?/, '');
  return path === 'orphans' || path === 'circular' || path === 'about'
    ? path
    : 'inventory';
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
