import type { RouteObject } from 'react-router';

export const homeDetailRoutes: RouteObject[] = [
  {
    path: 'casa/:homeId',
    lazy: async () => ({ Component: (await import('./pages/HomeDetailPage')).HomeDetailPage }),
  },
];
