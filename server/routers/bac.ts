// Tafawoq BAC platform — student, parent and admin procedures. Every rule
// (locked stream, second subject, subscription, ownership) is enforced in
// server/tafawoq/platform/ on the server; inputs are validated here.
import { z } from "zod";
import {
  BAC_SUBJECTS,
  PAYMENT_METHODS,
  PLATFORM_STREAMS,
  SUBSCRIPTION_PLANS,
  TEACHER_ACTIONS,
  THIRD_LANGUAGES,
} from "@shared/bacPlatform";
import { protectedProcedure, router } from "../_core/trpc";
import { adminProcedure, learnerProcedure, parentProcedure, rateLimit, teacherProcedure } from "../_core/procedures";
import * as platform from "../tafawoq/platform/service";
import * as tutoring from "../tafawoq/platform/tutoring";
import * as bacDb from "../db/bacPlatform";
import * as reviews from "../db/contentReviews";
import { allBacLessons, contentInventory } from "../tafawoq/contentInventory";
import * as quality from "../tafawoq/platform/quality";
import * as legal from "../tafawoq/platform/legal";
import { clearReviewCache } from "../tafawoq/platform/reviewPolicy";
import { getLesson } from "../tafawoq/curriculum";
import { setPlatformSetting } from "../db/platformSettings";
import { usageSince } from "../db/usage";
import { logAdminAction } from "../db/adminAudit";
import { TRPCError } from "@trpc/server";

const HOUR = 60 * 60 * 1000;
const id = z.number().int().positive();
const lessonKey = z.string().min(1).max(64);
const stream = z.enum(PLATFORM_STREAMS);
const subject = z.enum(BAC_SUBJECTS);
const paperAnswers = z
  .array(
    z.object({
      questionId: z.string().max(100),
      answer: z.string().max(2000),
      responseMs: z.number().int().min(0).max(3 * HOUR).optional(),
    })
  )
  .max(80);
const style = z.enum(["fusha", "darja", "foreign"]).optional();

