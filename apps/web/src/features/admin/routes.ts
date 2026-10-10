import type { RouteObject } from 'react-router';

export const adminRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => ({ Component: (await import('./pages/AdminHomePage')).AdminHomePage }),
  },
  {
    path: 'verificaciones',
    lazy: async () => ({
      Component: (await import('./pages/VerificationsPage')).VerificationsPage,
    }),
  },
  {
    path: 'verificaciones/:id',
    lazy: async () => ({
      Component: (await import('./pages/VerificationDetailPage')).VerificationDetailPage,
    }),
  },
  {
    path: 'ubicaciones',
    lazy: async () => ({
      Component: (await import('./pages/LocationReviewsPage')).LocationReviewsPage,
    }),
  },
];
