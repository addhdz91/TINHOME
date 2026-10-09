import type { RouteObject } from 'react-router';

export const helpRoutes: RouteObject[] = [
  {
    path: 'ayuda',
    lazy: async () => ({ Component: (await import('./pages/HelpCenterPage')).HelpCenterPage }),
  },
  {
    path: 'ayuda/:slug',
    lazy: async () => ({ Component: (await import('./pages/FaqArticlePage')).FaqArticlePage }),
  },
];
