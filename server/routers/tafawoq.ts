// Tafawoq AI Teacher — the personal AI teacher (server/tafawoq/).
// Every procedure acts only on the calling user's own student profile
// (ctx.user.id → tafawoqStudents.userId); an assessment id from another
// student is reported as NOT_FOUND by the service layer.
import { z } from "zod";
import { SCHOOL_LEVELS } from "@shared/tafawoq";
import { publicProcedure, router } from "../_core/trpc";
import { learnerProcedure, rateLimit } from "../_core/procedures";
import * as tafawoq from "../tafawoq/service";

const lessonKey = z.string().min(1).max(64);
const HOUR = 60 * 60 * 1000;

export const tafawoqRouter = router({
  catalog: publicProcedure.query(() => tafawoq.catalog()),

  overview: learnerProcedure.query(({ ctx }) => tafawoq.overview(ctx.user.id)),

  register: learnerProcedure
    .input(
      z.object({
        displayName: z.string().trim().min(2).max(100),
        age: z.number().int().min(6).max(25),
        schoolLevel: z.enum(SCHOOL_LEVELS),
        goals: z.string().max(500).optional(),
      })
    )
    .mutation(({ ctx, input }) => tafawoq.register(ctx.user.id, input)),

  startPlacement: learnerProcedure
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.startPlacement(ctx.user.id, input.lessonKey)),

  submitAssessment: learnerProcedure
    .use(rateLimit("tafawoq-submit", 60, HOUR))
    .input(
      z.object({
        assessmentId: z.number().int().positive(),
        answers: z
          .array(
            z.object({
              questionId: z.string().max(64),
              answer: z.string().max(500),
              responseMs: z.number().int().min(0).optional(),
            })
          )
          .max(50),
      })
    )
    .mutation(({ ctx, input }) =>
      tafawoq.submitAssessment(ctx.user.id, input.assessmentId, input.answers)
    ),

  workspace: learnerProcedure
    .input(z.object({ lessonKey }))
    .query(({ ctx, input }) => tafawoq.workspace(ctx.user.id, input.lessonKey)),

  generateLesson: learnerProcedure
    .use(rateLimit("tafawoq-lesson", 20, HOUR))
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.generateLesson(ctx.user.id, input.lessonKey)),

  generatePractice: learnerProcedure
    .use(rateLimit("tafawoq-practice", 30, HOUR))
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.generatePractice(ctx.user.id, input.lessonKey)),

  generateVideo: learnerProcedure
    .use(rateLimit("tafawoq-video", 10, HOUR))
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.generateVideo(ctx.user.id, input.lessonKey)),

  startTutor: learnerProcedure
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.startTutor(ctx.user.id, input.lessonKey)),

  sendMessage: learnerProcedure
    .use(rateLimit("tafawoq-chat", 60, HOUR))
    .input(z.object({ lessonKey, message: z.string().trim().min(1).max(2000) }))
    .mutation(({ ctx, input }) =>
      tafawoq.sendTutorMessage(ctx.user.id, input.lessonKey, input.message)
    ),
});
