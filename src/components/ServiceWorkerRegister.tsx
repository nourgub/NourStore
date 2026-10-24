"use client";

import { useEffect } from "react";

// Registers the minimal service worker (public/sw.js) so the app is
// installable ("Add to Home Screen") — see that file's comment for why it
// deliberately caches nothing. Silently no-ops on browsers without SW
// support (and on plain HTTP in local dev, where registration throws).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app works fully without an installed service worker.
    });
  }, []);

  return null;
}
