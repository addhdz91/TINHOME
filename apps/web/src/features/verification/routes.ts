import type { RouteObject } from 'react-router';

export const verificationRoutes: RouteObject[] = [
  {
    path: 'verificacion',
    lazy: async () => ({
      Component: (await import('./pages/VerificationPage')).VerificationPage,
    }),
  },
  {
    path: 'verificacion/ubicacion',
    lazy: async () => ({ Component: (await import('./pages/LocationPage')).LocationPage }),
  },
];
