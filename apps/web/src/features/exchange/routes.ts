import type { RouteObject } from 'react-router';

export const exchangeRoutes: RouteObject[] = [
  {
    path: 'intercambios',
    lazy: async () => ({ Component: (await import('./pages/ExchangesPage')).ExchangesPage }),
  },
  {
    path: 'intercambios/:exchangeId',
    lazy: async () => ({ Component: (await import('./pages/ExchangePage')).ExchangePage }),
  },
  {
    path: 'valorar/:exchangeId',
    lazy: async () => ({ Component: (await import('./pages/ReviewPage')).ReviewPage }),
  },
];
