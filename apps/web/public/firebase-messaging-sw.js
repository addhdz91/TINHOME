/* FR-70 — web push service worker (FCM data messages). No third-party scripts: FCM delivers a
 * standard Push API event whose JSON carries our `data` (title, body, link). */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    const payload = event.data ? event.data.json() : {};
    data = payload.data || payload.notification || {};
  } catch {
    data = {};
  }
  const title = data.title || 'TinHome';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/favicon-48.png',
      data: { link: data.link || '/app/avisos' },
      tag: data.link || 'tinhome',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/app/avisos';
  const url = new URL(link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
