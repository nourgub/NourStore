import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rateLimit } from "../_core/procedures";
import {
  hasActiveSubscription,
  getUnitQuizForLearner,
  getUnitQuizWithQuestions,
  submitQuizAttempt,
  getFinalExamForLearner,
  getFinalExamWithQuestions,
} from "../db";

export const quizzesRouter = router({
  current: protectedProcedure
    .input(z.object({ unitId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      getUnitQuizForLearner(input.unitId, ctx.user.id)
    ),
  submit: protectedProcedure
    .use(rateLimit("quiz-submit", 20, 60 * 60 * 1000))
    .input(
      z.object({
        unitId: z.number().int().positive(),
        answersJson: z.string().max(20000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!(await hasActiveSubscription(ctx.user.id)))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Active subscription required",
        });
      // Learner must be enrolled in the owning (published) course before a quiz can resolve for them at all.
      const learnerView = await getUnitQuizForLearner(
        input.unitId,
        ctx.user.id
      );
      if (!learnerView.quiz)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit quiz not found",
        });
      // Grading itself is done from the server-only, answerKey-bearing copy — never sent to the browser directly.
      const data = await getUnitQuizWithQuestions(input.unitId);
      if (!data.quiz)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit quiz not found",
        });
      let answers: Record<string, string> = {};
      try {
        answers = JSON.parse(input.answersJson);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid answers",
        });
      }
      const result = await submitQuizAttempt({
        quiz: {
          id: data.quiz.id,
          passScore: data.quiz.passScore,
          maxAttempts: data.quiz.maxAttempts,
          kind: "unit_quiz",
        },
        questions: data.questions,
        userId: ctx.user.id,
        answers,
      });
      if (!result.ok) {
        if (result.reason === "max_attempts")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Maximum attempts reached",
          });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Quiz submission unavailable",
        });
      }
      return result;
    }),
  // Final exam: same grading engine as unit quizzes (open/code answers are
  // never auto-graded — see quizGrading.ts), scoped by courseId instead of unitId.
  finalExamCurrent: protectedProcedure
    .input(z.object({ courseId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      getFinalExamForLearner(input.courseId, ctx.user.id)
    ),
  finalExamSubmit: protectedProcedure
    .use(rateLimit("final-exam-submit", 10, 60 * 60 * 1000))
    .input(
      z.object({
        courseId: z.number().int().positive(),
        answersJson: z.string().max(20000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!(await hasActiveSubscription(ctx.user.id)))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Active subscription required",
        });
      const learnerView = await getFinalExamForLearner(
        input.courseId,
        ctx.user.id
      );
      if (!learnerView.quiz)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Final exam not found",
        });
      if (!learnerView.eligible)
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Complete every course lesson before taking the final exam",
        });
      const data = await getFinalExamWithQuestions(input.courseId);
      if (!data.quiz)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Final exam not found",
        });
      let answers: Record<string, string> = {};
      try {
        answers = JSON.parse(input.answersJson);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid answers",
        });
      }
      const result = await submitQuizAttempt({
        quiz: {
          id: data.quiz.id,
          passScore: data.quiz.passScore,
          maxAttempts: data.quiz.maxAttempts,
          kind: "final_exam",
          courseId: input.courseId,
        },
        questions: data.questions,
        userId: ctx.user.id,
        answers,
      });
      if (!result.ok) {
        if (result.reason === "max_attempts")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Maximum attempts reached",
          });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Final exam submission unavailable",
        });
      }
      return result;
    }),
});
