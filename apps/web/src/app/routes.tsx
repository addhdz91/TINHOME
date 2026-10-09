import type { RouteObject } from 'react-router';
import { devRoutes } from '@/features/dev/routes';
import { howItWorksRoutes } from '@/features/how-it-works/routes';
import { landingRoutes } from '@/features/landing/routes';
import { legalRoutes } from '@/features/legal/routes';
import { pricingRoutes } from '@/features/pricing/routes';
import { waitlistRoutes } from '@/features/waitlist/routes';
import { PublicLayout } from './layouts/PublicLayout';
import { NotFoundPage } from './NotFoundPage';
import { RouteErrorPage } from './RouteErrorPage';
import { RouteFallback } from './RouteFallback';

/**
 * 02_UX_UI_SPEC.md §2.2 — routes are added per feature, milestone by milestone. Each feature
 * keeps its route table in `routes.ts` (only lazy imports) so the entry chunk stays small.
 */
export function buildRoutes(): RouteObject[] {
  return [
    {
      path: '/',
      element: <PublicLayout />,
      errorElement: <RouteErrorPage />,
      hydrateFallbackElement: <RouteFallback />,
      children: [
        ...landingRoutes,
        ...howItWorksRoutes,
        ...pricingRoutes,
        ...waitlistRoutes,
        ...legalRoutes,
        // `/dev/*` only exists in development builds (dead code in production).
        ...(import.meta.env.DEV ? devRoutes : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
    {
      path: '/app',
      errorElement: <RouteErrorPage />,
      hydrateFallbackElement: <RouteFallback />,
      lazy: async () => {
        const { AppLayout } = await import('./layouts/AppLayout');
        return { Component: AppLayout };
      },
      children: [{ path: '*', element: <NotFoundPage /> }],
    },
    {
      path: '/admin',
      errorElement: <RouteErrorPage />,
      hydrateFallbackElement: <RouteFallback />,
      // Separate chunk: nothing from the admin area is imported by the user area.
      lazy: async () => {
        const { AdminLayout } = await import('./layouts/AdminLayout');
        return { Component: AdminLayout };
      },
      children: [{ path: '*', element: <NotFoundPage /> }],
    },
  ];
}
