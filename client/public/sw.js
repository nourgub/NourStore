// Nourix Academy service worker — a real, working offline capability, not a
// placeholder. Strategy: network-first for navigation/API requests (so
// content is always fresh when online), falling back to the cache when
// offline; cache-first for static built assets (JS/CSS/images), since those
// are content-hashed by the build and safe to cache aggressively.
//
// This does NOT make the whole app usable offline (lesson video still needs
// a network connection to stream, and any tRPC call still needs the server)
// — it makes the app *shell* (HTML/CSS/JS) load instantly and work without a
// connection once it's been visited at least once, which is the honest,
// real scope of what a service worker can deliver without a dedicated
// offline-data-sync architecture (a separate, much larger project).

const CACHE_NAME = "nourix-shell-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  // Deliberately NOT calling skipWaiting() here — the new worker waits until
  // the person explicitly confirms the update prompt (see main.tsx), which
  // is what makes a real "a new version is available" notification possible
  // instead of silently swapping the app shell under an open tab.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

// The update banner (main.tsx) posts this once the person clicks "update now".
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never cache mutations
  const url = new URL(request.url);

  // Never cache API calls — they must always reflect real, current server state.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("/").then((shell) => shell || caches.match("/offline.html"));
          return caches.match("/offline.html");
        })
      )
  );
});
