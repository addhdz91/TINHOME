import '@fontsource-variable/inter';
import '@fontsource-variable/nunito';
import './styles/globals.css';
import './i18n';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Providers } from './app/Providers';
import { buildRoutes } from './app/routes';
import { initSentry } from './lib/sentry';

void initSentry();

const router = createBrowserRouter(buildRoutes());

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

const app = (
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>
);

// `/` is prerendered at build time (scripts/prerender.ts): hydrate it so the painted hero is kept.
if (window.location.pathname === '/' && container.hasChildNodes()) hydrateRoot(container, app);
else createRoot(container).render(app);
