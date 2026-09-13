const CACHE_NAME = "bittracker-mobile-20260913-pausas-49";
const LUCIDE_URL = "https://unpkg.com/lucide@1.23.0/dist/umd/lucide.min.js";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20260913-pausas-49",
  "./app.js?v=20260913-pausas-49",
  "./studio-core.js?v=20260913-pausas-49",
  "./timer-core.js?v=20260913-pausas-49",
  "./notifications.js?v=20260913-pausas-49",
  "./micro-sessions.json",
  "./push-config.json",
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

  if (url.origin === self.location.origin && url.pathname.endsWith("/push-config.json")) {
    event.respondWith(fetch(event.request).then(async (response) => {
      if (response.ok) await (await caches.open(CACHE_NAME)).put(event.request, response.clone());
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }

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
        url.pathname.endsWith("/studio-core.js") ||
        url.pathname.endsWith("/timer-core.js") ||
        url.pathname.endsWith("/notifications.js") ||
        url.pathname.endsWith("/micro-sessions.json") ||
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

function microNotificationUrl(value) {
  const fallback = new URL("./", self.registration.scope);
  try {
    const url = new URL(value, fallback);
    if (url.origin !== fallback.origin || ![fallback.pathname, `${fallback.pathname}index.html`].includes(url.pathname) || !/^[a-z0-9-]{1,60}$/.test(url.searchParams.get("micro") || "")) return fallback;
    const safe = new URL(fallback);
    safe.searchParams.set("micro", url.searchParams.get("micro"));
    return safe;
  } catch { return fallback; }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* A malformed push still needs a visible notification. */ }
  const url = microNotificationUrl(payload.url);
  event.waitUntil(self.registration.showNotification(typeof payload.title === "string" ? payload.title.slice(0, 120) : "Pausa activa", {
    body: typeof payload.body === "string" ? payload.body.slice(0, 500) : "Tienes una pausa disponible en BitTracker.",
    tag: /^micro-[a-z0-9-]{1,80}$/.test(payload.tag || "") ? payload.tag : "bittracker-micro",
    icon: new URL("./icon.svg", self.registration.scope).href,
    data: { url: url.href },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = microNotificationUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = windows.find((window) => {
      const open = new URL(window.url);
      return open.origin === url.origin && [new URL(self.registration.scope).pathname, `${new URL(self.registration.scope).pathname}index.html`].includes(open.pathname);
    });
    if (client) {
      await client.focus();
      if (url.searchParams.has("micro")) client.postMessage({ type: "open-micro-session", id: url.searchParams.get("micro") });
    } else await self.clients.openWindow(url.href);
  })());
});
