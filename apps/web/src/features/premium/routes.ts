import type { RouteObject } from 'react-router';

export const premiumRoutes: RouteObject[] = [
  {
    path: 'premium',
    lazy: async () => ({ Component: (await import('./pages/PremiumPage')).PremiumPage }),
  },
  {
    path: 'premium/portal-simulado',
    lazy: async () => ({
      Component: (await import('./pages/SimulatedPortalPage')).SimulatedPortalPage,
    }),
  },
  {
    path: 'invita',
    lazy: async () => ({ Component: (await import('./pages/InvitePage')).InvitePage }),
  },
];
