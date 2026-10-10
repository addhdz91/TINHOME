import type { RouteObject } from 'react-router';

export const exploreRoutes: RouteObject[] = [
  {
    path: 'explorar',
    lazy: async () => ({ Component: (await import('./pages/ExplorePage')).ExplorePage }),
  },
];
