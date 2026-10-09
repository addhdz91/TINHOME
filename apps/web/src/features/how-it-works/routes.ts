import type { RouteObject } from 'react-router';

export const howItWorksRoutes: RouteObject[] = [
  {
    path: 'como-funciona',
    lazy: async () => ({ Component: (await import('./pages/HowItWorksPage')).HowItWorksPage }),
  },
];
