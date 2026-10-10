import type { RouteObject } from 'react-router';

export const matchRoutes: RouteObject[] = [
  {
    path: 'bloqueados',
    lazy: async () => ({ Component: (await import('./pages/BlockedPage')).BlockedPage }),
  },
];