export const bacRouter = router({
  /** Onboarding step and what the student's subscription contains. */
  state: learnerProcedure.query(({ ctx }) => platform.state(ctx.user.id)),
  streams: learnerProcedure.query(() => platform.streamsCatalog()),

  chooseStream: learnerProcedure
    .use(rateLimit("bac-stream", 10, HOUR))
    .input(z.object({ stream, language: z.enum(THIRD_LANGUAGES).nullish() }))
    .mutation(({ ctx, input }) => platform.chooseStream(ctx.user.id, input.stream, input.language)),

  chooseThirdLanguage: learnerProcedure
    .use(rateLimit("bac-language", 10, HOUR))
    .input(z.object({ language: z.enum(THIRD_LANGUAGES) }))
    .mutation(({ ctx, input }) => platform.chooseThirdLanguage(ctx.user.id, input.language)),

  chooseSecondSubject: learnerProcedure
    .use(rateLimit("bac-second", 10, HOUR))
    .input(z.object({ subject }))
    .mutation(({ ctx, input }) => platform.chooseSecondSubject(ctx.user.id, input.subject)),

  requestStreamChange: learnerProcedure
    .use(rateLimit("bac-stream-request", 5, 24 * HOUR))
    .input(z.object({ toStream: stream, toLanguage: z.enum(THIRD_LANGUAGES).nullish(), reason: z.string().trim().min(10).max(1000) }))
    .mutation(({ ctx, input }) => platform.requestStreamChange(ctx.user.id, input.toStream, input.reason, input.toLanguage)),

  myStreamRequests: learnerProcedure.query(({ ctx }) => platform.myStreamRequests(ctx.user.id)),

  // Sessions with a human teacher ----------------------------------------------------
  tutors: learnerProcedure.query(({ ctx }) => tutoring.tutorsForStudent(ctx.user.id)),

  bookSession: learnerProcedure
    .use(rateLimit("bac-book-session", 20, 24 * HOUR))
    .input(z.object({ slotId: z.number().int().positive(), subject: z.enum(BAC_SUBJECTS), note: z.string().trim().max(500).nullish() }))
    .mutation(({ ctx, input }) => tutoring.bookSession(ctx.user.id, input)),

  myBookings: learnerProcedure.query(({ ctx }) => tutoring.myBookings(ctx.user.id)),

  cancelBooking: learnerProcedure
    .use(rateLimit("bac-cancel-session", 20, 24 * HOUR))
    .input(z.object({ bookingId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => tutoring.cancelMyBooking(ctx.user.id, input.bookingId)),

  setTeacherVoice: learnerProcedure
    .input(z.object({ voice: z.enum(["male", "female"]) }))
    .mutation(({ ctx, input }) => platform.setTeacherVoice(ctx.user.id, input.voice)),

  setShareChats: learnerProcedure
    .input(z.object({ share: z.boolean() }))
    .mutation(({ ctx, input }) => platform.setShareChats(ctx.user.id, input.share)),

  // Subscription -------------------------------------------------------------
  subscription: learnerProcedure.query(({ ctx }) => platform.subscriptionPage(ctx.user.id)),

  quote: learnerProcedure
    .use(rateLimit("bac-quote", 60, HOUR))
    .input(z.object({ plan: z.enum(SUBSCRIPTION_PLANS), couponCode: z.string().max(40).nullish() }))
    .query(({ ctx, input }) => platform.quoteSubscription(ctx.user.id, input.plan, input.couponCode)),

  requestSubscription: learnerProcedure
    .use(rateLimit("bac-subscribe", 10, HOUR))
    .input(
      z.object({
        plan: z.enum(SUBSCRIPTION_PLANS),
        paymentMethod: z.enum(PAYMENT_METHODS),
        paymentReference: z.string().trim().max(120).nullish(),
        couponCode: z.string().trim().max(40).nullish(),
        referralCode: z.string().trim().max(20).nullish(),
      })
    )
    .mutation(({ ctx, input }) => platform.requestSubscription(ctx.user.id, input)),

  uploadReceipt: learnerProcedure
    .use(rateLimit("bac-receipt", 10, HOUR))
    .input(
      z.object({
        subscriptionId: id,
        file: z.object({ mimeType: z.string().max(40), base64: z.string().max(7_200_000) }),
        reference: z.string().trim().max(120).nullish(),
      })
    )
    .mutation(({ ctx, input }) => platform.uploadReceipt(ctx.user.id, input)),

  cancelPendingSubscription: learnerProcedure
    .input(z.object({ id }))
    .mutation(({ ctx, input }) => platform.cancelPendingSubscription(ctx.user.id, input.id)),

  // Placement ------------------------------------------------------------------
  startPlacement: learnerProcedure
    .use(rateLimit("bac-placement", 10, HOUR))
    .mutation(({ ctx }) => platform.startPlacementTest(ctx.user.id)),

  submitPlacement: learnerProcedure
    .use(rateLimit("bac-placement-submit", 10, HOUR))
    .input(z.object({ examId: id, answers: paperAnswers }))
    .mutation(({ ctx, input }) => platform.submitPlacementTest(ctx.user.id, input.examId, input.answers)),

  placementResult: learnerProcedure.query(({ ctx }) => platform.placementResult(ctx.user.id)),

  // Dashboard, plan, motivation ---------------------------------------------------
  dashboard: learnerProcedure.query(({ ctx }) => platform.dashboard(ctx.user.id)),
  mistakes: learnerProcedure.query(({ ctx }) => platform.myMistakes(ctx.user.id)),
  achievements: learnerProcedure.query(({ ctx }) => platform.achievements(ctx.user.id)),
  markNotificationsRead: learnerProcedure.mutation(({ ctx }) => platform.markNotificationsRead(ctx.user.id)),

  todayPlan: learnerProcedure.query(({ ctx }) => platform.todayPlan(ctx.user.id)),

  startPlanTask: learnerProcedure
    .use(rateLimit("bac-plan-task", 60, HOUR))
    .input(z.object({ taskId: z.string().max(32) }))
    .mutation(({ ctx, input }) => platform.startPlanTask(ctx.user.id, input.taskId)),

  completePlanTask: learnerProcedure
    .input(z.object({ taskId: z.string().max(32) }))
    .mutation(({ ctx, input }) => platform.completePlanTask(ctx.user.id, input.taskId)),

  /** A remedial exercise on one skill (after a mistake). */
  targetedPractice: learnerProcedure
    .use(rateLimit("bac-targeted", 60, HOUR))
    .input(z.object({ lessonKey, skillKey: z.string().min(1).max(64) }))
    .mutation(({ ctx, input }) => platform.targetedPractice(ctx.user.id, input.lessonKey, input.skillKey, 2)),

  // Weekly test ------------------------------------------------------------------
  weekly: learnerProcedure.query(({ ctx }) => platform.weeklyStatus(ctx.user.id)),

  startWeekly: learnerProcedure
    .use(rateLimit("bac-weekly", 10, HOUR))
    .mutation(({ ctx }) => platform.startWeekly(ctx.user.id)),

  submitWeekly: learnerProcedure
    .use(rateLimit("bac-weekly-submit", 10, HOUR))
    .input(z.object({ examId: id, answers: paperAnswers }))
    .mutation(({ ctx, input }) => platform.submitWeekly(ctx.user.id, input.examId, input.answers)),

  // Mock BAC ------------------------------------------------------------------------
  openMock: learnerProcedure.query(({ ctx }) => platform.openMockExam(ctx.user.id)),

  saveMockDraft: learnerProcedure
    .use(rateLimit("bac-mock-draft", 600, HOUR))
    .input(
      z.object({
        examId: id,
        draft: z.record(
          z.string().max(12),
          z.array(z.object({ questionId: z.string().max(64), answer: z.string().max(2000), responseMs: z.number().int().min(0).optional() })).max(20)
        ),
      })
    )
    .mutation(({ ctx, input }) => platform.saveMockDraft(ctx.user.id, input.examId, input.draft)),

  submitMock: learnerProcedure
    .use(rateLimit("tafawoq-submit", 60, HOUR))
    .input(
      z.object({
        examId: id,
        papers: z
          .array(
            z.object({
              assessmentId: id,
              answers: z
                .array(z.object({ questionId: z.string().max(64), answer: z.string().max(500), responseMs: z.number().int().min(0).optional() }))
                .max(50),
            })
          )
          .min(1)
          .max(6),
      })
    )
    .mutation(({ ctx, input }) => platform.submitMock(ctx.user.id, input.examId, input.papers)),

  // Teacher -----------------------------------------------------------------------
  teacherAction: learnerProcedure
    .use(rateLimit("tafawoq-chat", 60, HOUR))
    .input(z.object({ lessonKey, action: z.enum(TEACHER_ACTIONS), skillKey: z.string().max(64).nullish(), style }))
    .mutation(({ ctx, input }) => platform.teacherAction(ctx.user.id, input)),

  // Topic bank ----------------------------------------------------------------------
  bank: learnerProcedure.query(({ ctx }) => platform.bankList(ctx.user.id)),

  openTopic: learnerProcedure
    .use(rateLimit("bac-topic", 60, HOUR))
    .input(z.object({ topicId: z.string().min(3).max(120), seed: z.number().int().positive().max(2 ** 31).optional() }))
    .mutation(({ ctx, input }) => platform.bankOpen(ctx.user.id, input.topicId, input.seed)),

  answerOfficialTopic: learnerProcedure
    .use(rateLimit("bac-topic-answer", 60, HOUR))
    .input(
      z.object({
        topicId: z.string().regex(/^db:\d+$/),
        answer: z.string().trim().min(1).max(20000),
        selfScore: z.number().min(0).max(20).nullish(),
      })
    )
    .mutation(({ ctx, input }) => platform.bankAnswerOfficial(ctx.user.id, input.topicId, input.answer, input.selfScore ?? null)),

  saveTopic: learnerProcedure
    .input(z.object({ topicId: z.string().min(3).max(120), saved: z.boolean() }))
    .mutation(({ ctx, input }) => platform.bankToggleSave(ctx.user.id, input.topicId, input.saved)),

  // Revision & parents ---------------------------------------------------------------
  revisionPack: learnerProcedure.query(({ ctx }) => platform.revisionPack(ctx.user.id)),

  createParentCode: learnerProcedure
    .use(rateLimit("tafawoq-parent-code", 10, HOUR))
    .mutation(({ ctx }) => platform.createParentCode(ctx.user.id)),

  parentOverview: parentProcedure.query(({ ctx }) => platform.parentOverview(ctx.user.id)),

  /** Any signed-in user's own notifications (students, parents). */
  myNotifications: protectedProcedure.query(({ ctx }) => bacDb.listUserNotifications(ctx.user.id, 30)),
  readNotifications: protectedProcedure.mutation(async ({ ctx }) => {
    await bacDb.markNotificationsRead(ctx.user.id);
    return { ok: true };
  }),
});

const bankTopicInput = z.object({
  subject,
  streams: z.array(stream).min(1),
  year: z.number().int().min(1990).max(2100).nullable(),
  unit: z.string().trim().min(2).max(120),
  difficulty: z.number().int().min(1).max(3),
  questionType: z.enum(["written", "mcq", "mixed"]),
  kind: z.enum(["full", "single"]),
  title: z.string().trim().min(2).max(200),
  statement: z.string().trim().min(5).max(50000),
  solution: z.string().trim().min(5).max(50000),
  methodology: z.string().trim().max(10000).nullable(),
  points: z.number().min(0).max(20).nullable(),
  commonMistakes: z.string().trim().max(10000).nullable(),
  published: z.boolean(),
});

const toTopic = (input: z.infer<typeof bankTopicInput>) => ({ ...input, streams: input.streams.join(",") });

const slotsInput = z.object({
  startsAt: z.array(z.coerce.date()).min(1).max(50),
  durationMin: z.number().int().min(30).max(120),
});
const reviewInput = z.object({
  bookingId: z.number().int().positive(),
  action: z.enum(["confirm", "decline", "cancel", "done"]),
  note: z.string().trim().max(1000).nullish(),
});

/** The human teacher's own sessions (a "teacher" account linked to a teacher profile). */
export const bacTutorRouter = router({
  dashboard: teacherProcedure.query(({ ctx }) => tutoring.tutorDashboard(ctx.user.id)),
  addSlots: teacherProcedure
    .use(rateLimit("bac-tutor-slots", 60, HOUR))
    .input(slotsInput)
    .mutation(({ ctx, input }) => tutoring.addSlots({ userId: ctx.user.id, admin: false }, input)),
  cancelSlot: teacherProcedure
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => tutoring.cancelSlot({ userId: ctx.user.id, admin: false }, input.slotId)),
  review: teacherProcedure
    .input(reviewInput)
    .mutation(({ ctx, input }) => tutoring.reviewBooking({ userId: ctx.user.id, admin: false }, input)),
});

export const bacAdminRouter = router({
  overview: adminProcedure.query(() => platform.adminOverview()),

  // Content inventory and the teachers' pedagogical review ---------------------------
  contentInventory: adminProcedure.query(async () => ({
    inventory: contentInventory(),
    lessons: allBacLessons(),
    reviews: await reviews.listContentReviews(),
    // "changed": approved, then the content moved; it needs a new review.
    states: Object.fromEntries(await quality.reviewStates()),
    policy: await quality.contentPolicy(),
  })),
  setContentPolicy: adminProcedure.input(z.object({ policy: z.enum(["trial", "commercial"]) })).mutation(async ({ ctx, input }) => {
    await setPlatformSetting("bac.contentPolicy", input.policy);
    clearReviewCache();
    await logAdminAction({ actorId: ctx.user.id, action: "content_policy", targetType: "setting", targetId: "bac.contentPolicy", details: { policy: input.policy } });
    return { ok: true };
  }),
  contentFlags: adminProcedure
    .input(z.object({ status: z.enum(["open", "reviewing", "resolved", "dismissed"]).default("open") }))
    .query(({ input }) => quality.adminFlags(input.status)),
  setContentFlag: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["reviewing", "resolved", "dismissed"]), adminNote: z.string().trim().max(2000).nullish() }))
    .mutation(({ ctx, input }) => quality.adminSetFlag(ctx.user.id, { id: input.id, status: input.status, adminNote: input.adminNote ?? null })),
  missedQuestions: adminProcedure.query(() => quality.adminMissedQuestions()),
  legalInfo: adminProcedure.query(() => legal.legalInfo()),
  setLegalInfo: adminProcedure
    .input(z.object(Object.fromEntries(legal.LEGAL_FIELDS.map(field => [field, z.string().trim().max(field === "refundPolicy" || field === "dataRetention" ? 3000 : 300).nullish()])) as Record<legal.LegalField, z.ZodOptional<z.ZodNullable<z.ZodString>>>))
    .mutation(async ({ ctx, input }) => {
      const result = await legal.setLegalInfo(input);
      await logAdminAction({ actorId: ctx.user.id, action: "legal_info", targetType: "setting", targetId: "legal", details: { fields: Object.keys(input) } });
      return result;
    }),
  launchReadiness: adminProcedure.query(() => legal.launchReadiness()),
  setContentReview: adminProcedure
    .input(
      z.object({
        lessonKey: z.string().min(1).max(80),
        status: z.enum(["unreviewed", "in_review", "approved", "needs_changes"]),
        reviewerName: z.string().trim().max(120).optional(),
        note: z.string().trim().max(2000).optional(),
        source: z.string().trim().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!allBacLessons().some(lesson => lesson.key === input.lessonKey))
        throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
      // An approval names the teacher who reviewed it.
      if (input.status === "approved" && !input.reviewerName)
        throw new TRPCError({ code: "BAD_REQUEST", message: "REVIEWER_REQUIRED" });
      await reviews.saveContentReview({
        lessonKey: input.lessonKey,
        status: input.status,
        reviewerName: input.reviewerName || null,
        note: input.note || null,
        updatedBy: ctx.user.id,
        contentHash: input.status === "approved" ? quality.lessonContentHash(getLesson(input.lessonKey)!) : null,
        source: input.source || null,
      });
      clearReviewCache();
      await logAdminAction({ actorId: ctx.user.id, action: "content_review", targetType: "lesson", targetId: input.lessonKey, details: { status: input.status, reviewer: input.reviewerName ?? null } });
      return { ok: true };
    }),

  // Daily usage counters (numbers only): AI calls and tokens, emails, bookings.
  usage: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(14) }))
    .query(({ input }) => usageSince(input.days)),

  // Sessions with a human teacher ----------------------------------------------------
  tutors: adminProcedure.query(() => tutoring.adminTutors()),
  saveTutor: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(320).nullish().or(z.literal("")),
        subjects: z.array(z.enum(BAC_SUBJECTS)).min(1),
        bio: z.string().trim().max(1000).nullish(),
        // Paid extra sessions are not sold: any price sent is ignored.
        priceDa: z.number().int().min(0).max(100_000).optional(),
        active: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => tutoring.adminSaveTutor(ctx.user.id, input)),
  tutorSlots: adminProcedure
    .input(z.object({ tutorId: z.number().int().positive() }))
    .query(({ input }) => tutoring.adminTutorSlots(input.tutorId)),
  addTutorSlots: adminProcedure
    .input(slotsInput.extend({ tutorId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => tutoring.addSlots({ userId: ctx.user.id, admin: true }, input)),
  cancelTutorSlot: adminProcedure
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => tutoring.cancelSlot({ userId: ctx.user.id, admin: true }, input.slotId)),
  bookings: adminProcedure
    .input(z.object({ status: z.enum(["requested", "confirmed", "declined", "cancelled", "done"]).optional() }))
    .query(({ input }) => tutoring.adminBookings(input.status)),
  reviewBooking: adminProcedure
    .input(reviewInput)
    .mutation(({ ctx, input }) => tutoring.reviewBooking({ userId: ctx.user.id, admin: true }, input)),

  students: adminProcedure
    .input(z.object({ search: z.string().max(100).optional(), stream: stream.optional() }))
    .query(({ input }) => platform.adminStudents(input)),

  setSecondSubject: adminProcedure
    .input(z.object({ studentId: id, subject: subject.nullable() }))
    .mutation(({ ctx, input }) => platform.adminSetSecondSubject(ctx.user.id, input.studentId, input.subject)),

  setAccountStatus: adminProcedure
    .input(z.object({ userId: id, status: z.enum(["active", "suspended"]) }))
    .mutation(({ ctx, input }) => platform.adminSetAccountStatus(ctx.user.id, input.userId, input.status)),

  streamRequests: adminProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
    .query(({ input }) => bacDb.listStreamRequests(input.status)),

  resolveStreamRequest: adminProcedure
    .input(z.object({ requestId: id, approve: z.boolean(), note: z.string().trim().max(1000).nullish() }))
    .mutation(({ ctx, input }) => platform.adminResolveStreamRequest(ctx.user.id, input.requestId, input.approve, input.note ?? null)),

  streamChanges: adminProcedure.query(() => bacDb.listStreamChanges()),

  subscriptions: adminProcedure
    .input(z.object({ status: z.enum(["pending_payment", "active", "rejected", "canceled"]).optional() }))
    .query(({ input }) => platform.adminSubscriptions(input.status)),

  confirmSubscription: adminProcedure
    .input(
      z.object({
        id,
        // What actually arrived (manual payment): recorded for reconciliation.
        paidAmountDa: z.number().int().min(0).max(1_000_000),
        paidReference: z.string().trim().max(120).nullish(),
        note: z.string().trim().max(1000).nullish(),
      })
    )
    .mutation(({ ctx, input }) =>
      platform.adminConfirmSubscription(ctx.user.id, input.id, input.note ?? null, {
        amountDa: input.paidAmountDa,
        reference: input.paidReference?.trim() || null,
      })
    ),

  closeSubscription: adminProcedure
    .input(z.object({ id, status: z.enum(["rejected", "canceled"]), note: z.string().trim().max(1000).nullish() }))
    .mutation(({ ctx, input }) => platform.adminCloseSubscription(ctx.user.id, input.id, input.status, input.note ?? null)),

  content: adminProcedure.query(() => platform.adminContent()),

  setContent: adminProcedure
    .input(z.object({ key: z.string().regex(/^(subject|lesson):[a-z0-9_-]{1,64}$/), enabled: z.boolean() }))
    .mutation(({ ctx, input }) => platform.adminSetContent(ctx.user.id, input.key, input.enabled)),

  analytics: adminProcedure.query(() => platform.adminAnalytics()),

  broadcast: adminProcedure
    .use(rateLimit("bac-broadcast", 20, HOUR))
    .input(z.object({ title: z.string().trim().min(2).max(200), body: z.string().trim().min(2).max(2000), stream: stream.nullish() }))
    .mutation(({ ctx, input }) => platform.adminBroadcast(ctx.user.id, input)),

  coupons: adminProcedure.query(() => bacDb.listCoupons()),

  createCoupon: adminProcedure
    .input(
      z.object({
        code: z.string().trim().regex(/^[A-Za-z0-9_-]{3,40}$/),
        discountType: z.enum(["percent", "fixed"]),
        // percent: 1–100; fixed: dinars (stored in centimes like the rest of the platform).
        discountValue: z.number().int().min(1).max(1_000_000),
        maxRedemptions: z.number().int().min(1).max(100000).nullable(),
        validUntil: z.coerce.date().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await bacDb.createCoupon({
        ...input,
        discountValue: input.discountType === "percent" ? Math.min(100, input.discountValue) : input.discountValue * 100,
      });
      await bacDb.logEvent(ctx.user.id, "coupon_created", { code: input.code.toUpperCase() });
      return { ok: true };
    }),

  setCouponActive: adminProcedure
    .input(z.object({ id, active: z.boolean() }))
    .mutation(async ({ input }) => {
      await bacDb.setCouponActive(input.id, input.active);
      return { ok: true };
    }),

  events: adminProcedure
    .input(z.object({ event: z.string().max(48).optional(), userId: id.optional() }))
    .query(({ input }) => bacDb.listEvents({ ...input, limit: 200 })),

  settings: adminProcedure.query(() => platform.adminSettings()),

  setSettings: adminProcedure
    .input(
      z.object({
        secondSubjectChange: z.boolean().optional(),
        referralBonusDays: z.number().int().min(0).max(60).optional(),
        paymentInstructions: z.string().max(2000).optional(),
        paymentMethods: z.array(z.enum(PAYMENT_METHODS)).max(PAYMENT_METHODS.length).optional(),
        sessionsPerMonth: z.number().int().min(0).max(30).optional(),
        maxUpcomingSessions: z.number().int().min(1).max(10).optional(),
      })
    )
    .mutation(({ ctx, input }) => platform.adminSetSettings(ctx.user.id, input)),

  bankTopics: adminProcedure.query(() => bacDb.listBankTopics({ publishedOnly: false })),

  createBankTopic: adminProcedure
    .input(bankTopicInput)
    .mutation(async ({ ctx, input }) => ({ id: await bacDb.createBankTopic(toTopic(input), ctx.user.id) })),

  updateBankTopic: adminProcedure
    .input(bankTopicInput.extend({ id }))
    .mutation(async ({ input }) => {
      const { id: topicId, ...rest } = input;
      await bacDb.updateBankTopic(topicId, toTopic(rest));
      return { ok: true };
    }),

  deleteBankTopic: adminProcedure
    .input(z.object({ id }))
    .mutation(async ({ input }) => {
      await bacDb.deleteBankTopic(input.id);
      return { ok: true };
    }),
});
