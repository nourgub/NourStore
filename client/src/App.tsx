import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import UpdateBanner from "./components/UpdateBanner";
import RoleOnboardingModal from "./components/RoleOnboardingModal";
import { ThemeProvider } from "./contexts/ThemeContext";
import { setStoredLanguage } from "@/lib/language";
import Home from "./pages/Home";

// Every route below the landing page is code-split via React.lazy() — each
// becomes its own JS chunk, fetched only when the person actually
// navigates there, instead of all being bundled into the single ~740KB
// initial download. Home stays eagerly imported since it's the most
// common first page and shouldn't show a loading flash.
const NotFound = lazy(() => import("@/pages/NotFound"));
const CourseCatalog = lazy(() => import("./pages/CourseCatalog"));
const AlgorithmLab = lazy(() => import("./pages/AlgorithmLab"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Legal = lazy(() => import("./pages/Legal"));
const Support = lazy(() => import("./pages/Support"));
const LessonViewer = lazy(() => import("./pages/LessonViewer"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AuthPage = lazy(() => import("./pages/Auth"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Search = lazy(() => import("./pages/Search"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CertificateVerify = lazy(() => import("./pages/CertificateVerify"));

// The former LearningFlows.tsx bundled learner-facing flows AND the entire
// teacher/institution/admin panel into one file, so both ended up in the
// SAME chunk — a learner taking a quiz downloaded the whole admin panel's
// code too. Split into two independent modules (client/src/pages/flows/)
// so each is fetched only by the visitors who actually need it.
const PlacementTest = lazy(() =>
  import("./pages/flows/LearnerFlows").then((m) => ({
    default: m.PlacementTest,
  }))
);
const UnitQuiz = lazy(() =>
  import("./pages/flows/LearnerFlows").then((m) => ({ default: m.UnitQuiz }))
);
const FinalExam = lazy(() =>
  import("./pages/flows/LearnerFlows").then((m) => ({ default: m.FinalExam }))
);
const ParentSpace = lazy(() =>
  import("./pages/flows/LearnerFlows").then((m) => ({
    default: m.ParentSpace,
  }))
);
const StaffSpace = lazy(() =>
  import("./pages/flows/StaffFlows").then((m) => ({ default: m.StaffSpace }))
);
const InstitutionSpace = lazy(() =>
  import("./pages/flows/StaffFlows").then((m) => ({
    default: m.InstitutionSpace,
  }))
);

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
        <Route path="/" component={Home} />
        <Route path="/login" component={() => <AuthPage mode="login" />} />
        <Route
          path="/register"
          component={() => <AuthPage mode="register" />}
        />
        <Route path="/workspace" component={Workspace} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/placement" component={PlacementTest} />
        <Route path="/quiz/:unitId" component={UnitQuiz} />
        <Route path="/quiz" component={UnitQuiz} />
        <Route path="/exam/:courseId" component={FinalExam} />
        <Route path="/parent" component={ParentSpace} />
        <Route path="/teacher" component={() => <StaffSpace />} />
        <Route path="/institution" component={InstitutionSpace} />
        <Route path="/admin" component={() => <StaffSpace admin />} />
        <Route path="/search" component={Search} />
        <Route path="/notifications" component={Notifications} />
        <Route
          path="/verify/certificate/:id"
          component={CertificateVerify}
        />
        <Route path="/verify/certificate" component={CertificateVerify} />
        <Route path="/courses/:slug" component={CourseDetail} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/legal/:doc" component={Legal} />
        <Route path="/legal" component={Legal} />
        <Route path="/support" component={Support} />
        <Route path="/lesson/:lessonId" component={LessonViewer} />
        <Route path="/courses" component={CourseCatalog} />
        <Route path="/lab/:slug" component={AlgorithmLab} />
        <Route path="/lab" component={AlgorithmLab} />
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
