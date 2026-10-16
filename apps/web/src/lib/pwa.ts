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

/**
 * Home photos cached by the service worker are only for signed-in people (their URLs carry a
 * download token): drop them when the session ends, so the next person on a shared device
 * cannot see them offline.
 */
export async function clearPrivateCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((key) => key.startsWith('tinhome-images-')).map((key) => caches.delete(key)),
  );
}
