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
import { adminProcedure, learnerProcedure, parentProcedure, rateLimit } from "../_core/procedures";
import * as platform from "../tafawoq/platform/service";
import * as bacDb from "../db/bacPlatform";

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
const style = z.enum(["fusha", "darja"]).optional();

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

export const bacAdminRouter = router({
  overview: adminProcedure.query(() => platform.adminOverview()),

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
    .query(({ input }) => bacDb.listSubscriptions(input.status)),

  confirmSubscription: adminProcedure
    .input(z.object({ id, note: z.string().trim().max(1000).nullish() }))
    .mutation(({ ctx, input }) => platform.adminConfirmSubscription(ctx.user.id, input.id, input.note ?? null)),

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
