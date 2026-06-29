const CACHE = 'lp-v1';
const ATTENDANCE = 'attendance-multi-features.html';
const BROKER = 'broker.html';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([ATTENDANCE, BROKER, 'index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network first for HTML files (always get latest), cache fallback
  if (e.request.url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
  }
});
