import { router } from "./_core/trpc";
import { diagnosticsRouter } from "./routers/diagnostics";
import { authRouter } from "./routers/auth";
import { learningRouter } from "./routers/learning";
import { algorithmLabRouter } from "./routers/algorithmLab";
import { learnerRouter } from "./routers/learner";
import { parentRouter } from "./routers/parent";
import { platformRouter } from "./routers/platform";
import { subscriptionsRouter } from "./routers/subscriptions";
import { paymentsRouter } from "./routers/payments";
import { progressRouter } from "./routers/progress";
import { placementRouter } from "./routers/placement";
import { notificationsRouter } from "./routers/notifications";
import { certificatesRouter } from "./routers/certificates";
import { quizzesRouter } from "./routers/quizzes";
import { contentRouter } from "./routers/content";
import { teacherRouter } from "./routers/teacher";
import { institutionRouter } from "./routers/institution";
import { adminRouter } from "./routers/admin";
import { supportRouter } from "./routers/support";

export const appRouter = router({
  diagnostics: diagnosticsRouter,
  auth: authRouter,
  learning: learningRouter,
  algorithmLab: algorithmLabRouter,
  learner: learnerRouter,
  parent: parentRouter,
  platform: platformRouter,
  subscriptions: subscriptionsRouter,
  payments: paymentsRouter,
  progress: progressRouter,
  placement: placementRouter,
  notifications: notificationsRouter,
  certificates: certificatesRouter,
  quizzes: quizzesRouter,
  content: contentRouter,
  teacher: teacherRouter,
  institution: institutionRouter,
  admin: adminRouter,
  support: supportRouter,
});

export type AppRouter = typeof appRouter;
