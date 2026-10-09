import type { RouteObject } from 'react-router';

export const landingRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const { LandingPage } = await import('./pages/LandingPage');
      return { Component: LandingPage };
    },
  },
];
