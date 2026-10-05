import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import UpdateBanner from "./components/UpdateBanner";
import RoleOnboardingModal from "./components/RoleOnboardingModal";
import { ThemeProvider } from "./contexts/ThemeContext";
import { setStoredLanguage } from "@/lib/language";
// Tafawoq — the maths teacher — is the whole app: the teacher, sign-in,
// and the legal pages. Every route is code-split via React.lazy().
const NotFound = lazy(() => import("@/pages/NotFound"));
const Legal = lazy(() => import("./pages/Legal"));
const AuthPage = lazy(() => import("./pages/Auth"));
const TafawoqApp = lazy(() => import("./pages/tafawoq/TafawoqApp"));

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
        <Route path="/" component={TafawoqApp} />
        <Route path="/tafawoq/:lessonKey" component={TafawoqApp} />
        <Route path="/tafawoq" component={TafawoqApp} />
        <Route path="/login" component={() => <AuthPage mode="login" />} />
        <Route path="/register" component={() => <AuthPage mode="register" />} />
        <Route path="/legal/:doc" component={Legal} />
        <Route path="/legal" component={Legal} />
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
    const stored = localStorage.getItem("nourix-language");
    if (stored === "ar" || stored === "fr" || stored === "en") {
      setStoredLanguage(stored);
    }
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
