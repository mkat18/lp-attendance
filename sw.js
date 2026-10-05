const CACHE = 'lp-v8';

const PASSTHROUGH = [
  'sharepoint.com',
  'microsoft.com',
  'microsoftonline.com',
  'office.com',
  'graph.microsoft.com',
];

self.addEventListener('install', e => {
  // Don't pre-cache anything — let files cache on first use
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
      fetch(e.request).catch(() => new Response(JSON.stringify({error: 'network'}), {
        status: 503,
        headers: {'Content-Type': 'application/json'}
      }))
    );
    return;
  }

  // HTML files — network first, cache on success, fall back to cache
  if (url.pathname.match(/\.(html)$/) || url.pathname.includes('version.json')) {
    const cacheKey = new Request(url.origin + url.pathname);
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            caches.open(CACHE).then(c => c.put(cacheKey, r.clone()));
          }
          return r;
        })
        .catch(() => caches.match(cacheKey))
    );
    return;
  }

  // Everything else — network first, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
