import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { checkRateLimit } from "../rateLimit";
import { logError } from "../db";

export const diagnosticsRouter = router({
  // A real, honest way for the frontend to report an unhandled error
  // back to the self-hosted error log (see server/db/errorLog.ts) —
  // public since a person might not be logged in when the error
  // happens, rate-limited so it can't be abused as a spam vector.
  reportFrontendError: publicProcedure
    .input(
      z.object({
        message: z.string().max(2000),
        stack: z.string().max(8000).optional(),
        context: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (
        !(await checkRateLimit(
          `frontend-error-report:${ctx.req.ip || "unknown"}`,
          30,
          60 * 60 * 1000
        ))
      ) {
        return { ok: true }; // silently drop, never let error reporting itself throw a visible error
      }
      await logError({
        source: "frontend",
        message: input.message,
        stack: input.stack,
        context: input.context,
        userId: ctx.user?.id,
        userAgent: ctx.req.headers["user-agent"],
      });
      return { ok: true };
    }),
});
