/**
 * NFR-01 — registers the shell service worker (`/sw.js`) in production builds only: the dev
 * server and the E2E runs keep working without caches in the way.
 */
export function registerShellWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}
