import type { RouteObject } from 'react-router';
import { devRoutes } from '@/features/dev';
import { landingRoutes } from '@/features/landing';
import { PublicLayout } from './layouts/PublicLayout';
import { NotFoundPage } from './NotFoundPage';
import { RouteErrorPage } from './RouteErrorPage';

/** 02_UX_UI_SPEC.md §2.2 — routes are added per feature, milestone by milestone. */
export function buildRoutes(): RouteObject[] {
  return [
    {
      path: '/',
      element: <PublicLayout />,
      errorElement: <RouteErrorPage />,
      children: [
        ...landingRoutes,
        // `/dev/*` only exists in development builds (dead code in production).
        ...(import.meta.env.DEV ? devRoutes : []),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
    {
      path: '/app',
      errorElement: <RouteErrorPage />,
      lazy: async () => {
        const { AppLayout } = await import('./layouts/AppLayout');
        return { Component: AppLayout };
      },
      children: [{ path: '*', element: <NotFoundPage /> }],
    },
    {
      path: '/admin',
      errorElement: <RouteErrorPage />,
      // Separate chunk: nothing from the admin area is imported by the user area.
      lazy: async () => {
        const { AdminLayout } = await import('./layouts/AdminLayout');
        return { Component: AdminLayout };
      },
      children: [{ path: '*', element: <NotFoundPage /> }],
    },
  ];
}
