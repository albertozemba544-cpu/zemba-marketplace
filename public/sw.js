// Zemba service worker: makes the site installable and shows a friendly page when the phone is offline.
// It never stores pages, orders or payments, so what people see is always up to date.
const CACHE = 'zemba-shell-v1';
const OFFLINE_URL = '/offline.html';
const SHELL = [OFFLINE_URL, '/logo-mark.png', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});
