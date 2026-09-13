import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { teacherProcedure, rateLimit } from "../_core/procedures";
import { createMeetEvent } from "../_core/googleCalendar";
import { isGoogleConfigured } from "../_core/googleAuth";
import {
  claudeModel,
  isClaudeConfigured,
  type ClaudeTextResult,
} from "../claudeClient";
import { generateMathLessonPlan } from "../lessonPlanner";
import { designMathExam } from "../examDesigner";
import { solveMathExam } from "../examSolutions";
import { gradeStudentPaper, PROVISIONAL_GRADING_NOTICE } from "../paperGrader";
import {
  getCoursesForRole,
  getManagedLearnerCount,
  getStudentsForTeacher,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
  setLessonLiveSession,
  createLearnerReport,
} from "../db";

export const teacherRouter = router({
  courses: teacherProcedure.query(({ ctx }) =>
    getCoursesForRole(ctx.user.role, ctx.user.id)
  ),
  learnerCount: teacherProcedure.query(({ ctx }) =>
    getManagedLearnerCount(ctx.user.role, ctx.user.id)
  ),
  myStudents: teacherProcedure.query(({ ctx }) =>
    getStudentsForTeacher(ctx.user.id, ctx.user.role as "teacher" | "institution" | "admin")
  ),
  googleCalendarStatus: teacherProcedure.query(async ({ ctx }) => ({
    ...(await getGoogleCalendarStatus(ctx.user.id)),
    // Lets the "Connect Google Calendar" button hide itself instead of
    // linking into /api/google-calendar/connect's 501 "not configured"
    // page on a deployment with no GOOGLE_CLIENT_ID/SECRET set.
    googleConfigured: isGoogleConfigured(),
  })),
  disconnectGoogleCalendar: teacherProcedure.mutation(({ ctx }) =>
    disconnectGoogleCalendar(ctx.user.id)
  ),
  // Creates a real Google Calendar event with an auto-attached Meet link
  // on the teacher's own connected calendar, then saves the resulting
  // link/time onto the lesson (setLessonLiveSession) — this is what
  // actually auto-generates the Meet URL, as opposed to a teacher
  // pasting one manually into content.updateLesson's liveUrl field.
  createLiveSession: teacherProcedure
    .use(rateLimit("teacher-create-live-session", 30, 60 * 60 * 1000))
    .input(
      z.object({
        lessonId: z.number().int().positive(),
        title: z.string().min(2).max(255),
        startsAt: z.string().datetime(),
        durationMinutes: z.number().int().min(10).max(240).default(60),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const meetResult = await createMeetEvent({
        teacherId: ctx.user.id,
        summary: input.title,
        startsAt: new Date(input.startsAt),
        durationMinutes: input.durationMinutes,
      });
      if (!meetResult.ok) {
        if (meetResult.reason === "not_connected")
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Connect your Google Calendar first (Teacher panel → Google Meet).",
          });
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Google Calendar rejected the request. Try again shortly.",
        });
      }
      const saved = await setLessonLiveSession({
        id: input.lessonId,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
        liveUrl: meetResult.meetUrl,
        liveStartsAt: new Date(input.startsAt).getTime(),
      });
      if (!saved)
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      return { ok: true, meetUrl: meetResult.meetUrl };
    }),
  // ---------------------------------------------------------------------
  // Teacher assistant (Claude) — four modules over one shared integration:
  // lesson preparation, exam design, model solutions, paper grading. Each is
  // a real, paid API call, so each is rate-limited per teacher; none of them
  // touches the database.
  // ---------------------------------------------------------------------
  // Lets the assistant panel say plainly that the feature is off on a
  // deployment with no ANTHROPIC_API_KEY set, instead of offering buttons
  // that can only fail.
  assistantStatus: teacherProcedure.query(() => ({
    configured: isClaudeConfigured(),
    model: claudeModel(),
  })),
  // 1 — تحضير الدروس
  generateLessonPlan: teacherProcedure
    .use(rateLimit("teacher-generate-lesson-plan", 20, 60 * 60 * 1000))
    .input(
      z.object({
        level: z.string().min(2).max(80),
        topic: z.string().min(2).max(160),
        durationMinutes: z.number().int().min(15).max(240).default(60),
        // Optional on purpose: the prompt tells Claude to ask for missing
        // context rather than assume it — see server/prompts/mathLessonPlan.ts.
        priorKnowledge: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => asMarkdown(await generateMathLessonPlan(input))),
  // 2 — تصميم الامتحانات (the paper only; solutions are a separate call)
  generateExam: teacherProcedure
    .use(rateLimit("teacher-generate-exam", 20, 60 * 60 * 1000))
    .input(
      z.object({
        level: z.string().min(2).max(80),
        topics: z.array(z.string().min(2).max(120)).min(1).max(12),
        durationMinutes: z.number().int().min(15).max(300).default(120),
        totalPoints: z.number().int().min(1).max(100).default(20),
      })
    )
    .mutation(async ({ input }) => asMarkdown(await designMathExam(input))),
  // 3 — التصحيح النموذجي وسلم التنقيط. Returns the JSON parsed AND raw: when
  // the reply cannot be read as the agreed shape, the teacher still gets the
  // text plus the reason, rather than losing a full model solution.
  generateExamSolutions: teacherProcedure
    .use(rateLimit("teacher-generate-exam-solutions", 20, 60 * 60 * 1000))
    .input(z.object({ examText: z.string().min(20).max(20000) }))
    .mutation(async ({ input }) => {
      const result = await solveMathExam(input);
      if (!result.ok) throw assistantError(result);
      return result;
    }),
  // 4 — تصحيح أوراق التلاميذ, against the module 3 grading scale. Higher
  // limit than the others: one call per student, i.e. a full class in a
  // sitting. No OCR here — studentAnswerText is text the teacher supplies.
  gradeStudentPaper: teacherProcedure
    .use(rateLimit("teacher-grade-student-paper", 120, 60 * 60 * 1000))
    .input(
      z.object({
        solutionsJson: z.string().min(2).max(60000),
        studentAnswerText: z.string().min(10).max(20000),
      })
    )
    .mutation(async ({ input }) => ({
      ...asMarkdown(await gradeStudentPaper(input)),
      // Travels with the result so no UI can quietly drop the caveat.
      provisional: PROVISIONAL_GRADING_NOTICE,
    })),
  sendReport: teacherProcedure
    .use(rateLimit("teacher-send-report", 60, 60 * 60 * 1000))
    .input(
      z.object({
        learnerId: z.number().int().positive(),
        courseId: z.number().int().positive().optional(),
        level: z.string().min(1).max(40),
        title: z.string().min(2).max(255),
        notes: z.string().min(2).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createLearnerReport({
        teacherId: ctx.user.id,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        ...input,
      });
      if (!result.ok)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found in one of your own courses",
        });
      return result;
    }),
});

/**
 * Maps a Claude failure onto the right tRPC code: a missing key is a
 * deployment precondition, a refusal is about this specific request, and
 * anything else is the upstream API failing.
 */
function assistantError(
  result: Extract<ClaudeTextResult, { ok: false }>
): TRPCError {
  if (result.reason === "not_configured")
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: result.message,
    });
  if (result.reason === "refused")
    return new TRPCError({ code: "BAD_REQUEST", message: result.message });
  return new TRPCError({ code: "BAD_GATEWAY", message: result.message });
}

/** Shared success shape for the three Markdown-returning modules. */
function asMarkdown(result: ClaudeTextResult) {
  if (!result.ok) throw assistantError(result);
  return {
    markdown: result.text,
    model: result.model,
    truncated: result.truncated,
  };
}
