import { router } from "./_core/trpc";
import { diagnosticsRouter } from "./routers/diagnostics";
import { authRouter } from "./routers/auth";
import { accountAdminRouter, accountRouter } from "./routers/account";
import { parentRouter } from "./routers/parent";
import { adminRouter } from "./routers/admin";
import { tafawoqRouter } from "./routers/tafawoq";
import { bacAdminRouter, bacRouter, bacTutorRouter } from "./routers/bac";
import { supportRouter } from "./routers/support";

export const appRouter = router({
  diagnostics: diagnosticsRouter,
  auth: authRouter,
  account: accountRouter,
  accountAdmin: accountAdminRouter,
  parent: parentRouter,
  admin: adminRouter,
  tafawoq: tafawoqRouter,
  bac: bacRouter,
  bacAdmin: bacAdminRouter,
  bacTutor: bacTutorRouter,
  support: supportRouter,
});

export type AppRouter = typeof appRouter;
