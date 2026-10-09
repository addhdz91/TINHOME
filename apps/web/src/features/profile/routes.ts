import type { RouteObject } from 'react-router';

export const profileRoutes: RouteObject[] = [
  {
    path: 'perfil',
    lazy: async () => ({ Component: (await import('./pages/ProfilePage')).ProfilePage }),
  },
];
