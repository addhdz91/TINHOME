import type { RouteObject } from 'react-router';

export const safetyRoutes: RouteObject[] = [
  {
    path: 'mi-cuenta',
    lazy: async () => ({ Component: (await import('./pages/MyStandingPage')).MyStandingPage }),
  },
];
