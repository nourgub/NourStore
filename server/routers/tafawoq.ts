// Tafawoq AI Teacher — the personal AI teacher (server/tafawoq/).
// Every procedure acts only on the calling user's own student profile
// (ctx.user.id → tafawoqStudents.userId); an assessment id from another
// student is reported as NOT_FOUND by the service layer.
import { z } from "zod";
import { BAC_STREAMS, SCHOOL_LEVELS } from "@shared/tafawoq";
import { publicProcedure, router } from "../_core/trpc";
import { learnerProcedure, parentProcedure, rateLimit } from "../_core/procedures";
import * as tafawoq from "../tafawoq/service";

const lessonKey = z.string().min(1).max(64);
const HOUR = 60 * 60 * 1000;

const answersInput = z
  .array(
    z.object({
      questionId: z.string().max(64),
      answer: z.string().max(500),
      responseMs: z.number().int().min(0).optional(),
    })
  )
  .max(50);

export const tafawoqRouter = router({
  catalog: publicProcedure.query(() => tafawoq.catalog()),

  overview: learnerProcedure.query(({ ctx }) => tafawoq.overview(ctx.user.id)),

  register: learnerProcedure
    .input(
      z.object({
        displayName: z.string().trim().min(2).max(100),
        age: z.number().int().min(6).max(25),
        schoolLevel: z.enum(SCHOOL_LEVELS),
        stream: z.enum(BAC_STREAMS).nullable().optional(),
        goals: z.string().max(500).optional(),
      })
    )
    .mutation(({ ctx, input }) => tafawoq.register(ctx.user.id, input)),

  startPlacement: learnerProcedure
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.startPlacement(ctx.user.id, input.lessonKey)),

  submitAssessment: learnerProcedure
    .use(rateLimit("tafawoq-submit", 60, HOUR))
    .input(z.object({ assessmentId: z.number().int().positive(), answers: answersInput }))
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

  /** A BAC-style multi-part problem ("موضوع") on this lesson. */
  generateProblem: learnerProcedure
    .use(rateLimit("tafawoq-problem", 30, HOUR))
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.generateProblem(ctx.user.id, input.lessonKey)),

  /** Mock BAC exam for the student's stream, out of 20. */
  generateExam: learnerProcedure
    .use(rateLimit("tafawoq-exam", 10, HOUR))
    .mutation(({ ctx }) => tafawoq.generateExam(ctx.user.id)),

  submitExam: learnerProcedure
    .use(rateLimit("tafawoq-submit", 60, HOUR))
    .input(
      z.object({
        examId: z.number().int().positive(),
        papers: z.array(z.object({ assessmentId: z.number().int().positive(), answers: answersInput })).min(1).max(6),
      })
    )
    .mutation(({ ctx, input }) => tafawoq.submitExam(ctx.user.id, input.examId, input.papers)),

  /** "Your road to your mark": prediction, countdown and today's task (BAC students). */
  roadmap: learnerProcedure.query(({ ctx }) => tafawoq.roadmap(ctx.user.id)),

  setTarget: learnerProcedure
    .input(z.object({ targetMark: z.number().min(10).max(20).multipleOf(0.5) }))
    .mutation(({ ctx, input }) => tafawoq.setTarget(ctx.user.id, input.targetMark)),

  /** The student's marked mock exams, oldest first. */
  myExams: learnerProcedure.query(({ ctx }) => tafawoq.myExams(ctx.user.id)),

  generateVideo: learnerProcedure
    .use(rateLimit("tafawoq-video", 10, HOUR))
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.generateVideo(ctx.user.id, input.lessonKey)),

  startTutor: learnerProcedure
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.startTutor(ctx.user.id, input.lessonKey)),

  /** A one-time code the student gives a parent (redeemed via parent.acceptInvite). */
  createParentCode: learnerProcedure
    .use(rateLimit("tafawoq-parent-code", 10, HOUR))
    .mutation(({ ctx }) => tafawoq.createParentCode(ctx.user.id)),

  /** Report on the caller's own actively linked children only. */
  parentReport: parentProcedure.query(({ ctx }) => tafawoq.parentReport(ctx.user.id)),

  /** Phone-call lesson: what the teacher says when the call opens / ends. */
  callIntro: learnerProcedure
    .use(rateLimit("tafawoq-call", 30, HOUR))
    .input(z.object({ lessonKey }))
    .mutation(({ ctx, input }) => tafawoq.callIntro(ctx.user.id, input.lessonKey)),

  callSummary: learnerProcedure
    .input(z.object({ lessonKey, afterId: z.number().int().min(0) }))
    .mutation(({ ctx, input }) => tafawoq.callSummary(ctx.user.id, input.lessonKey, input.afterId)),

  sendMessage: learnerProcedure
    .use(rateLimit("tafawoq-chat", 60, HOUR))
    .input(z.object({ lessonKey, message: z.string().trim().min(1).max(2000) }))
    .mutation(({ ctx, input }) =>
      tafawoq.sendTutorMessage(ctx.user.id, input.lessonKey, input.message)
    ),
});
