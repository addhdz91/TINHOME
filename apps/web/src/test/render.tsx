import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AuthContext, type AuthContextValue } from '@/app/auth/auth-context';
import { ThemeProvider } from '@/app/ThemeProvider';

function testQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/** Renders inside the providers every component expects. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={testQueryClient()}>{ui}</QueryClientProvider>
    </ThemeProvider>,
  );
}

/** Renders routes in a memory router (for pages using links, params or lazy routes). */
export function renderRoutes(routes: RouteObject[], path: string): RenderResult {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={testQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

/** Renders routes with a fixed session (no Firebase), e.g. to test the guards. */
export function renderRoutesWithAuth(
  routes: RouteObject[],
  path: string,
  auth: AuthContextValue,
): RenderResult {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={testQueryClient()}>
        <AuthContext value={auth}>
          <RouterProvider router={router} />
        </AuthContext>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
