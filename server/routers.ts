import { router } from "./_core/trpc";
import { diagnosticsRouter } from "./routers/diagnostics";
import { authRouter } from "./routers/auth";
import { learningRouter } from "./routers/learning";
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
import { adminRouter } from "./routers/admin";
import { supportRouter } from "./routers/support";

export const appRouter = router({
  diagnostics: diagnosticsRouter,
  auth: authRouter,
  learning: learningRouter,
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
  admin: adminRouter,
  support: supportRouter,
});

export type AppRouter = typeof appRouter;
