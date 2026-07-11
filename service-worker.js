const CACHE_NAME = "velvet-fusion-deck-v3";
const APP_SHELL = [
  "./",
  "index.html",
  "styles/main.css",
  "scripts/app.js",
  "manifest.webmanifest",
  "data/personas.json",
  "data/fusion-chart.json",
  "data/special-recipes.json",
  "data/persona-images.json",
  "data/skills.json",
  "assets/p4g-logo-transparent.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png"
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
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Network-first for app shell / data so deploys update quickly; cache fallback offline.
  // Cache-first for persona/arcana images for snappy offline art.
  const isImage = requestUrl.pathname.includes("/assets/personas/")
    || requestUrl.pathname.includes("/assets/arcana/")
    || requestUrl.pathname.includes("/assets/icons/")
    || requestUrl.pathname.endsWith(".png")
    || requestUrl.pathname.endsWith(".otf");

  if (isImage) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => caches.match("assets/personas/taowu.png"));
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./")))
  );
});
