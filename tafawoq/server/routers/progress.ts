import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rateLimit } from "../_core/procedures";
import {
  getUserEnrollments,
  getUserCertificates,
  getLearnerSummary,
  getLearnerSkillBreakdown,
  getRecommendedReviewLessons,
  getUserPoints,
  getUserBadges,
  getLeaderboard,
  getOrCreateReferralCode,
  getReferralStats,
  redeemReferralCode,
  getCourseProgressForLearner,
  enrollInCourse,
  hasActiveSubscription,
  updateLessonProgress,
} from "../db";

export const progressRouter = router({
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
});
