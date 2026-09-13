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
  deleteExamPaper,
  deleteExamSolutionSet,
  deleteLessonPlan,
  deletePaperGrade,
  getExamPaper,
  getExamSolutionSet,
  getLessonPlan,
  getPaperGrade,
  listExamPapers,
  listExamSolutionSets,
  listLessonPlans,
  listPaperGrades,
  markPaperGradeReviewed,
  savePaperGrade,
  saveExamPaper,
  saveExamSolutionSet,
  saveLessonPlan,
  teacherOwnsLearner,
} from "../db";
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
  // 1 — تحضير الدروس. The generated plan is saved as it is produced, so
  // closing the tab does not lose it; on a deployment with no DATABASE_URL
  // the save is a no-op and `id` comes back null rather than failing the
  // whole request.
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
    .mutation(async ({ ctx, input }) => {
      const plan = asMarkdown(await generateMathLessonPlan(input));
      const id = await saveLessonPlan({
        teacherId: ctx.user.id,
        ...input,
        content: plan.markdown,
        model: plan.model,
        truncated: plan.truncated,
      });
      return { id, ...plan };
    }),
  lessonPlans: teacherProcedure.query(({ ctx }) =>
    listLessonPlans(ctx.user.id, teacherRole(ctx.user.role))
  ),
  lessonPlan: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      mustExist(
        await getLessonPlan(input.id, ctx.user.id, teacherRole(ctx.user.role))
      )
    ),
  deleteLessonPlan: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteLessonPlan(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { ok: true };
    }),
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
    .mutation(async ({ ctx, input }) => {
      const paper = asMarkdown(await designMathExam(input));
      const id = await saveExamPaper({
        teacherId: ctx.user.id,
        ...input,
        content: paper.markdown,
        model: paper.model,
        truncated: paper.truncated,
      });
      return { id, ...paper };
    }),
  examPapers: teacherProcedure.query(({ ctx }) =>
    listExamPapers(ctx.user.id, teacherRole(ctx.user.role))
  ),
  examPaper: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      mustExist(await getExamPaper(input.id, ctx.user.id, teacherRole(ctx.user.role)))
    ),
  deleteExamPaper: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteExamPaper(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { ok: true };
    }),
  // 3 — التصحيح النموذجي وسلم التنقيط. Returns the JSON parsed AND raw: when
  // the reply cannot be read as the agreed shape, the teacher still gets the
  // text plus the reason, rather than losing a full model solution — and the
  // row is saved either way, so a fixable JSON is not thrown away.
  generateExamSolutions: teacherProcedure
    .use(rateLimit("teacher-generate-exam-solutions", 20, 60 * 60 * 1000))
    .input(
      z.object({
        examText: z.string().min(20).max(20000),
        // Set when the text came from a paper generated here, so the two
        // stay linked in the teacher's history.
        examPaperId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.examPaperId !== undefined) {
        mustExist(
          await getExamPaper(
            input.examPaperId,
            ctx.user.id,
            teacherRole(ctx.user.role)
          )
        );
      }
      const result = await solveMathExam({ examText: input.examText });
      if (!result.ok) throw assistantError(result);
      const id = await saveExamSolutionSet({
        teacherId: ctx.user.id,
        examPaperId: input.examPaperId ?? null,
        examText: input.examText,
        solutionsJson: result.json,
        parseError: result.parseError,
        questionCount: result.questions?.length ?? null,
        scaleTotalPoints: result.totalPoints,
        model: result.model,
        truncated: result.truncated,
      });
      return { id, ...result };
    }),
  examSolutionSets: teacherProcedure.query(({ ctx }) =>
    listExamSolutionSets(ctx.user.id, teacherRole(ctx.user.role))
  ),
  examSolutionSet: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      mustExist(
        await getExamSolutionSet(input.id, ctx.user.id, teacherRole(ctx.user.role))
      )
    ),
  deleteExamSolutionSet: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteExamSolutionSet(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!result.ok) {
        if (result.reason === "has_reviewed_grades")
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "لا يمكن حذف سلم تنقيط استُعمل في نقاط نهائية سُلّمت للتلاميذ. احذف تلك النقاط أولاً إن كنت متأكداً.",
          });
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      }
      return result;
    }),
  // 4 — تصحيح أوراق التلاميذ, against the module 3 grading scale. Higher
  // limit than the others: one call per student, i.e. a full class in a
  // sitting. No OCR here — studentAnswerText is text the teacher supplies.
  gradeStudentPaper: teacherProcedure
    .use(rateLimit("teacher-grade-student-paper", 120, 60 * 60 * 1000))
    .input(
      z
        .object({
          // Either a saved grading scale…
          solutionSetId: z.number().int().positive().optional(),
          // …or one the teacher pasted in (their own, or from elsewhere).
          solutionsJson: z.string().min(2).max(60000).optional(),
          studentAnswerText: z.string().min(10).max(20000),
          // Attaches the mark to a real account, which is what later lets the
          // learner and their parents see it — checked against the teacher's
          // own roster below.
          learnerId: z.number().int().positive().optional(),
          studentLabel: z.string().min(1).max(160).optional(),
          maxPoints: z.number().int().min(1).max(100).optional(),
        })
        .refine(input => input.solutionSetId || input.solutionsJson, {
          message: "Provide either solutionSetId or solutionsJson",
        })
    )
    .mutation(async ({ ctx, input }) => {
      const role = teacherRole(ctx.user.role);
      if (input.learnerId !== undefined) {
        const owns = await teacherOwnsLearner(ctx.user.id, role, input.learnerId);
        if (!owns)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Student not found in one of your own courses",
          });
      }
      let solutionSetId = input.solutionSetId ?? null;
      let solutionsJson = input.solutionsJson ?? "";
      if (solutionSetId !== null) {
        const set = mustExist(
          await getExamSolutionSet(solutionSetId, ctx.user.id, role)
        );
        solutionsJson = set.solutionsJson;
      }
      const report = asMarkdown(
        await gradeStudentPaper({
          solutionsJson,
          studentAnswerText: input.studentAnswerText,
        })
      );
      if (solutionSetId === null) {
        // A pasted scale is stored as a solution set of its own before the
        // grade references it: a mark must always keep a record of what it
        // was graded against, which is the evidence behind it.
        solutionSetId = await saveExamSolutionSet({
          teacherId: ctx.user.id,
          examText: "",
          solutionsJson,
          model: report.model,
          truncated: false,
        });
      }
      const id =
        solutionSetId === null
          ? null
          : await savePaperGrade({
              teacherId: ctx.user.id,
              solutionSetId,
              learnerId: input.learnerId ?? null,
              studentLabel: input.studentLabel ?? null,
              answerText: input.studentAnswerText,
              report: report.markdown,
              model: report.model,
              truncated: report.truncated,
              maxPoints: input.maxPoints ?? null,
            });
      return {
        id,
        solutionSetId,
        ...report,
        // Travels with the result so no UI can quietly drop the caveat.
        provisional: PROVISIONAL_GRADING_NOTICE,
      };
    }),
  paperGrades: teacherProcedure
    .input(
      z
        .object({ solutionSetId: z.number().int().positive().optional() })
        .optional()
    )
    .query(({ ctx, input }) =>
      listPaperGrades(ctx.user.id, teacherRole(ctx.user.role), {
        solutionSetId: input?.solutionSetId,
      })
    ),
  paperGrade: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      mustExist(await getPaperGrade(input.id, ctx.user.id, teacherRole(ctx.user.role)))
    ),
  deletePaperGrade: teacherProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deletePaperGrade(
        input.id,
        ctx.user.id,
        teacherRole(ctx.user.role)
      );
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { ok: true };
    }),
  // The only way a mark becomes real: the teacher types it, and only then is
  // the learner (and every actively-linked parent) notified.
  reviewPaperGrade: teacherProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        finalPoints: z.number().int().min(0).max(100),
        maxPoints: z.number().int().min(1).max(100),
        teacherNotes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await markPaperGradeReviewed({
        ...input,
        teacherId: ctx.user.id,
        role: teacherRole(ctx.user.role),
      });
      if (!result.ok) {
        if (result.reason === "invalid_mark")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "النقطة يجب أن تكون بين 0 والنقطة القصوى.",
          });
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      }
      return result;
    }),
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

/** Narrows ctx.user.role to the three roles the teacher endpoints allow through. */
function teacherRole(role: string) {
  return role as "teacher" | "institution" | "admin";
}

/**
 * Turns "no row, or not yours" into a 404 — deliberately the same answer for
 * both, so an id that belongs to another teacher is indistinguishable from
 * one that does not exist.
 */
function mustExist<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
  return value;
}
