import './i18n';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { PublicLayout } from './app/layouts/PublicLayout';
import { Providers } from './app/Providers';
import { LandingPage } from './features/landing/pages/LandingPage';

/**
 * Build-time prerender of the landing (S-01) so the hero paints before the JavaScript runs
 * (Lighthouse M1). The data sections are lazy and render as their skeleton here; the client
 * hydrates this markup (main.tsx) with the same providers, so the DOM is reused.
 */
export function render(): string {
  // A data router (no loaders, no lazy routes) is ready synchronously and supports useNavigation.
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <PublicLayout />,
        children: [{ index: true, element: <LandingPage /> }],
      },
    ],
    { initialEntries: ['/'] },
  );
  return renderToString(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
}
