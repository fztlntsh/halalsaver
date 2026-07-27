/* ============================================================
   HalalSaver MY — Service Worker (PWA)
   Only caches truly static assets (CSS/JS/manifest/icons) so the
   installed app still loads instantly on a slow connection. Pages and
   API calls are session-based and personalised (dashboard, saved list,
   recommendations), so they are always fetched fresh from the network —
   caching those would show stale data forever once cached.
   ============================================================ */

const CACHE_NAME = 'halalsaver-my-v2';

const PRECACHE_URLS = [
  '/css/styles.css',
  '/static/css/app.css',
  '/static/css/toggle.css',
  '/js/functions.js',
  '/manifest.json',
  '/frontend/assets/icons/icon-192.png',
  '/frontend/assets/icons/icon-512.png',
];

/* Only these path prefixes are safe to cache-first — static, non-personalised. */
const STATIC_PREFIXES = ['/css/', '/static/', '/js/', '/frontend/assets/'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isStaticAsset = url.origin === self.location.origin &&
    STATIC_PREFIXES.some(prefix => url.pathname.startsWith(prefix));

  if (!isStaticAsset) return; // let the browser handle pages/API calls natively

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
