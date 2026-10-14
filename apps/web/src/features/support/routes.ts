import type { RouteObject } from 'react-router';

/** Public pages (PublicLayout). */
export const publicSupportRoutes: RouteObject[] = [
  {
    path: 'reclamaciones',
    lazy: async () => ({
      Component: (await import('./pages/PublicComplaintPage')).PublicComplaintPage,
    }),
  },
  {
    path: 'denunciar',
    lazy: async () => ({ Component: (await import('./pages/PublicReportPage')).PublicReportPage }),
  },
];

/** Signed-in pages (AppShell). */
export const supportRoutes: RouteObject[] = [
  {
    path: 'soporte',
    lazy: async () => ({ Component: (await import('./pages/MyComplaintsPage')).MyComplaintsPage }),
  },
  {
    path: 'soporte/nueva',
    lazy: async () => ({ Component: (await import('./pages/NewComplaintPage')).NewComplaintPage }),
  },
  {
    path: 'soporte/:ticketId',
    lazy: async () => ({
      Component: (await import('./pages/ComplaintDetailPage')).ComplaintDetailPage,
    }),
  },
];
