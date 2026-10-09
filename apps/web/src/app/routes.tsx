import { Navigate, type RouteObject } from 'react-router';
import { authRoutes } from '@/features/auth/routes';
import { devRoutes } from '@/features/dev/routes';
import { helpRoutes } from '@/features/help/routes';
import { howItWorksRoutes } from '@/features/how-it-works/routes';
import { landingRoutes } from '@/features/landing/routes';
import { legalRoutes } from '@/features/legal/routes';
import { onboardingRoutes } from '@/features/onboarding/routes';
import { pricingRoutes } from '@/features/pricing/routes';
import { profileRoutes } from '@/features/profile/routes';
import { waitlistRoutes } from '@/features/waitlist/routes';
import { PublicLayout } from './layouts/PublicLayout';
import { NotFoundPage } from './NotFoundPage';
import { RouteErrorPage } from './RouteErrorPage';
import { RouteFallback } from './RouteFallback';

const SECTIONS = [
  ['descubrir', 'discover'],
  ['explorar', 'explore'],
  ['me-gusta', 'likes'],
  ['chats', 'chats'],
] as const;

/**
 * 02_UX_UI_SPEC.md §2.2 — routes are added per feature, milestone by milestone. Each feature
 * keeps its route table in `routes.ts` (only lazy imports) so the entry chunk stays small.
 * The session (Firebase Auth) is only mounted for the auth pages and `/app`.
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
        ...helpRoutes,
        // `/dev/*` only exists in development builds (dead code in production).
        ...(import.meta.env.DEV ? devRoutes : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
    {
      errorElement: <RouteErrorPage />,
      hydrateFallbackElement: <RouteFallback />,
      lazy: async () => ({ Component: (await import('./auth/SessionLayout')).SessionLayout }),
      children: [
        {
          lazy: async () => ({
            Component: (await import('./layouts/AuthPagesLayout')).AuthPagesLayout,
          }),
          children: authRoutes,
        },
        {
          path: '/app',
          lazy: async () => ({ Component: (await import('./layouts/AppLayout')).AppLayout }),
          children: [
            ...onboardingRoutes,
            {
              lazy: async () => ({ Component: (await import('./layouts/AppShell')).AppShell }),
              children: [
                { index: true, element: <Navigate to="/app/descubrir" replace /> },
                ...SECTIONS.map(([path, section]) => ({
                  path,
                  lazy: async () => {
                    const { ComingSoonPage } = await import('./ComingSoonPage');
                    return { element: <ComingSoonPage section={section} /> };
                  },
                })),
                ...profileRoutes,
                { path: '*', element: <NotFoundPage /> },
              ],
            },
          ],
        },
      ],
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
