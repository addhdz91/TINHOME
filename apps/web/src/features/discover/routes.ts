import type { RouteObject } from 'react-router';

export const discoverRoutes: RouteObject[] = [
  {
    path: 'descubrir',
    lazy: async () => ({ Component: (await import('./pages/DiscoverPage')).DiscoverPage }),
  },
];
