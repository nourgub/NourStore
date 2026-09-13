import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { checkRateLimit } from "../rateLimit";
import {
  getPlacementTestForPublic,
  getPlacementTestWithQuestions,
  savePlacementAttempt,
} from "../db";

export const placementRouter = router({
  current: publicProcedure.query(() => getPlacementTestForPublic()),
  // A free lead-magnet: an anonymous visitor can take and see the result of
  // the placement test with no account at all — the registration prompt is
  // shown alongside the result instead of gating the test itself. The
  // attempt is only persisted to the DB (savePlacementAttempt) when a real
  // logged-in user takes it; an anonymous score is computed and returned
  // but never stored, since there's no userId to attach it to.
  submit: publicProcedure
    .input(
      z.object({
        testId: z.number().int().positive(),
        answersJson: z.string().max(20000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rateLimitKey = ctx.user
        ? `placement-submit:${ctx.user.id}`
        : `placement-submit-ip:${ctx.req.ip || "unknown"}`;
      if (!(await checkRateLimit(rateLimitKey, 10, 60 * 60 * 1000)))
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts, please try again later",
        });
      // score/recommendedLevel are always computed server-side from the answerKey-bearing
      // copy; the client is never trusted to report its own score.
      const data = await getPlacementTestWithQuestions();
      if (!data.test || data.test.id !== input.testId)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Placement test not found",
        });
      let answers: Record<string, string> = {};
      try {
        answers = JSON.parse(input.answersJson || "{}");
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid answers",
        });
      }
      const correct = data.questions.filter(
        (q, index) => answers[String(index)] === q.answerKey
      ).length;
      const score = data.questions.length
        ? Math.round((correct / data.questions.length) * 100)
        : 0;
      const recommendedLevel =
        score >= 85
          ? "advanced"
          : score >= 65
            ? "intermediate"
            : score >= 40
              ? "foundation"
              : "starter";
      if (ctx.user) {
        await savePlacementAttempt({
          userId: ctx.user.id,
          testId: input.testId,
          score,
          recommendedLevel,
          answersJson: JSON.stringify(answers),
        });
      }
      return {
        score,
        recommendedLevel,
        correct,
        total: data.questions.length,
      };
    }),
});
