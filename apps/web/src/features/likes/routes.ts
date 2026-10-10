import type { RouteObject } from 'react-router';

export const likesRoutes: RouteObject[] = [
  {
    path: 'me-gusta',
    lazy: async () => ({
      Component: (await import('./pages/LikesReceivedPage')).LikesReceivedPage,
    }),
  },
];
