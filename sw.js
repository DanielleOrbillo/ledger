// ===== The Ledger — Service Worker (Phase 1: Critical Stability Patch) =====
// Cache-first app shell strategy. Bump CACHE_NAME on every deploy so
// updated clients pick up the new index.html instead of a stale one.
const CACHE_NAME = "ledger-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Cache-first for the app shell, falling back to network, and updating the
// cache in the background when the network responds (stale-while-revalidate
// for same-origin GET requests only — never intercept POST/etc.).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // Offline and not cached: nothing we can do for this request.

      return cached || networkFetch;
    })
  );
});
