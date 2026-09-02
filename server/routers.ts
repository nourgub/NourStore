import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { checkRateLimit, getRateLimitStatus } from "./rateLimit";
import { MAX_VIDEO_UPLOAD_BYTES } from "./uploadValidation";
import { createMeetEvent } from "./_core/googleCalendar";
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
import { remindStaleCheckoutSessions } from "./whatsappBot";

const roleProcedure = (
  roles: Array<"learner" | "parent" | "teacher" | "institution" | "admin">,
  message: string
) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.user.role))
      throw new TRPCError({ code: "FORBIDDEN", message });
    return next();
  });
const adminProcedure = roleProcedure(["admin"], "Admin access required");
const parentProcedure = roleProcedure(
  ["parent", "admin"],
  "Parent access required"
);
const teacherProcedure = roleProcedure(
  ["teacher", "admin"],
  "Teacher access required"
);
const institutionProcedure = roleProcedure(
  ["institution", "admin"],
  "Institution access required"
);
const learnerProcedure = roleProcedure(
  ["learner", "admin"],
  "Learner access required"
);

/** Per-user rate-limit guard, chainable onto any procedure that already has ctx.user (i.e. after protectedProcedure/roleProcedure). */
type RateLimitMiddleware = Parameters<typeof protectedProcedure.use>[0];
const rateLimit = (
  name: string,
  max: number,
  windowMs: number
): RateLimitMiddleware =>
  (async (opts: {
    ctx: { user: { id: number } };
    next: () => unknown;
  }) => {
    if (!(await checkRateLimit(`${name}:${opts.ctx.user.id}`, max, windowMs))) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests, please try again later",
      });
    }
    return opts.next();
  }) as unknown as RateLimitMiddleware;

