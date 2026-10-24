// Minimal service worker — registered only to make the app installable as
// a PWA ("Add to Home Screen"), not to cache anything. This app is
// authenticated, multi-tenant, and backed by live per-teacher data (grades,
// student papers, subscription state), so a cache-first or stale-while-
// revalidate strategy here would risk one teacher's browser ever serving
// another session's stale/cross-account HTML. Every request is passed
// straight through to the network; the fetch handler exists only because
// some browsers require one to offer the install prompt at all.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
