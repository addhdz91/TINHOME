import '@fontsource-variable/inter';
import '@fontsource-variable/nunito';
import './styles/globals.css';
import './i18n';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Interactive } from './app/Interactive';
import { Providers } from './app/Providers';
import { buildRoutes } from './app/routes';
import { registerShellWorker } from './lib/pwa';
import { initSentry } from './lib/sentry';

void initSentry();
registerShellWorker();

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
else if (container.hasAttribute('data-prerender')) void hydrateAuthPage(container);
else createRoot(container).render(app);

/** First paint of the lazy routes for the current URL (the router loads them on creation). */
function routerReady(): Promise<void> {
  return new Promise((resolve) => {
    if (router.state.initialized) {
      resolve();
      return;
    }
    const unsubscribe = router.subscribe((state) => {
      if (!state.initialized) return;
      unsubscribe();
      resolve();
    });
  });
}

/**
 * NFR-02 — `/entrar` and `/registro` are prerendered signed out. Once the route modules and
 * the persisted session are known, a signed-out visitor gets the markup hydrated (nothing is
 * replaced, nothing flashes); a signed-in one gets a normal render (it is redirected anyway).
 */
async function hydrateAuthPage(root: HTMLElement) {
  const { settledAuthUser } = await import('./lib/firebase-auth');
  const [user] = await Promise.all([settledAuthUser(), routerReady()]);
  const interactive = <Interactive root={root}>{app}</Interactive>;
  if (user) {
    root.replaceChildren();
    createRoot(root).render(interactive);
  } else {
    hydrateRoot(root, interactive);
  }
}
