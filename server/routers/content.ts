import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { roleProcedure, rateLimit } from "../_core/procedures";
import { MAX_VIDEO_UPLOAD_BYTES } from "../uploadValidation";
import {
  createManagedFinalExam,
  getPendingReviewAnswers,
  gradeQuizAnswer,
  getContentAnalytics,
  getAllSkills,
  createCourse,
  createUnit,
  createLesson,
  getManagedCurriculum,
  getManagedQuiz,
  createManagedQuiz,
  createManagedQuizQuestion,
  updateManagedQuizQuestion,
  deleteManagedQuizQuestion,
  updateManagedCourse,
  deleteManagedCourse,
  deleteManagedUnit,
  deleteManagedLesson,
  updateManagedUnit,
  reorderManagedUnit,
  reorderManagedLesson,
  updateManagedLesson,
  uploadLessonAsset,
  logAdminAction,
} from "../db";

export const contentRouter = router({
  createFinalExam: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        courseId: z.number().int().positive(),
        passScore: z.number().int().min(0).max(100),
        maxAttempts: z.number().int().min(1).max(20),
      })
    )
    .mutation(({ ctx, input }) =>
      createManagedFinalExam({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  // Manual grading queue for open/code answers — never auto-graded by the system.
  pendingReviews: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  ).query(({ ctx }) =>
    getPendingReviewAnswers(
      ctx.user.role as "teacher" | "institution" | "admin",
      ctx.user.id
    )
  ),
  gradeAnswer: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        attemptAnswerId: z.number().int().positive(),
        isCorrect: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) =>
      gradeQuizAnswer({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  // Aggregate quiz/exam performance + per-skill difficulty, scoped to what this teacher/institution actually owns (admin sees everything). No individual learner identities are exposed.
  analytics: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  ).query(({ ctx }) =>
    getContentAnalytics(
      ctx.user.role as "teacher" | "institution" | "admin",
      ctx.user.id
    )
  ),
  skills: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  ).query(() => getAllSkills()),
  createCourse: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        slug: z
          .string()
          .min(3)
          .max(160)
          .regex(/^[a-z0-9-]+$/),
        subject: z.string().min(1).max(40),
        stage: z.enum(["primary", "middle", "secondary"]),
        level: z.enum([
          "starter",
          "foundation",
          "intermediate",
          "advanced",
          "exam",
          "professional",
        ]),
        titleAr: z.string().min(2).max(255),
        titleFr: z.string().min(2).max(255),
        titleEn: z.string().min(2).max(255),
        descriptionAr: z.string().min(2),
        descriptionFr: z.string().min(2),
        descriptionEn: z.string().min(2),
        objectivesAr: z.array(z.string().min(1)).max(20).optional(),
        objectivesFr: z.array(z.string().min(1)).max(20).optional(),
        objectivesEn: z.array(z.string().min(1)).max(20).optional(),
        prerequisitesAr: z.array(z.string().min(1)).max(20).optional(),
        prerequisitesFr: z.array(z.string().min(1)).max(20).optional(),
        prerequisitesEn: z.array(z.string().min(1)).max(20).optional(),
        targetAudienceAr: z.string().max(255).optional(),
        targetAudienceFr: z.string().max(255).optional(),
        targetAudienceEn: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createCourse({ ...input, ownerId: ctx.user.id });
      if (!result.ok) {
        if (result.reason === "invalid_subject")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Unknown or inactive subject — ask an admin to add it first",
          });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Course creation unavailable",
        });
      }
      return result;
    }),
  createUnit: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        courseId: z.number().int().positive(),
        orderIndex: z.number().int().min(0),
        titleAr: z.string().min(2).max(255),
        titleFr: z.string().min(2).max(255),
        titleEn: z.string().min(2).max(255),
        descriptionAr: z.string().optional(),
        descriptionFr: z.string().optional(),
        descriptionEn: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createUnit({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  createLesson: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        unitId: z.number().int().positive(),
        orderIndex: z.number().int().min(0),
        titleAr: z.string().min(2).max(255),
        titleFr: z.string().min(2).max(255),
        titleEn: z.string().min(2).max(255),
        type: z.enum(["video", "article", "exercise", "live"]),
        durationMinutes: z.number().int().min(0).max(10000).optional(),
        liveUrl: z.string().url().max(768).optional(),
        liveStartsAt: z.number().int().positive().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createLesson({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  curriculum: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(z.object({ courseId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      getManagedCurriculum(
        input.courseId,
        ctx.user.role as "teacher" | "institution" | "admin",
        ctx.user.id
      )
    ),
  quiz: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(z.object({ unitId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      getManagedQuiz(
        input.unitId,
        ctx.user.role as "teacher" | "institution" | "admin",
        ctx.user.id
      )
    ),
  createQuiz: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        unitId: z.number().int().positive(),
        passScore: z.number().int().min(0).max(100),
        maxAttempts: z.number().int().min(1).max(20),
      })
    )
    .mutation(({ ctx, input }) =>
      createManagedQuiz({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  createQuizQuestion: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        quizId: z.number().int().positive(),
        questionType: z.enum(["choice", "true_false", "open", "code"]),
        promptAr: z.string().min(2),
        promptFr: z.string().min(2),
        promptEn: z.string().min(2),
        optionsJson: z.string().max(10000).optional(),
        answerKey: z.string().max(1000).optional(),
        explanationAr: z.string().max(5000).optional(),
        explanationFr: z.string().max(5000).optional(),
        explanationEn: z.string().max(5000).optional(),
        skillId: z.number().int().positive().nullable().optional(),
        orderIndex: z.number().int().min(0),
      })
    )
    .mutation(({ ctx, input }) =>
      createManagedQuizQuestion({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  updateQuizQuestion: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        id: z.number().int().positive(),
        questionType: z.enum(["choice", "true_false", "open", "code"]),
        promptAr: z.string().min(2),
        promptFr: z.string().min(2),
        promptEn: z.string().min(2),
        optionsJson: z.string().max(10000).nullable().optional(),
        answerKey: z.string().max(1000).nullable().optional(),
        explanationAr: z.string().max(5000).nullable().optional(),
        explanationFr: z.string().max(5000).nullable().optional(),
        explanationEn: z.string().max(5000).nullable().optional(),
        skillId: z.number().int().positive().nullable().optional(),
        orderIndex: z.number().int().min(0),
      })
    )
    .mutation(({ ctx, input }) =>
      updateManagedQuizQuestion({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  deleteQuizQuestion: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      deleteManagedQuizQuestion({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  updateCourse: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        id: z.number().int().positive(),
        titleAr: z.string().min(2).max(255),
        titleFr: z.string().min(2).max(255),
        titleEn: z.string().min(2).max(255),
        descriptionAr: z.string().min(2),
        descriptionFr: z.string().min(2),
        descriptionEn: z.string().min(2),
        stage: z.enum(["primary", "middle", "secondary"]),
        level: z.enum([
          "starter",
          "foundation",
          "intermediate",
          "advanced",
          "exam",
          "professional",
        ]),
        objectivesAr: z.array(z.string().min(1)).max(20).optional(),
        objectivesFr: z.array(z.string().min(1)).max(20).optional(),
        objectivesEn: z.array(z.string().min(1)).max(20).optional(),
        prerequisitesAr: z.array(z.string().min(1)).max(20).optional(),
        prerequisitesFr: z.array(z.string().min(1)).max(20).optional(),
        prerequisitesEn: z.array(z.string().min(1)).max(20).optional(),
        targetAudienceAr: z.string().max(255).optional(),
        targetAudienceFr: z.string().max(255).optional(),
        targetAudienceEn: z.string().max(255).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      updateManagedCourse({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  deleteCourse: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteManagedCourse({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      });
      if (!result.ok) {
        if (result.reason === "has_learner_data")
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This course has real learner enrollments and cannot be deleted. Unpublish it instead to remove it from the catalog.",
          });
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }
      await logAdminAction({
        actorId: ctx.user.id,
        action: "delete_course",
        targetType: "course",
        targetId: input.id,
      });
      return result;
    }),
  deleteUnit: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteManagedUnit({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      });
      if (!result.ok) {
        if (result.reason === "has_learner_data")
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This unit has lessons with real learner progress and cannot be deleted.",
          });
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unit not found",
        });
      }
      await logAdminAction({
        actorId: ctx.user.id,
        action: "delete_unit",
        targetType: "unit",
        targetId: input.id,
      });
      return result;
    }),
  deleteLesson: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteManagedLesson({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      });
      if (!result.ok) {
        if (result.reason === "has_learner_data")
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Learners have real progress on this lesson — it cannot be deleted.",
          });
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found",
        });
      }
      await logAdminAction({
        actorId: ctx.user.id,
        action: "delete_lesson",
        targetType: "lesson",
        targetId: input.id,
      });
      return result;
    }),
  updateUnit: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        id: z.number().int().positive(),
        titleAr: z.string().min(2).max(255),
        titleFr: z.string().min(2).max(255),
        titleEn: z.string().min(2).max(255),
      })
    )
    .mutation(({ ctx, input }) =>
      updateManagedUnit({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  reorderUnit: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        id: z.number().int().positive(),
        direction: z.enum(["up", "down"]),
      })
    )
    .mutation(({ ctx, input }) =>
      reorderManagedUnit({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  reorderLesson: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        id: z.number().int().positive(),
        direction: z.enum(["up", "down"]),
      })
    )
    .mutation(({ ctx, input }) =>
      reorderManagedLesson({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  updateLesson: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .input(
      z.object({
        id: z.number().int().positive(),
        titleAr: z.string().min(2).max(255),
        titleFr: z.string().min(2).max(255),
        titleEn: z.string().min(2).max(255),
        type: z.enum(["video", "article", "exercise", "live"]).optional(),
        liveUrl: z.string().url().max(768).nullable().optional(),
        liveStartsAt: z.number().int().positive().nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      updateManagedLesson({
        ...input,
        role: ctx.user.role as "teacher" | "institution" | "admin",
        userId: ctx.user.id,
      })
    ),
  uploadAsset: roleProcedure(
    ["teacher", "institution", "admin"],
    "Content authoring access required"
  )
    .use(rateLimit("lesson-upload", 30, 60 * 60 * 1000))
    .input(
      z.object({
        lessonId: z.number().int().positive(),
        fileName: z.string().min(1).max(255),
        mimeType: z.enum([
          "application/pdf",
          "video/mp4",
          "video/webm",
          "image/png",
          "image/jpeg",
          "image/webp",
          "text/plain",
          "text/markdown",
          "application/zip",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]),
        // Real cap is enforced per-MIME-type against the *decoded* bytes
        // in validateUploadBytes (server/uploadValidation.ts) — video
        // gets a higher MAX_VIDEO_UPLOAD_BYTES. This upper bound just
        // needs to comfortably cover the largest of those.
        sizeBytes: z
          .number()
          .int()
          .positive()
          .max(MAX_VIDEO_UPLOAD_BYTES),
        data: z
          .string()
          .min(1)
          .max(Math.ceil(MAX_VIDEO_UPLOAD_BYTES * 1.37)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await uploadLessonAsset({
        ...input,
        uploaderId: ctx.user.id,
        role: ctx.user.role as "teacher" | "institution" | "admin",
      });
      if ("ok" in result && result.ok === false) {
        if (result.reason === "not_found")
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lesson not found",
          });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Upload rejected: ${result.reason}`,
        });
      }
      return result;
    }),
});
