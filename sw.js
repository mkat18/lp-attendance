const CACHE = 'lp-v10';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const method = e.request.method;

  // Never cache non-GET requests
  if (method !== 'GET') {
    e.respondWith(fetch(e.request));
    return;
  }

  // Never cache anything except our own HTML/JS/CSS files
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Our own HTML files — network first, fall back to cache
  if (url.pathname.match(/\.(html|js|json|css)$/)) {
    const cacheKey = new Request(url.origin + url.pathname);
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(cacheKey, clone));
          }
          return r;
        })
        .catch(() => caches.match(cacheKey))
    );
    return;
  }

  // Everything else — straight to network
  e.respondWith(fetch(e.request));
});
