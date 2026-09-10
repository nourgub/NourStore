import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { checkRateLimit, getRateLimitStatus } from "./rateLimit";
import { MAX_VIDEO_UPLOAD_BYTES } from "./uploadValidation";
import { createMeetEvent } from "./_core/googleCalendar";
import { isGoogleConfigured } from "./_core/googleAuth";
import { createSessionToken } from "./_core/session";
import {
  hashPassword,
  verifyPassword,
  emailOpenId,
  validatePasswordStrength,
} from "./_core/emailAuth";
import {
  acceptParentInvite,
  countQuizAttempts,
  createParentInvite,
  cancelParentInvite,
  unlinkParent,
  createPlacementQuestion,
  createPlacementTest,
  getAlgorithmExerciseBySlug,
  getAlgorithmExerciseById,
  getPublishedAlgorithmExercises,
  getAllAlgorithmExercises,
  createAlgorithmExercise,
  setAlgorithmExercisePublished,
  gradeAlgorithmAttempt,
  saveAlgorithmAttempt,
  getAlgorithmAttemptsForUser,
  createCourse,
  createLesson,
  createUnit,
  getAllCourses,
  getCoursesForRole,
  getCourseWithCurriculum,
  getLearnerSummary,
  getManagedLearnerCount,
  getParentDashboard,
  getParentLinks,
  getPlacementTestWithQuestions,
  getPlacementTestForPublic,
  getPlacementTestsForAdmin,
  getPublishedCourses,
  getUnitQuizWithQuestions,
  getUnitQuizForLearner,
  getFinalExamWithQuestions,
  getFinalExamForLearner,
  createManagedFinalExam,
  submitQuizAttempt,
  gradeQuizAnswer,
  getPendingReviewAnswers,
  getUserEnrollments,
  enrollInCourse,
  getLessonForLearner,
  getCourseProgressForLearner,
  savePlacementAttempt,
  saveQuizAttempt,
  setCoursePublished,
  archiveManagedCourse,
  reorderManagedUnit,
  reorderManagedLesson,
  updateLessonProgress,
  getManagedCurriculum,
  updateManagedCourse,
  deleteManagedCourse,
  deleteManagedUnit,
  deleteManagedLesson,
  updateManagedUnit,
  updateManagedLesson,
  getAllUsers,
  toPublicUser,
  updateUserRole,
  adminResetPassword,
  createManagedUser,
  setAccountStatus,
  getStudentsForTeacher,
  createLearnerReport,
  getReportsForParent,
  getReportsForLearner,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
  setLessonLiveSession,
  uploadLessonAsset,
  getLessonAssets,
  getManagedQuiz,
  createManagedQuiz,
  createManagedQuizQuestion,
  updateManagedQuizQuestion,
  deleteManagedQuizQuestion,
  getSubscriptionPlans,
  getSubscriptionMembers,
  getUserSubscription,
  cancelActiveSubscription,
  hasActiveSubscription,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  assignSubscription,
  getPlanPrices,
  setPlanPrice,
  createInvoice,
  recordPaymentAttempt,
  getUserInvoices,
  submitDirectPaymentReceipt,
  getPlatformSetting,
  setPlatformSetting,
  searchLearningContent,
  getUserNotifications,
  markNotificationRead,
  getUserCertificates,
  verifyCertificate,
  revokeCertificate,
  reissueCertificate,
  getAllSkills,
  createSkill,
  getLearnerSkillBreakdown,
  getRecommendedReviewLessons,
  getContentAnalytics,
  notifyExpiringSubscriptions,
  getActiveSubjects,
  getAllSubjects,
  createSubject,
  setSubjectActive,
  deleteSubject,
  getPendingPaymentReceipts,
  getPaymentReceiptHistory,
  getOverdueInvoicesWithoutReceipt,
  reviewPaymentReceipt,
  notifyAdminsOfStaleReceipts,
  getRevenueAnalytics,
  getUserPoints,
  getUserBadges,
  getLeaderboard,
  getAllBadges,
  getAllBadgesForAdmin,
  createBadge,
  setBadgeActive,
  createSupportTicket,
  getUserSupportTickets,
  getAllSupportTickets,
  getTicketMessages,
  addSupportTicketMessage,
  updateSupportTicketStatus,
  createCoupon,
  getAllCoupons,
  setCouponActive,
  validateCoupon,
  redeemCoupon,
  getOrCreateReferralCode,
  redeemReferralCode,
  getReferralStats,
  chooseOwnRole,
  createEmailUser,
  getEmailUserPasswordHash,
  markUserSignedIn,
  logAdminAction,
  getAdminAuditLog,
  logError,
  getErrorLog,
  markErrorResolved,
  getErrorLogSummary,
} from "./db";
import { ENV } from "./_core/env";
import { initiateBaridimobCheckout } from "./baridimobProvider";
import { initiateSlickpayCheckout } from "./slickpayProvider";
import { remindStaleCheckoutSessions } from "./whatsappBot";
import {
  roleProcedure,
  adminProcedure,
  parentProcedure,
  teacherProcedure,
  institutionProcedure,
  learnerProcedure,
  rateLimit,
} from "./_core/procedures";
import { diagnosticsRouter } from "./routers/diagnostics";
import { authRouter } from "./routers/auth";
import { learningRouter } from "./routers/learning";
import { algorithmLabRouter } from "./routers/algorithmLab";
import { learnerRouter } from "./routers/learner";
import { parentRouter } from "./routers/parent";
import { platformRouter } from "./routers/platform";
import { subscriptionsRouter } from "./routers/subscriptions";
import { paymentsRouter } from "./routers/payments";
import { progressRouter } from "./routers/progress";
import { placementRouter } from "./routers/placement";
import { notificationsRouter } from "./routers/notifications";
import { certificatesRouter } from "./routers/certificates";
import { quizzesRouter } from "./routers/quizzes";

