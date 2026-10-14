import type { RouteObject } from 'react-router';

export const notificationRoutes: RouteObject[] = [
  {
    path: 'avisos',
    lazy: async () => ({
      Component: (await import('./pages/NotificationsPage')).NotificationsPage,
    }),
  },
];
