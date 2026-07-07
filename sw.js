const CACHE_NAME = "bittracker-mobile-20260707-fase4-18";
const LUCIDE_URL = "https://unpkg.com/lucide@1.23.0/dist/umd/lucide.min.js";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20260707-fase4-18",
  "./app.js?v=20260707-fase4-18",
  "./manifest.webmanifest?v=20260627-mobile-01",
  "./icon.svg",
  LUCIDE_URL
];

self.addEventListener("install", (event) => {
  // Precache the whole shell (including the pinned lucide bundle) so the very
  // next launch — and every offline launch — is instant.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function cacheFirst(request) {
  return caches.match(request).then(
    (cached) =>
      cached ||
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
  );
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })
    .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")));
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // HTML shell: network-first so a version bump (or any content change) lands
  // immediately; fall back to cache/offline shell.
  const isHTML =
    event.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  if (isHTML) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Version-busted assets (app.js?v, styles.css?v, manifest, icon) + the pinned
  // lucide bundle: cache-first. The URL itself changes when we bump the version,
  // so the cache is always correct AND the load is instant on repeat visits —
  // no 800KB+ re-download on a slow phone.
  const isVersionedAsset =
    (url.origin === self.location.origin &&
      (url.pathname.endsWith("/app.js") ||
        url.pathname.endsWith("/styles.css") ||
        url.pathname.endsWith("/manifest.webmanifest") ||
        url.pathname.endsWith("/icon.svg"))) ||
    event.request.url === LUCIDE_URL;
  if (isVersionedAsset) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else (Apps Script sync, etc.): network, fall back to cache/shell.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
