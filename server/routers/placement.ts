import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rateLimit } from "../_core/procedures";
import {
  getPlacementTestForPublic,
  getPlacementTestWithQuestions,
  savePlacementAttempt,
} from "../db";

export const placementRouter = router({
  current: publicProcedure.query(() => getPlacementTestForPublic()),
  submit: protectedProcedure
    .use(rateLimit("placement-submit", 10, 60 * 60 * 1000))
    .input(
      z.object({
        testId: z.number().int().positive(),
        answersJson: z.string().max(20000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
      await savePlacementAttempt({
        userId: ctx.user.id,
        testId: input.testId,
        score,
        recommendedLevel,
        answersJson: JSON.stringify(answers),
      });
      return {
        score,
        recommendedLevel,
        correct,
        total: data.questions.length,
      };
    }),
});
