const CACHE = 'lp-v6';
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
  const url = e.request.url;

  // Always pass SP/Microsoft calls directly to network — never cache
  if (PASSTHROUGH.some(domain => url.includes(domain))) {
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

  // HTML files - network first, fall back to cache
  if (url.match(/\.(html)$/) || url.includes('version.json')) {
    e.respondWith(
      fetch(e.request).then(r => {
        // Only cache successful responses
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else - cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
