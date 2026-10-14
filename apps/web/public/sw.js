/* NFR-01 — PWA shell service worker (scope `/`). Web push lives in its own worker
 * (`firebase-messaging-sw.js`, scope `/firebase-cloud-messaging-push-scope`).
 *
 * - Navigations: network first; offline → the cached SPA shell (`/app.html`), `/` → `/index.html`.
 * - `/assets/*` (hashed, immutable): cache first.
 * - Public home photos and avatars from Firebase Storage: cache first, at most 120 entries.
 * - Never cached: other origins, non-GET, `/r/*` (sponsored redirect), `/__/*` (Firebase), API
 *   calls, identity documents or any signed URL.
 */
const VERSION = 'v1';
const SHELL = `tinhome-shell-${VERSION}`;
const ASSETS = `tinhome-assets-${VERSION}`;
const IMAGES = `tinhome-images-${VERSION}`;
const MAX_IMAGES = 120;
const SHELL_URLS = ['/app.html', '/index.html', '/site.webmanifest', '/icons/icon-192.png'];

async function precache() {
  const shell = await caches.open(SHELL);
  await shell.addAll(SHELL_URLS);
  // The entry chunk and its preloads, so the shell boots offline from the first install.
  const html = await (await shell.match('/app.html')).text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  const cache = await caches.open(ASSETS);
  await cache.addAll([...new Set(assets)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL, ASSETS, IMAGES]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isPublicPhoto(url) {
  return (
    url.hostname === 'firebasestorage.googleapis.com' &&
    /\/o\/(homes|avatars)%2F/.test(url.pathname) &&
    !url.pathname.includes('%2Fraw%2F')
  );
}

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_IMAGES)).map((key) => cache.delete(key)));
}

async function cacheFirst(request, name, limit) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (limit) await trim(cache);
  }
  return response;
}

async function navigation(request, url) {
  try {
    return await fetch(request);
  } catch {
    const shell = await caches.open(SHELL);
    return (await shell.match(url.pathname === '/' ? '/index.html' : '/app.html')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/r/') || url.pathname.startsWith('/__/')) return;
    if (request.mode === 'navigate') {
      event.respondWith(navigation(request, url));
      return;
    }
    if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  if (isPublicPhoto(url)) event.respondWith(cacheFirst(request, IMAGES, true));
});
