const CACHE = 'lp-v7';
const ASSETS = ['index.html', 'attendance-multi-features.html', 'broker.html', 'logout.html'];

const PASSTHROUGH = [
  'sharepoint.com',
  'microsoft.com',
  'microsoftonline.com',
  'office.com',
  'graph.microsoft.com',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always pass SP/Microsoft calls directly to network — never cache
  if (PASSTHROUGH.some(domain => url.hostname.includes(domain))) {
    e.respondWith(
      fetch(e.request).catch(err => {
        console.warn('SP fetch failed:', err);
        return new Response(JSON.stringify({error: 'network'}), {
          status: 503,
          headers: {'Content-Type': 'application/json'}
        });
      })
    );
    return;
  }

  // HTML files - try cache first using pathname only (ignores query params)
  if (url.pathname.match(/\.(html)$/) || url.pathname.includes('version.json')) {
    // Try to match cache by pathname only (strip query params)
    const cacheKey = new Request(url.origin + url.pathname);
    e.respondWith(
      caches.match(cacheKey).then(cached => {
        // Always fetch fresh from network too
        const networkFetch = fetch(e.request).then(r => {
          if (r.ok) {
            caches.open(CACHE).then(c => c.put(cacheKey, r.clone()));
          }
          return r;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Everything else - cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
