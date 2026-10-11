import { router } from "./_core/trpc";
import { diagnosticsRouter } from "./routers/diagnostics";
import { authRouter } from "./routers/auth";
import { parentRouter } from "./routers/parent";
import { adminRouter } from "./routers/admin";
import { tafawoqRouter } from "./routers/tafawoq";
import { bacAdminRouter, bacRouter, bacTutorRouter } from "./routers/bac";

export const appRouter = router({
  diagnostics: diagnosticsRouter,
  auth: authRouter,
  parent: parentRouter,
  admin: adminRouter,
  tafawoq: tafawoqRouter,
  bac: bacRouter,
  bacAdmin: bacAdminRouter,
  bacTutor: bacTutorRouter,
});

export type AppRouter = typeof appRouter;