export const appRouter = router({
  diagnostics: diagnosticsRouter,
  auth: authRouter,
  learning: learningRouter,
  algorithmLab: algorithmLabRouter,
  learner: learnerRouter,
  parent: parentRouter,
  platform: platformRouter,
  subscriptions: subscriptionsRouter,
  payments: paymentsRouter,
  progress: progressRouter,
  placement: placementRouter,
  notifications: notificationsRouter,
  certificates: certificatesRouter,
  quizzes: quizzesRouter,
  content: router({
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
  }),
  teacher: router({
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
  }),
  institution: router({
    courses: institutionProcedure.query(({ ctx }) =>
      getCoursesForRole(ctx.user.role, ctx.user.id)
    ),
    learnerCount: institutionProcedure.query(({ ctx }) =>
      getManagedLearnerCount(ctx.user.role)
    ),
  }),
  admin: router({
    systemStatus: adminProcedure.query(() => getRateLimitStatus()),
    courses: adminProcedure.query(() => getAllCourses()),
    learnerCount: adminProcedure.query(({ ctx }) =>
      getManagedLearnerCount(ctx.user.role)
    ),
    placementTests: adminProcedure.query(() => getPlacementTestsForAdmin()),
    createPlacementTest: adminProcedure
      .input(
        z.object({
          subject: z.string().min(1).max(40),
          titleAr: z.string().min(2),
          titleFr: z.string().min(2),
          titleEn: z.string().min(2),
          isPublished: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => createPlacementTest(input)),
    createPlacementQuestion: adminProcedure
      .input(
        z.object({
          testId: z.number().int().positive(),
          promptAr: z.string().min(2),
          promptFr: z.string().min(2),
          promptEn: z.string().min(2),
          optionsJson: z.string().optional(),
          answerKey: z.string().optional(),
          skill: z.string().min(2),
          difficulty: z.enum(["starter", "easy", "medium", "hard"]),
          orderIndex: z.number().int().min(0),
        })
      )
      .mutation(({ input }) => createPlacementQuestion(input)),
    publishCourse: adminProcedure
      .input(
        z.object({
          courseId: z.number().int().positive(),
          published: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await setCoursePublished(
          input.courseId,
          input.published
        );
        if (!result.ok) {
          if (result.reason === "no_content")
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "This course has no lessons yet — add at least one lesson before publishing it.",
            });
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Course not found",
          });
        }
        await logAdminAction({
          actorId: ctx.user.id,
          action: input.published ? "publish_course" : "unpublish_course",
          targetType: "course",
          targetId: input.courseId,
        });
        return result;
      }),
    archiveCourse: adminProcedure
      .input(z.object({ courseId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await archiveManagedCourse(input.courseId);
        if (!result.ok)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Course not found",
          });
        await logAdminAction({
          actorId: ctx.user.id,
          action: "archive_course",
          targetType: "course",
          targetId: input.courseId,
        });
        return result;
      }),
    users: adminProcedure.query(() => getAllUsers()),
    updateUserRole: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          role: z.enum([
            "learner",
            "parent",
            "teacher",
            "institution",
            "admin",
          ]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await updateUserRole(input.userId, input.role);
        await logAdminAction({
          actorId: ctx.user.id,
          action: "update_user_role",
          targetType: "user",
          targetId: input.userId,
          details: { newRole: input.role, succeeded: result },
        });
        return result;
      }),
    // The platform's only account-recovery path — no outbound email
    // infrastructure exists to power a self-service "reset link" flow (see
    // adminResetPassword's own comment). An admin sets a new password
    // directly and relays it to the learner via WhatsApp/the existing
    // support channel.
    resetPassword: adminProcedure
      .use(rateLimit("admin-reset-password", 30, 60 * 60 * 1000))
      .input(
        z.object({
          userId: z.number().int().positive(),
          newPassword: z.string().min(1).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const strength = validatePasswordStrength(input.newPassword);
        if (!strength.ok)
          throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });
        const passwordHash = await hashPassword(input.newPassword);
        const result = await adminResetPassword(input.userId, passwordHash);
        await logAdminAction({
          actorId: ctx.user.id,
          action: "reset_password",
          targetType: "user",
          targetId: input.userId,
          details: { succeeded: result.ok },
        });
        if (!result.ok)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This account doesn't sign in with a password (not an email/password account).",
          });
        return result;
      }),
    // Admin-created account — distinct from self-service auth.registerWithEmail.
    // The admin picks the role directly, so a teacher/learner account here
    // starts "pending" (see createManagedUser) until activateUser confirms
    // payment. An admin-created "admin" account starts active immediately.
    createUser: adminProcedure
      .use(rateLimit("admin-create-user", 30, 60 * 60 * 1000))
      .input(
        z.object({
          name: z.string().min(2).max(100),
          email: z.string().email().max(320),
          password: z.string().min(1).max(200),
          role: z.enum(["learner", "teacher", "admin"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const strength = validatePasswordStrength(input.password);
        if (!strength.ok)
          throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });
        const passwordHash = await hashPassword(input.password);
        const result = await createManagedUser({
          email: input.email.trim().toLowerCase(),
          name: input.name,
          passwordHash,
          role: input.role,
        });
        if (!result.ok)
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        await logAdminAction({
          actorId: ctx.user.id,
          action: "create_user",
          targetType: "user",
          targetId: result.userId,
          details: { role: input.role, email: input.email },
        });
        return { ok: true, userId: result.userId };
      }),
    // Confirms payment was received outside the platform (bank transfer,
    // in-person, etc.) and unblocks login for an admin-created teacher/
    // learner account — see the "pending" gate in loginWithEmail above.
    activateUser: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          status: z.enum(["active", "pending", "suspended"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await setAccountStatus(input.userId, input.status);
        await logAdminAction({
          actorId: ctx.user.id,
          action: "set_account_status",
          targetType: "user",
          targetId: input.userId,
          details: { status: input.status, succeeded: result },
        });
        return { ok: result };
      }),
    // Directly grants a learner access to a course, bypassing the
    // subscription check that gates self-service enrollment (progress.enroll)
    // — for the admin who already confirmed a manual WhatsApp/bank-transfer
    // payment outside the platform and doesn't want to make the learner
    // separately click "enroll" themselves afterward.
    enrollLearner: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          courseId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await enrollInCourse({
          userId: input.userId,
          courseId: input.courseId,
          bypassSubscriptionCheck: true,
        });
        if (!result.ok) {
          if (result.reason === "not_found")
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Course not found",
            });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Enrollment unavailable",
          });
        }
        await logAdminAction({
          actorId: ctx.user.id,
          action: "enroll_learner",
          targetType: "user",
          targetId: input.userId,
          details: { courseId: input.courseId, alreadyEnrolled: result.alreadyEnrolled },
        });
        return result;
      }),
    algorithmExercises: adminProcedure.query(() => getAllAlgorithmExercises()),
    createAlgorithmExercise: adminProcedure
      .input(
        z.object({
          slug: z
            .string()
            .min(2)
            .max(160)
            .regex(/^[a-z0-9-]+$/),
          difficulty: z.enum(["starter", "easy", "medium", "hard"]),
          titleAr: z.string().min(2).max(255),
          titleFr: z.string().min(2).max(255),
          titleEn: z.string().min(2).max(255),
          statementAr: z.string().min(2),
          statementFr: z.string().min(2),
          statementEn: z.string().min(2),
          starterCode: z.string().min(1).max(10000),
          testCasesJson: z.string().min(2).max(20000),
          hintsJson: z.string().max(10000).optional(),
        })
      )
      .mutation(({ input }) => createAlgorithmExercise(input)),
    publishAlgorithmExercise: adminProcedure
      .input(
        z.object({ id: z.number().int().positive(), published: z.boolean() })
      )
      .mutation(({ input }) =>
        setAlgorithmExercisePublished(input.id, input.published)
      ),
    createSkill: adminProcedure
      .input(
        z.object({
          slug: z
            .string()
            .min(2)
            .max(160)
            .regex(/^[a-z0-9-]+$/),
          subject: z.string().min(1).max(40),
          titleAr: z.string().min(2).max(255),
          titleFr: z.string().min(2).max(255),
          titleEn: z.string().min(2).max(255),
        })
      )
      .mutation(({ input }) => createSkill(input)),
    subjects: adminProcedure.query(() => getAllSubjects()),
    createSubject: adminProcedure
      .input(
        z.object({
          slug: z
            .string()
            .min(2)
            .max(40)
            .regex(/^[a-z0-9-]+$/),
          icon: z.enum([
            "sigma",
            "code",
            "flask",
            "atom",
            "globe",
            "book",
            "brain",
            "music",
            "palette",
          ]),
          titleAr: z.string().min(2).max(255),
          titleFr: z.string().min(2).max(255),
          titleEn: z.string().min(2).max(255),
        })
      )
      .mutation(({ input }) => createSubject(input)),
    setSubjectActive: adminProcedure
      .input(
        z.object({ id: z.number().int().positive(), isActive: z.boolean() })
      )
      .mutation(({ input }) => setSubjectActive(input.id, input.isActive)),
    deleteSubject: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await deleteSubject(input.id);
        if (!result.ok) {
          if (result.reason === "in_use")
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Cannot delete: courses or skills still use this subject.",
            });
          throw new TRPCError({ code: "NOT_FOUND", message: "Subject not found" });
        }
        await logAdminAction({
          actorId: ctx.user.id,
          action: "delete_subject",
          targetType: "subject",
          targetId: input.id,
        });
        return result;
      }),
    // No cron/scheduler exists in this environment — a real deployment must
    // hit this from an external scheduled job (e.g. daily cron) for
    // subscription-expiring notifications to go out automatically.
    runExpiringSubscriptionSweep: adminProcedure.mutation(() =>
      notifyExpiringSubscriptions(3)
    ),
    // Same external-scheduler limitation as the sweep above — call this
    // periodically (e.g. hourly) from a real cron job so admins get notified
    // about payment receipts stuck in the manual-review queue instead of
    // only finding out by happening to open the dashboard.
    staleReceiptSweep: adminProcedure
      .input(z.object({ hoursThreshold: z.number().int().min(1).max(720).default(24) }).optional())
      .mutation(({ input }) =>
        notifyAdminsOfStaleReceipts(input?.hoursThreshold ?? 24)
      ),
    // Same external-scheduler limitation — reminds learners who got RIB
    // details via WhatsApp but never followed up with a receipt photo.
    // Never re-reminds the same session twice (see markSessionReminded).
    paymentReminderSweep: adminProcedure
      .input(z.object({ hoursThreshold: z.number().int().min(1).max(720).default(24) }).optional())
      .mutation(({ input }) =>
        remindStaleCheckoutSessions(input?.hoursThreshold ?? 24)
      ),
    revenueAnalytics: adminProcedure.query(() => getRevenueAnalytics()),
    auditLog: adminProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(500).optional(),
            action: z.string().max(80).optional(),
          })
          .optional()
      )
      .query(({ input }) => getAdminAuditLog(input ?? {})),
    errorLog: adminProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(500).optional(),
            source: z.enum(["backend", "frontend"]).optional(),
            resolved: z.boolean().optional(),
            search: z.string().max(200).optional(),
          })
          .optional()
      )
      .query(({ input }) => getErrorLog(input ?? {})),
    errorLogSummary: adminProcedure.query(() => getErrorLogSummary()),
    markErrorResolved: adminProcedure
      .input(
        z.object({ id: z.number().int().positive(), resolved: z.boolean() })
      )
      .mutation(({ input }) => markErrorResolved(input.id, input.resolved)),
    badges: adminProcedure.query(() => getAllBadgesForAdmin()),
    createBadge: adminProcedure
      .input(
        z.object({
          slug: z
            .string()
            .min(2)
            .max(80)
            .regex(/^[a-z0-9-]+$/),
          icon: z.string().min(1).max(40),
          criteriaKey: z.enum([
            "first_lesson",
            "five_lessons",
            "twenty_lessons",
            "first_quiz_pass",
            "perfect_quiz_score",
            "first_certificate",
            "three_certificates",
          ]),
          titleAr: z.string().min(2).max(255),
          titleFr: z.string().min(2).max(255),
          titleEn: z.string().min(2).max(255),
          descriptionAr: z.string().min(2).max(500),
          descriptionFr: z.string().min(2).max(500),
          descriptionEn: z.string().min(2).max(500),
        })
      )
      .mutation(({ input }) => createBadge(input)),
    setBadgeActive: adminProcedure
      .input(
        z.object({ id: z.number().int().positive(), isActive: z.boolean() })
      )
      .mutation(({ input }) => setBadgeActive(input.id, input.isActive)),
    allSupportTickets: adminProcedure
      .input(
        z
          .object({
            status: z
              .enum(["open", "in_progress", "resolved", "closed"])
              .optional(),
          })
          .optional()
      )
      .query(({ input }) => getAllSupportTickets(input?.status)),
    updateSupportTicketStatus: adminProcedure
      .input(
        z.object({
          ticketId: z.number().int().positive(),
          status: z.enum(["open", "in_progress", "resolved", "closed"]),
        })
      )
      .mutation(({ input }) =>
        updateSupportTicketStatus(input.ticketId, input.status)
      ),
    coupons: adminProcedure.query(() => getAllCoupons()),
    createCoupon: adminProcedure
      .input(
        z.object({
          code: z
            .string()
            .min(3)
            .max(40)
            .regex(/^[A-Za-z0-9-]+$/),
          discountType: z.enum(["percent", "fixed"]),
          discountValue: z.number().int().positive(),
          maxRedemptions: z.number().int().positive().optional(),
          validUntil: z.string().datetime().optional(),
        })
      )
      .mutation(({ input }) =>
        createCoupon({
          ...input,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        })
      ),
    setCouponActive: adminProcedure
      .input(
        z.object({ id: z.number().int().positive(), isActive: z.boolean() })
      )
      .mutation(({ input }) => setCouponActive(input.id, input.isActive)),
  }),
  support: router({
    createTicket: protectedProcedure
      .use(rateLimit("support-ticket-create", 10, 60 * 60 * 1000))
      .input(
        z.object({
          subject: z.string().min(3).max(255),
          message: z.string().min(3).max(5000),
          priority: z.enum(["low", "medium", "high"]).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        createSupportTicket({ userId: ctx.user.id, ...input })
      ),
    myTickets: protectedProcedure.query(({ ctx }) =>
      getUserSupportTickets(ctx.user.id)
    ),
    ticketMessages: protectedProcedure
      .input(z.object({ ticketId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const result = await getTicketMessages({
          ticketId: input.ticketId,
          requesterId: ctx.user.id,
          role: ctx.user.role,
        });
        if (!result)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this ticket",
          });
        return result;
      }),
    addMessage: protectedProcedure
      .use(rateLimit("support-ticket-reply", 30, 60 * 60 * 1000))
      .input(
        z.object({
          ticketId: z.number().int().positive(),
          message: z.string().min(1).max(5000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const ok = await addSupportTicketMessage({
          ticketId: input.ticketId,
          senderId: ctx.user.id,
          role: ctx.user.role,
          message: input.message,
        });
        if (!ok)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this ticket",
          });
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
