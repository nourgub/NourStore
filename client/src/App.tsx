import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import UpdateBanner from "./components/UpdateBanner";
import RoleOnboardingModal from "./components/RoleOnboardingModal";
import { ThemeProvider } from "./contexts/ThemeContext";
import { getStoredLanguage, setStoredLanguage } from "@/lib/language";
import TafawoqApp from "./pages/tafawoq/TafawoqApp";

// Tafawoq is the whole app and the first page almost everyone opens, so it
// is imported eagerly; the few other pages are code-split.
const NotFound = lazy(() => import("@/pages/NotFound"));
const Legal = lazy(() => import("./pages/Legal"));
const AuthPage = lazy(() => import("./pages/Auth"));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        background: "#050505",
        color: "#a09b8f",
        fontSize: 13,
      }}
    >
      …
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/">
          <Redirect to="/tafawoq" replace />
        </Route>
        <Route path="/login" component={() => <AuthPage mode="login" />} />
        <Route
          path="/register"
          component={() => <AuthPage mode="register" />}
        />
        <Route path="/forgot-password" component={() => <AuthPage mode="forgot" />} />
        <Route path="/reset-password" component={() => <AuthPage mode="reset" />} />
        <Route path="/tafawoq/:lessonKey" component={TafawoqApp} />
        <Route path="/tafawoq" component={TafawoqApp} />
        <Route path="/legal/:doc" component={Legal} />
        <Route path="/legal" component={Legal} />
        {/* Addresses from before the platform became Tafawoq-only: each
            role's old home is now inside /tafawoq (admin at /tafawoq/admin). */}
        {["/academy", "/workspace", "/dashboard", "/parent", "/teacher"].map(path => (
          <Route key={path} path={path}>
            <Redirect to="/tafawoq" replace />
          </Route>
        ))}
        <Route path="/admin">
          <Redirect to="/tafawoq/admin" replace />
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Belt-and-suspenders alongside the inline script in index.html: keeps
  // the real <html> dir/lang in sync with the stored language so anything
  // rendered outside a page's own per-language wrapper (most notably
  // sonner's toasts, which portal into document.body) matches the
  // selected language rather than always following index.html's static
  // default.
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored) setStoredLanguage(stored);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster theme="dark" position="bottom-center" />
          <UpdateBanner />
          <RoleOnboardingModal />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
