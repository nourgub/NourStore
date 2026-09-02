import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import UpdateBanner from "./components/UpdateBanner";
import RoleOnboardingModal from "./components/RoleOnboardingModal";
import { ThemeProvider } from "./contexts/ThemeContext";
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

// LearningFlows.tsx is the largest single file in the project (many admin
// panels + several learner-facing flows bundled together) — splitting it
// into its own chunk is the single biggest win here, since most visitors
// (an anonymous browser, a learner just watching a lesson) never need any
// of this code at all.
const PlacementTest = lazy(() =>
  import("./pages/LearningFlows").then((m) => ({ default: m.PlacementTest }))
);
const UnitQuiz = lazy(() =>
  import("./pages/LearningFlows").then((m) => ({ default: m.UnitQuiz }))
);
const FinalExam = lazy(() =>
  import("./pages/LearningFlows").then((m) => ({ default: m.FinalExam }))
);
const ParentSpace = lazy(() =>
  import("./pages/LearningFlows").then((m) => ({ default: m.ParentSpace }))
);
const StaffSpace = lazy(() =>
  import("./pages/LearningFlows").then((m) => ({ default: m.StaffSpace }))
);
const InstitutionSpace = lazy(() =>
  import("./pages/LearningFlows").then((m) => ({
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
