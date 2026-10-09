import type { RouteObject } from 'react-router';

export const pricingRoutes: RouteObject[] = [
  {
    path: 'precios',
    lazy: async () => ({ Component: (await import('./pages/PricingPage')).PricingPage }),
  },
];