export const appRouter = router({
  diagnostics: router({
    // A real, honest way for the frontend to report an unhandled error
    // back to the self-hosted error log (see server/db/errorLog.ts) —
    // public since a person might not be logged in when the error
    // happens, rate-limited so it can't be abused as a spam vector.
    reportFrontendError: publicProcedure
      .input(
        z.object({
          message: z.string().max(2000),
          stack: z.string().max(8000).optional(),
          context: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (
          !(await checkRateLimit(
            `frontend-error-report:${ctx.req.headers["x-forwarded-for"] || ctx.req.socket?.remoteAddress || "unknown"}`,
            30,
            60 * 60 * 1000
          ))
        ) {
          return { ok: true }; // silently drop, never let error reporting itself throw a visible error
        }
        await logError({
          source: "frontend",
          message: input.message,
          stack: input.stack,
          context: input.context,
          userId: ctx.user?.id,
          userAgent: ctx.req.headers["user-agent"],
        });
        return { ok: true };
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? toPublicUser(opts.ctx.user) : null)),
    // Real email + password sign-up/sign-in — no external service, no
    // third-party account, works entirely self-hosted. Rate-limited by IP
    // via the session-less protectedProcedure not applying here (these are
    // public, pre-authentication endpoints) — rate-limited by email/openId
    // instead via the shared in-memory limiter.
    registerWithEmail: publicProcedure
      .input(
        z.object({
          email: z.string().email().max(320),
          password: z.string().min(1).max(200),
          name: z.string().min(2).max(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (
          !(await checkRateLimit(
            `email-register:${input.email.toLowerCase()}`,
            5,
            60 * 60 * 1000
          ))
        )
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many attempts, try again later",
          });
        const strength = validatePasswordStrength(input.password);
        if (!strength.ok)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: strength.reason,
          });
        const openId = emailOpenId(input.email);
        const passwordHash = await hashPassword(input.password);
        const result = await createEmailUser({
          openId,
          email: input.email.trim().toLowerCase(),
          name: input.name,
          passwordHash,
        });
        if (!result.ok)
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        const sessionToken = await createSessionToken(openId, {
          name: input.name,
        });
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: ONE_YEAR_MS,
        });
        return { ok: true };
      }),
    loginWithEmail: publicProcedure
      .input(
        z.object({
          email: z.string().email().max(320),
          password: z.string().min(1).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const openId = emailOpenId(input.email);
        if (!(await checkRateLimit(`email-login:${openId}`, 10, 15 * 60 * 1000)))
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many attempts, try again later",
          });
        const record = await getEmailUserPasswordHash(openId);
        const valid = await verifyPassword(input.password, record?.passwordHash ?? null);
        if (!valid)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        if (record?.accountStatus === "pending")
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your account is pending activation by an administrator.",
          });
        if (record?.accountStatus === "suspended")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been suspended.",
          });
        await markUserSignedIn(openId);
        const sessionToken = await createSessionToken(openId, {});
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: ONE_YEAR_MS,
        });
        return { ok: true };
      }),
    // A visitor's one-time choice of account category at onboarding.
    // "admin" is intentionally not an option here — see chooseOwnRole in db.ts.
    chooseRole: protectedProcedure
      .use(rateLimit("choose-role", 5, 60 * 60 * 1000))
      .input(z.object({ role: z.enum(["learner", "teacher", "institution"]) }))
      .mutation(async ({ ctx, input }) => {
        const result = await chooseOwnRole(ctx.user.id, input.role);
        if (!result.ok)
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Account type has already been chosen — contact an admin to change it.",
          });
        return result;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  learning: router({
    courses: publicProcedure.query(() => getPublishedCourses()),
    search: publicProcedure
      .input(
        z.object({
          query: z.string().trim().min(2).max(80),
          level: z
            .enum([
              "starter",
              "foundation",
              "intermediate",
              "advanced",
              "exam",
              "professional",
            ])
            .optional(),
          subject: z.string().min(1).max(40).optional(),
          limit: z.number().int().min(1).max(30).default(10),
        })
      )
      .query(({ input }) => searchLearningContent(input)),
    course: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(160) }))
      .query(({ ctx, input }) =>
        getCourseWithCurriculum(
          input.slug,
          ctx.user ? { id: ctx.user.id, role: ctx.user.role } : null
        )
      ),
    lessonAssets: protectedProcedure
      .input(z.object({ lessonId: z.number().int().positive() }))
      .query(({ ctx, input }) => getLessonAssets(input.lessonId, ctx.user.id)),
    // Full lesson content (video/text/live link/attachments) — gated behind
    // enrollment + published + (free course or active subscription), and
    // reports server-enforced sequencing (locked) rather than trusting the client.
    lesson: protectedProcedure
      .input(z.object({ lessonId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        getLessonForLearner(input.lessonId, ctx.user.id)
      ),
    algorithmExercise: publicProcedure
      .input(z.object({ slug: z.string().min(1).max(160) }))
      .query(({ input }) => getAlgorithmExerciseBySlug(input.slug)),
    algorithmExercises: publicProcedure.query(() =>
      getPublishedAlgorithmExercises()
    ),
    subjects: publicProcedure.query(() => getActiveSubjects()),
    badges: publicProcedure.query(() => getAllBadges()),
  }),
  algorithmLab: router({
    // The learner's code is actually executed here, server-side, against the
    // exercise's real test cases (shared/pseudocodeInterpreter.ts) — the
    // server computes status/passedTests/totalTests itself and never trusts
    // a client-submitted grade (a client-trusted grade would let anyone
    // fake a "passed" result via a raw API call, no code required).
    submitAttempt: protectedProcedure
      .use(rateLimit("algo-attempt", 30, 60 * 60 * 1000))
      .input(
        z.object({
          exerciseId: z.number().int().positive(),
          code: z.string().min(1).max(20000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const exercise = await getAlgorithmExerciseById(input.exerciseId);
        if (!exercise || exercise.isPublished !== 1) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Exercise not found" });
        }
        const graded = gradeAlgorithmAttempt(exercise, input.code);
        await saveAlgorithmAttempt({
          exerciseId: input.exerciseId,
          userId: ctx.user.id,
          code: input.code,
          status: graded.status,
          passedTests: graded.passedTests,
          totalTests: graded.totalTests,
          feedbackJson: JSON.stringify(graded.feedback),
        });
        return graded;
      }),
    myAttempts: protectedProcedure
      .input(z.object({ exerciseId: z.number().int().positive().optional() }))
      .query(({ ctx, input }) =>
        getAlgorithmAttemptsForUser(ctx.user.id, input.exerciseId)
      ),
  }),
  learner: router({
    createInvite: learnerProcedure
      .use(rateLimit("parent-invite-create", 5, 60 * 60 * 1000))
      .mutation(({ ctx }) => createParentInvite(ctx.user.id)),
    cancelInvite: learnerProcedure
      .input(z.object({ inviteId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        cancelParentInvite({
          inviteId: input.inviteId,
          requesterId: ctx.user.id,
          role: ctx.user.role,
        })
      ),
    myReports: learnerProcedure.query(({ ctx }) =>
      getReportsForLearner(ctx.user.id)
    ),
  }),
  parent: router({
    links: parentProcedure.query(({ ctx }) => getParentLinks(ctx.user.id)),
    dashboard: parentProcedure.query(({ ctx }) =>
      getParentDashboard(ctx.user.id)
    ),
    reports: parentProcedure.query(({ ctx }) => getReportsForParent(ctx.user.id)),
    createInvite: adminProcedure
      .input(z.object({ childId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const invite = await createParentInvite(input.childId);
        if (!invite)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Child account not found",
          });
        return invite;
      }),
    // Restricted to role=parent (or admin), matching the brief exactly: any other
    // authenticated role must not be able to accept a parent invite.
    acceptInvite: parentProcedure
      .use(rateLimit("parent-invite-accept", 10, 60 * 60 * 1000))
      .input(z.object({ code: z.string().min(6).max(32) }))
      .mutation(({ ctx, input }) =>
        acceptParentInvite(ctx.user.id, input.code)
      ),
    unlink: protectedProcedure
      .input(z.object({ linkId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        unlinkParent({
          linkId: input.linkId,
          requesterId: ctx.user.id,
          role: ctx.user.role,
        })
      ),
  }),
  platform: router({
    whatsapp: publicProcedure.query(async () => {
      const value = await getPlatformSetting("whatsapp_number");
      return typeof value === "string" && value.trim().length > 0
        ? value
        : null;
    }),
    setWhatsapp: roleProcedure(["admin"], "Admin access required")
      .input(
        z.object({
          number: z
            .string()
            .min(8)
            .max(32)
            .regex(/^\+?[0-9 ()-]+$/),
        })
      )
      .mutation(({ input }) =>
        setPlatformSetting(
          "whatsapp_number",
          input.number.replace(/[^0-9]/g, "")
        )
      ),
    socialLinks: publicProcedure.query(async () => ({
      instagram: (await getPlatformSetting("social_instagram_url")) || null,
      facebook: (await getPlatformSetting("social_facebook_url")) || null,
    })),
    setSocialLinks: roleProcedure(["admin"], "Admin access required")
      .input(
        z.object({
          instagram: z.string().url().max(300).optional().or(z.literal("")),
          facebook: z.string().url().max(300).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ input }) => {
        if (input.instagram !== undefined)
          await setPlatformSetting("social_instagram_url", input.instagram);
        if (input.facebook !== undefined)
          await setPlatformSetting("social_facebook_url", input.facebook);
        return true;
      }),
    paymentRib: roleProcedure(["admin"], "Admin access required").query(
      async () => (await getPlatformSetting("payment_rib_details")) || ""
    ),
    setPaymentRib: roleProcedure(["admin"], "Admin access required")
      .input(z.object({ details: z.string().min(4).max(2000) }))
      .mutation(({ input }) =>
        setPlatformSetting("payment_rib_details", input.details)
      ),
    pendingPaymentReceipts: roleProcedure(
      ["admin"],
      "Admin access required"
    ).query(() => getPendingPaymentReceipts()),
    reviewPaymentReceipt: roleProcedure(["admin"], "Admin access required")
      .input(
        z.object({
          receiptId: z.number().int().positive(),
          approve: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await reviewPaymentReceipt({
          receiptId: input.receiptId,
          approve: input.approve,
          reviewerId: ctx.user.id,
        });
        await logAdminAction({
          actorId: ctx.user.id,
          action: input.approve
            ? "approve_payment_receipt"
            : "reject_payment_receipt",
          targetType: "payment_receipt",
          targetId: input.receiptId,
        });
        return result;
      }),
  }),
  subscriptions: router({
    plans: publicProcedure
      .input(
        z
          .object({
            currency: z
              .string()
              .length(3)
              .regex(/^[A-Za-z]{3}$/)
              .optional(),
          })
          .optional()
      )
      .query(({ input }) => getSubscriptionPlans(true, input?.currency)),
    managedPlans: roleProcedure(["admin"], "Admin access required").query(() =>
      getSubscriptionPlans(false)
    ),
    mine: protectedProcedure.query(({ ctx }) =>
      getUserSubscription(ctx.user.id)
    ),
    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await cancelActiveSubscription(ctx.user.id);
      if (!result.ok)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have an active subscription to cancel.",
        });
      return result;
    }),
    myInvoices: protectedProcedure.query(({ ctx }) =>
      getUserInvoices(ctx.user.id)
    ),
    paymentRib: protectedProcedure.query(
      async () => (await getPlatformSetting("payment_rib_details")) || ""
    ),
    uploadPaymentReceipt: protectedProcedure
      .use(rateLimit("upload-payment-receipt", 10, 60 * 60 * 1000))
      .input(
        z.object({
          invoiceId: z.number().int().positive(),
          fileName: z.string().min(1).max(255),
          mimeType: z.string().min(1).max(100),
          sizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
          data: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await submitDirectPaymentReceipt({
          invoiceId: input.invoiceId,
          userId: ctx.user.id,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          data: input.data,
        });
        if (!result.ok) {
          const messages: Record<string, string> = {
            invoice_not_found: "Invoice not found.",
            invoice_not_pending:
              "This invoice is no longer pending — it may already be paid or expired.",
            duplicate_receipt:
              "This exact receipt image has already been submitted before. Please upload a new, real transfer receipt.",
          };
          throw new TRPCError({
            code:
              result.reason === "invoice_not_found" ? "NOT_FOUND" : "BAD_REQUEST",
            message: messages[result.reason] || "Upload rejected: " + result.reason,
          });
        }
        return result;
      }),
    members: roleProcedure(["admin"], "Admin access required").query(() =>
      getSubscriptionMembers()
    ),
    createPlan: roleProcedure(["admin"], "Admin access required")
      .input(
        z.object({
          slug: z
            .string()
            .min(2)
            .max(80)
            .regex(/^[a-z0-9-]+$/),
          planType: z
            .enum(["free", "monthly", "quarterly", "yearly", "one_time"])
            .optional(),
          currency: z
            .string()
            .length(3)
            .regex(/^[A-Za-z]{3}$/)
            .optional(),
          titleAr: z.string().min(2).max(255),
          titleFr: z.string().min(2).max(255),
          titleEn: z.string().min(2).max(255),
          descriptionAr: z.string().min(2),
          descriptionFr: z.string().min(2),
          descriptionEn: z.string().min(2),
          priceCents: z.number().int().min(0).max(100000000),
          durationDays: z.number().int().min(1).max(3650),
        })
      )
      .mutation(({ input }) => createSubscriptionPlan(input)),
    updatePlan: roleProcedure(["admin"], "Admin access required")
      .input(
        z.object({
          id: z.number().int().positive(),
          titleAr: z.string().min(2).max(255),
          titleFr: z.string().min(2).max(255),
          titleEn: z.string().min(2).max(255),
          descriptionAr: z.string().min(2),
          descriptionFr: z.string().min(2),
          descriptionEn: z.string().min(2),
          priceCents: z.number().int().min(0).max(100000000),
          durationDays: z.number().int().min(1).max(3650),
          isActive: z.boolean(),
        })
      )
      .mutation(({ input }) => updateSubscriptionPlan(input)),
    assign: roleProcedure(["admin"], "Admin access required")
      .input(
        z.object({
          userId: z.number().int().positive(),
          planId: z.number().int().positive(),
          durationDays: z.number().int().min(1).max(3650),
          status: z.enum(["trialing", "active", "paused"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await assignSubscription(input);
        if (!result.ok) {
          if (result.reason === "user_not_found")
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "User not found",
            });
          if (result.reason === "plan_not_found")
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Plan not found",
            });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Assignment unavailable",
          });
        }
        await logAdminAction({
          actorId: ctx.user.id,
          action: "assign_subscription",
          targetType: "user",
          targetId: input.userId,
          details: {
            planId: input.planId,
            durationDays: input.durationDays,
            status: input.status,
          },
        });
        return result;
      }),
    planPrices: roleProcedure(["admin"], "Admin access required")
      .input(z.object({ planId: z.number().int().positive() }))
      .query(({ input }) => getPlanPrices(input.planId)),
    setPlanPrice: roleProcedure(["admin"], "Admin access required")
      .input(
        z.object({
          planId: z.number().int().positive(),
          currency: z
            .string()
            .length(3)
            .regex(/^[A-Za-z]{3}$/),
          priceCents: z.number().int().min(0).max(100000000),
        })
      )
      .mutation(({ input }) => setPlanPrice(input)),
  }),
  payments: router({
    // Prepares a real invoice + payment attempt row, but never marks anything
    // paid — that only ever happens from a verified webhook (see
    // paymentsWebhook.ts) or an admin's manual receipt review (see
    // admin.reviewPaymentReceipt). If no provider is configured, this says
    // so honestly instead of pretending a charge could complete.
    initiateCheckout: protectedProcedure
      .use(rateLimit("checkout-initiate", 20, 60 * 60 * 1000))
      .input(
        z.object({
          planId: z.number().int().positive(),
          currency: z
            .string()
            .length(3)
            .regex(/^[A-Za-z]{3}$/),
          provider: z
            .enum(["manual", "baridimob", "whatsapp"])
            .default("manual"),
          returnUrl: z.string().url().optional(),
          couponCode: z.string().min(2).max(40).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const plans = await getSubscriptionPlans(true, input.currency);
        const plan = plans.find(p => p.id === input.planId);
        if (!plan)
          throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
        let finalAmountCents = plan.resolvedPriceCents;
        let appliedCoupon: { id: number; code: string } | null = null;
        let couponMessage: string | undefined;
        if (input.couponCode) {
          const validation = await validateCoupon({
            code: input.couponCode,
            userId: ctx.user.id,
            amountCents: plan.resolvedPriceCents,
          });
          if (validation.ok) {
            finalAmountCents = validation.discountedAmountCents;
            appliedCoupon = {
              id: validation.coupon.id,
              code: validation.coupon.code,
            };
          } else {
            const reasons: Record<typeof validation.reason, string> = {
              not_found: "Coupon code not found.",
              inactive: "This coupon is no longer active.",
              not_yet_valid: "This coupon is not valid yet.",
              expired: "This coupon has expired.",
              max_redemptions_reached:
                "This coupon has reached its usage limit.",
              already_redeemed_by_user: "You have already used this coupon.",
            };
            couponMessage = reasons[validation.reason];
          }
        }
        const invoice = await createInvoice({
          userId: ctx.user.id,
          planId: plan.id,
          currency: plan.resolvedCurrency,
          amountCents: finalAmountCents,
          provider: input.provider,
        });
        if (!invoice)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Checkout unavailable",
          });
        if (appliedCoupon)
          await redeemCoupon({
            couponId: appliedCoupon.id,
            userId: ctx.user.id,
            invoiceId: invoice.id,
          });
        if (input.provider === "baridimob") {
          const checkout = await initiateBaridimobCheckout({
            invoiceId: invoice.id,
            amountCents: finalAmountCents,
            currency: plan.resolvedCurrency,
            returnUrl: input.returnUrl || "",
          });
          if (!checkout.ok) {
            // Never fakes success: the invoice stays "pending" and the person is told exactly why the redirect isn't available yet.
            return {
              invoice,
              providerConfigured: false,
              redirectUrl: null,
              message: checkout.message,
              couponMessage,
              appliedCoupon: appliedCoupon?.code,
            };
          }
          await recordPaymentAttempt({
            invoiceId: invoice.id,
            provider: "baridimob",
            providerReference: checkout.providerReference,
            status: "pending",
          });
          return {
            invoice,
            providerConfigured: true,
            redirectUrl: checkout.redirectUrl,
            message: undefined,
            couponMessage,
            appliedCoupon: appliedCoupon?.code,
          };
        }
        if (input.provider === "whatsapp") {
          // wa.me links require zero API credentials — this always works as
          // long as an admin has saved a WhatsApp contact number. The bot
          // reply (RIB details) only fires once the learner actually sends
          // this pre-filled message and the Cloud API bot is configured
          // separately — see whatsappBot.ts.
          const whatsappNumber = await getPlatformSetting("whatsapp_number");
          if (!whatsappNumber) {
            return {
              invoice,
              providerConfigured: false,
              redirectUrl: null,
              message:
                "No WhatsApp contact number has been configured yet; an admin can grant access manually in the meantime.",
              couponMessage,
              appliedCoupon: appliedCoupon?.code,
            };
          }
          const prefilledText = encodeURIComponent(
            `مرحبًا، أريد الدفع للاشتراك في ${plan.titleAr} — المرجع: NX-INV-${invoice.id} — المبلغ: ${(finalAmountCents / 100).toLocaleString("ar-DZ")} ${plan.resolvedCurrency}`
          );
          return {
            invoice,
            providerConfigured: true,
            redirectUrl: `https://wa.me/${whatsappNumber}?text=${prefilledText}`,
            message: undefined,
            couponMessage,
            appliedCoupon: appliedCoupon?.code,
          };
        }
        return {
          invoice,
          providerConfigured: Boolean(ENV.paymentProvider),
          redirectUrl: null,
          message: ENV.paymentProvider
            ? undefined
            : "No live payment provider is configured on this deployment yet; an admin can grant access manually in the meantime.",
          couponMessage,
          appliedCoupon: appliedCoupon?.code,
        };
      }),
  }),
  progress: router({
    enrollments: protectedProcedure.query(({ ctx }) =>
      getUserEnrollments(ctx.user.id)
    ),
    certificates: protectedProcedure.query(({ ctx }) =>
      getUserCertificates(ctx.user.id)
    ),
    summary: protectedProcedure.query(({ ctx }) =>
      getLearnerSummary(ctx.user.id)
    ),
    skills: protectedProcedure.query(({ ctx }) =>
      getLearnerSkillBreakdown(ctx.user.id)
    ),
    reviewLessons: protectedProcedure.query(({ ctx }) =>
      getRecommendedReviewLessons(ctx.user.id)
    ),
    points: protectedProcedure.query(({ ctx }) => getUserPoints(ctx.user.id)),
    badges: protectedProcedure.query(({ ctx }) => getUserBadges(ctx.user.id)),
    leaderboard: protectedProcedure.query(() => getLeaderboard(20)),
    referralCode: protectedProcedure.query(({ ctx }) =>
      getOrCreateReferralCode(ctx.user.id)
    ),
    referralStats: protectedProcedure.query(({ ctx }) =>
      getReferralStats(ctx.user.id)
    ),
    redeemReferral: protectedProcedure
      .use(rateLimit("referral-redeem", 5, 60 * 60 * 1000))
      .input(z.object({ code: z.string().min(3).max(20) }))
      .mutation(async ({ ctx, input }) => {
        const result = await redeemReferralCode({
          code: input.code,
          referredUserId: ctx.user.id,
        });
        if (!result.ok) {
          if (result.reason === "not_found")
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Referral code not found",
            });
          if (result.reason === "self_referral")
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You cannot use your own referral code",
            });
          if (result.reason === "already_redeemed")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You have already redeemed a referral code",
            });
        }
        return result;
      }),
    // Per-lesson completion map for a course — used to render real (not cosmetic) lesson locking in the curriculum view.
    courseProgress: protectedProcedure
      .input(z.object({ courseId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        getCourseProgressForLearner(ctx.user.id, input.courseId)
      ),
    enroll: protectedProcedure
      .input(z.object({ courseId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const result = await enrollInCourse({
          userId: ctx.user.id,
          courseId: input.courseId,
        });
        if (!result.ok) {
          if (result.reason === "not_found")
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Course not found",
            });
          if (result.reason === "subscription_required")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Active subscription required",
            });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Enrollment unavailable",
          });
        }
        return result;
      }),
    completeLesson: protectedProcedure
      .input(
        z.object({
          lessonId: z.number().int().positive(),
          completed: z.boolean(),
          lastPositionSeconds: z.number().int().min(0).max(86400),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!(await hasActiveSubscription(ctx.user.id)))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Active subscription required",
          });
        const result = await updateLessonProgress({
          userId: ctx.user.id,
          ...input,
        });
        if (!result.ok) {
          if (result.reason === "not_found")
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lesson not found",
            });
          if (result.reason === "not_enrolled")
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You must enroll in this course before tracking progress",
            });
          if (result.reason === "locked")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Complete the previous lesson first",
            });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Progress update unavailable",
          });
        }
        return result;
      }),
  }),
  placement: router({
    current: publicProcedure.query(() => getPlacementTestForPublic()),
    submit: protectedProcedure
      .use(rateLimit("placement-submit", 10, 60 * 60 * 1000))
      .input(
        z.object({
          testId: z.number().int().positive(),
          answersJson: z.string().max(20000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // score/recommendedLevel are always computed server-side from the answerKey-bearing
        // copy; the client is never trusted to report its own score.
        const data = await getPlacementTestWithQuestions();
        if (!data.test || data.test.id !== input.testId)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Placement test not found",
          });
        let answers: Record<string, string> = {};
        try {
          answers = JSON.parse(input.answersJson || "{}");
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid answers",
          });
        }
        const correct = data.questions.filter(
          (q, index) => answers[String(index)] === q.answerKey
        ).length;
        const score = data.questions.length
          ? Math.round((correct / data.questions.length) * 100)
          : 0;
        const recommendedLevel =
          score >= 85
            ? "advanced"
            : score >= 65
              ? "intermediate"
              : score >= 40
                ? "foundation"
                : "starter";
        await savePlacementAttempt({
          userId: ctx.user.id,
          testId: input.testId,
          score,
          recommendedLevel,
          answersJson: JSON.stringify(answers),
        });
        return {
          score,
          recommendedLevel,
          correct,
          total: data.questions.length,
        };
      }),
  }),
  notifications: router({
    mine: protectedProcedure.query(({ ctx }) =>
      getUserNotifications(ctx.user.id)
    ),
    markRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        markNotificationRead({ id: input.id, userId: ctx.user.id })
      ),
  }),
  certificates: router({
    verify: publicProcedure
      .input(
        z.object({
          id: z
            .string()
            .trim()
            .min(6)
            .max(64)
            .regex(/^[A-Za-z0-9_-]+$/),
        })
      )
      .query(async ({ ctx, input }) => {
        // Public and unauthenticated by design (that's the point of a
        // certificate verifier) — rate-limited by IP so it can't be used
        // as an unlimited-cost query hammer or spam vector. Not a brute
        // force concern (certificate ids are nanoid(12), computationally
        // infeasible to enumerate), just basic abuse protection on an
        // endpoint anyone on the internet can hit with zero login.
        if (
          !(await checkRateLimit(
            `certificate-verify:${ctx.req.headers["x-forwarded-for"] || ctx.req.socket?.remoteAddress || "unknown"}`,
            60,
            60 * 60 * 1000
          ))
        )
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests, please try again later",
          });
        return verifyCertificate(input.id);
      }),
    revoke: roleProcedure(["admin"], "Admin access required")
      .input(z.object({ certificateId: z.string().min(6).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const result = await revokeCertificate(input.certificateId);
        await logAdminAction({
          actorId: ctx.user.id,
          action: "revoke_certificate",
          targetType: "certificate",
          targetId: input.certificateId,
        });
        return result;
      }),
    reissue: roleProcedure(["admin"], "Admin access required")
      .input(
        z.object({
          userId: z.number().int().positive(),
          courseId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await reissueCertificate(input);
        await logAdminAction({
          actorId: ctx.user.id,
          action: "reissue_certificate",
          targetType: "course",
          targetId: input.courseId,
          details: { userId: input.userId },
        });
        return result;
      }),
  }),
  quizzes: router({
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
  }),
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
    googleCalendarStatus: teacherProcedure.query(({ ctx }) =>
      getGoogleCalendarStatus(ctx.user.id)
    ),
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
