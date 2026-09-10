import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rateLimit } from "../_core/procedures";
import {
  getAlgorithmExerciseById,
  gradeAlgorithmAttempt,
  saveAlgorithmAttempt,
  getAlgorithmAttemptsForUser,
} from "../db";

export const algorithmLabRouter = router({
  // The learner's code is actually executed here, server-side, against the
  // exercise's real test cases (shared/pseudocodeInterpreter.ts) — the
  // server computes status/passedTests/totalTests itself and never trusts
  // a client-submitted grade (a client-trusted grade would let anyone
  // fake a "passed" result via a raw API call, no code required).
  submitAttempt: protectedProcedure
    .use(rateLimit("algo-attempt", 30, 60 * 60 * 1000))
    .input(
      z.object({
        exerciseId: z.number().int().positive(),
        code: z.string().min(1).max(20000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const exercise = await getAlgorithmExerciseById(input.exerciseId);
      if (!exercise || exercise.isPublished !== 1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Exercise not found" });
      }
      const graded = gradeAlgorithmAttempt(exercise, input.code);
      await saveAlgorithmAttempt({
        exerciseId: input.exerciseId,
        userId: ctx.user.id,
        code: input.code,
        status: graded.status,
        passedTests: graded.passedTests,
        totalTests: graded.totalTests,
        feedbackJson: JSON.stringify(graded.feedback),
      });
      return graded;
    }),
  myAttempts: protectedProcedure
    .input(z.object({ exerciseId: z.number().int().positive().optional() }))
    .query(({ ctx, input }) =>
      getAlgorithmAttemptsForUser(ctx.user.id, input.exerciseId)
    ),
});
