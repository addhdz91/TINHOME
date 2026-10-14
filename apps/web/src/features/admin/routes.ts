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
  {
    path: 'alertas',
    lazy: async () => ({ Component: (await import('./pages/AlertsPage')).AlertsPage }),
  },
  {
    path: 'denuncias',
    lazy: async () => ({ Component: (await import('./pages/ReportsPage')).ReportsPage }),
  },
  {
    path: 'denuncias/:id',
    lazy: async () => ({ Component: (await import('./pages/ReportDetailPage')).ReportDetailPage }),
  },
  {
    path: 'retenciones',
    lazy: async () => ({ Component: (await import('./pages/HoldsPage')).HoldsPage }),
  },
  {
    path: 'recursos',
    lazy: async () => ({ Component: (await import('./pages/AppealsPage')).AppealsPage }),
  },
  {
    path: 'quejas',
    lazy: async () => ({ Component: (await import('./pages/ComplaintsPage')).ComplaintsPage }),
  },
  {
    path: 'quejas/:ticketId',
    lazy: async () => ({
      Component: (await import('./pages/ComplaintDetailPage')).ComplaintDetailPage,
    }),
  },
  {
    path: 'ayuda',
    lazy: async () => ({ Component: (await import('./pages/FaqsPage')).FaqsPage }),
  },
];
