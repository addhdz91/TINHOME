import type { RouteObject } from 'react-router';

export const privacyRoutes: RouteObject[] = [
  {
    path: 'privacidad',
    lazy: async () => ({ Component: (await import('./pages/PrivacyPage')).PrivacyPage }),
  },
  {
    path: 'baja',
    lazy: async () => ({
      Component: (await import('./pages/DeleteAccountPage')).DeleteAccountPage,
    }),
  },
];
