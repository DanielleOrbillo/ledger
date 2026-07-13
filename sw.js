// The Ledger — Service Worker
// Phase 6: Cache-First for shell, proper lifecycle

const CACHE_NAME = 'ledger-v3';
const SHELL_ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Network-first for same-origin HTML/JS
  if (req.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    // Cache-first for everything else
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
  }
});
