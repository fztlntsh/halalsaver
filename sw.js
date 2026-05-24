/* ============================================================
   HalalSaver MY — Service Worker (PWA)
   Caches core assets for offline use on mobile browsers.
   ============================================================ */

const CACHE_NAME = 'halalsaver-my-v1';

/* Assets to cache on install */
const PRECACHE_URLS = [
  './',
  './index.html',
  './login.html',
  './register.html',
  './preferences.html',
  './dashboard.html',
  './products.html',
  './comparison.html',
  './ranking.html',
  './css/styles.css',
  './js/main.js',
  './manifest.json'
];

/* ── Install: pre-cache shell assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: remove stale caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first for local assets, network-first for remote ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Only handle GET requests */
  if (event.request.method !== 'GET') return;

  /* Network-first for CDN (Bootstrap, Font Awesome) */
  const isCDN = url.hostname.includes('cdn.jsdelivr.net') ||
                url.hostname.includes('cdnjs.cloudflare.com');
  if (isCDN) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* Cache-first for local assets */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
