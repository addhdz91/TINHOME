import './i18n';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { PublicLayout } from './app/layouts/PublicLayout';
import { ThemeProvider } from './app/ThemeProvider';
import { LandingPage } from './features/landing/pages/LandingPage';

/**
 * Build-time prerender of the landing (S-01) so the hero paints before the JavaScript runs
 * (Lighthouse M1). The data sections are lazy and render as their skeleton here; the client
 * then mounts the full app over this markup (scripts/prerender.ts).
 */
export function render(): string {
  return renderToString(
    <StrictMode>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<LandingPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </StrictMode>,
  );
}
