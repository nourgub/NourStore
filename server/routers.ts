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
import { adminRouter } from "./routers/admin";

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
  admin: adminRouter,
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
