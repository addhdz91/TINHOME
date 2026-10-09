import type { RouteObject } from 'react-router';

export const legalRoutes: RouteObject[] = [
  {
    path: 'legal/:slug',
    lazy: async () => ({ Component: (await import('./pages/LegalPage')).LegalPage }),
  },
];
