import type { RouteObject } from 'react-router';

export const homeRoutes: RouteObject[] = [
  {
    path: 'mi-casa',
    lazy: async () => ({ Component: (await import('./pages/MyHomePage')).MyHomePage }),
  },
  {
    path: 'mi-casa/editar',
    lazy: async () => ({ Component: (await import('./pages/EditHomePage')).EditHomePage }),
  },
  { path: 'viaje', lazy: async () => ({ Component: (await import('./pages/TripPage')).TripPage }) },
];
