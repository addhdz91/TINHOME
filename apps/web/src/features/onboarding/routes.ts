import type { RouteObject } from 'react-router';

export const onboardingRoutes: RouteObject[] = [
  {
    path: 'onboarding/:paso',
    lazy: async () => ({ Component: (await import('./pages/OnboardingPage')).OnboardingPage }),
  },
];
