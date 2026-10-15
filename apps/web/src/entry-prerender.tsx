import './i18n';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AuthContext, type AuthContextValue } from './app/auth/auth-context';
import { AuthPagesLayout } from './app/layouts/AuthPagesLayout';
import { PublicLayout } from './app/layouts/PublicLayout';
import { Providers } from './app/Providers';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { SignInPage } from './features/auth/pages/SignInPage';
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

/** Signed-out session: what a first visit to the sign-in and sign-up pages shows. */
const signedOut: AuthContextValue = {
  state: { status: 'signedOut' },
  refreshMe: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
};

export const AUTH_PAGES = ['/entrar', '/registro'] as const;
export type AuthPagePath = (typeof AUTH_PAGES)[number];

/**
 * NFR-02 — `/entrar` and `/registro` signed out, prerendered with the same tree the client
 * renders first (Providers → session → AuthPagesLayout → page), so main.tsx can hydrate the
 * markup instead of replacing it.
 */
export function renderAuthPage(path: AuthPagePath): string {
  const router = createMemoryRouter(
    [
      {
        element: <AuthPagesLayout />,
        children: [
          { path: '/entrar', element: <SignInPage /> },
          { path: '/registro', element: <RegisterPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return renderToString(
    <StrictMode>
      <Providers>
        <AuthContext value={signedOut}>
          <RouterProvider router={router} />
        </AuthContext>
      </Providers>
    </StrictMode>,
  );
}
