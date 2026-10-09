import type { RouteObject } from 'react-router';

/** Development-only routes; never registered in production builds. */
export const devRoutes: RouteObject[] = [
  {
    path: 'dev/brand',
    lazy: async () => {
      const { BrandPage } = await import('./pages/BrandPage');
      return { Component: BrandPage };
    },
  },
];
