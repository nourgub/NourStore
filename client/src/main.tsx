import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

// A default staleTime of 0 (React Query's own default) means every query
// — including the public course catalog and subjects list, which change
// rarely — refetches on every component mount and window refocus. 30s is
// a real, meaningful caching win for exactly the kind of mostly-static,
// public data this app serves most often, on exactly the slow/metered
// connections it needs to work well on — without weakening correctness:
// every mutation in this app already calls invalidateQueries/refetch()
// explicitly on success, which bypasses staleTime entirely, so a change
// a person just made is never hidden behind this window.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

// Real, opt-in analytics loading — the previous approach (a %VITE_...%
// placeholder script tag directly in index.html) was never actually
// substituted by anything (VITE_ANALYTICS_ENDPOINT/WEBSITE_ID aren't
// defined in .env.example or documented anywhere), so it was a guaranteed
// failed network request — and a build-time warning — on every single
// page load, regardless of whether analytics was wanted. This only
// injects the script when both variables are genuinely configured, and
// silently does nothing otherwise — analytics is optional, its absence
// should never be an error.
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as
  | string
  | undefined;
const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as
  | string
  | undefined;
if (analyticsEndpoint && analyticsWebsiteId) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = `${analyticsEndpoint}/umami`;
  script.dataset.websiteId = analyticsWebsiteId;
  document.head.appendChild(script);
}

// Real, self-hosted error reporting for errors React's ErrorBoundary
// cannot catch by design: errors thrown inside event handlers, and
// genuinely unhandled promise rejections. Same plain-REST approach as
// ErrorBoundary — deliberately not tRPC, for robustness when the app is
// already in a broken state.
function reportUncaughtError(message: string, stack?: string) {
  fetch("/api/report-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stack, context: window.location.pathname }),
  }).catch(() => {});
}

window.addEventListener("error", event => {
  reportUncaughtError(event.message, event.error?.stack);
});

window.addEventListener("unhandledrejection", event => {
  const reason = event.reason;
  const message =
    reason instanceof Error ? reason.message : String(reason ?? "Unknown rejection");
  const stack = reason instanceof Error ? reason.stack : undefined;
  reportUncaughtError(message, stack);
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

// Registers the real offline-app-shell service worker (see public/sw.js) —
// this is what makes "Add to Home Screen" on iOS/Android behave like an
// actual installed app instead of just a bookmark, and lets the shell load
// even with no connection after the first visit.
//
// Update flow: the new worker installs but waits (see sw.js — it no longer
// calls skipWaiting() automatically). When a waiting worker is detected, we
// dispatch a real DOM event the UI listens for (see UpdateBanner in App.tsx)
// instead of silently swapping the app under the person while they're using
// it. Clicking "update" calls window.__nourixApplyUpdate(), which tells the
// waiting worker to take over and reloads once it does.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(registration => {
        const notifyUpdateAvailable = () =>
          window.dispatchEvent(new CustomEvent("nourix:sw-update-available"));

        if (registration.waiting && navigator.serviceWorker.controller)
          notifyUpdateAvailable();

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            // "installed" + an existing controller means this is a genuine
            // update, not the very first install on a fresh visit.
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              notifyUpdateAvailable();
          });
        });

        (window as any).__nourixApplyUpdate = () => {
          if (!registration.waiting) return;
          registration.waiting.postMessage("SKIP_WAITING");
        };

        let hasReloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (hasReloaded) return;
          hasReloaded = true;
          window.location.reload();
        });
      })
      .catch(error => {
        console.warn("[PWA] service worker registration failed:", error);
      });
  });
}
