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
import { contentRouter } from "./routers/content";
import { teacherRouter } from "./routers/teacher";
import { institutionRouter } from "./routers/institution";

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
  content: contentRouter,
  teacher: teacherRouter,
  institution: institutionRouter,
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
