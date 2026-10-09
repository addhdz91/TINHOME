import type { RouteObject } from 'react-router';

export const waitlistRoutes: RouteObject[] = [
  {
    path: 'lista-espera',
    lazy: async () => ({ Component: (await import('./pages/WaitlistPage')).WaitlistPage }),
  },
  {
    path: 'lista-espera/confirmar',
    lazy: async () => ({
      Component: (await import('./pages/WaitlistConfirmPage')).WaitlistConfirmPage,
    }),
  },
];
