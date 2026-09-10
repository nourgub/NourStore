import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { teacherProcedure, rateLimit } from "../_core/procedures";
import { createMeetEvent } from "../_core/googleCalendar";
import { isGoogleConfigured } from "../_core/googleAuth";
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
    getManagedLearnerCount(ctx.user.role)
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
