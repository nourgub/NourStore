// Tafawoq BAC platform persistence (drizzle/0032_add_tafawoq_bac_platform.sql).
// The rules live in server/tafawoq/platform/; this file only reads and
// writes, with conditional updates wherever two requests could race (lock
// the stream once, review a request once, activate a payment once).
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  coupons,
  couponRedemptions,
  notifications,
  parentLinks,
  referralCodes,
  referralRedemptions,
  tafawoqAssessments,
  tafawoqAttempts,
  tafawoqBankTopics,
  tafawoqContentSettings,
  tafawoqDailyPlans,
  tafawoqEvents,
  tafawoqExams,
  tafawoqSavedTopics,
  tafawoqSecondSubjectChanges,
  tafawoqStreamChanges,
  tafawoqStreamRequests,
  tafawoqStudents,
  tafawoqSubscriptions,
  tafawoqTopicAnswers,
  users,
} from "../../drizzle/schema";
import { getDb } from "./shared";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Database not configured" });
  return db;
}

// ---------------------------------------------------------------------------
// Events (security & product log). Never throws: a logging failure must not
// block the action it describes. Callers never pass secrets.
// ---------------------------------------------------------------------------

export async function logEvent(userId: number | null, event: string, details?: Record<string, unknown>) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(tafawoqEvents).values({
      userId,
      event: event.slice(0, 48),
      detailsJson: details ? JSON.stringify(details).slice(0, 4000) : null,
    });
  } catch (error) {
    console.error("[tafawoq] failed to record event", event, error instanceof Error ? error.message : error);
  }
}

export async function listEvents(input: { event?: string; userId?: number; limit?: number }) {
  const db = await requireDb();
  return db
    .select({
      id: tafawoqEvents.id,
      userId: tafawoqEvents.userId,
      userName: users.name,
      event: tafawoqEvents.event,
      detailsJson: tafawoqEvents.detailsJson,
      createdAt: tafawoqEvents.createdAt,
    })
    .from(tafawoqEvents)
    .leftJoin(users, eq(users.id, tafawoqEvents.userId))
    .where(
      and(
        input.event ? eq(tafawoqEvents.event, input.event) : undefined,
        input.userId ? eq(tafawoqEvents.userId, input.userId) : undefined
      )
    )
    .orderBy(desc(tafawoqEvents.id))
    .limit(Math.min(input.limit ?? 100, 500));
}

// ---------------------------------------------------------------------------
// Student profile: stream lock, second subject, placement, consent
// ---------------------------------------------------------------------------

export async function getStudentById(studentId: number) {
  const db = await requireDb();
  const rows = await db.select().from(tafawoqStudents).where(eq(tafawoqStudents.id, studentId)).limit(1);
  return rows[0];
}

/** Now, truncated: MySQL rounds fractional TIMESTAMPs, possibly into the next second. */
function wholeSecond() {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

/**
 * Locks the stream (and, for the foreign-languages stream, its third
 * language); false when it was already locked (only the first choice counts).
 */
export async function lockStream(studentId: number, stream: string, thirdLanguage: string | null = null) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqStudents)
    .set({ stream: stream as never, schoolLevel: "bac", streamLockedAt: wholeSecond(), secondSubject: null, thirdLanguage })
    .where(and(eq(tafawoqStudents.id, studentId), isNull(tafawoqStudents.streamLockedAt)));
  return result.affectedRows === 1;
}

/**
 * Sets the third language of a student already locked into the languages
 * stream without one (accounts created before languages were offered);
 * false when a language was already set.
 */
export async function lockThirdLanguage(studentId: number, thirdLanguage: string) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqStudents)
    .set({ thirdLanguage })
    .where(and(eq(tafawoqStudents.id, studentId), eq(tafawoqStudents.stream, "langues" as never), isNull(tafawoqStudents.thirdLanguage)));
  return result.affectedRows === 1;
}

/** Admin only: moves a student to another stream / third language (their second subject is reset). */
export async function adminSetStream(studentId: number, stream: string, thirdLanguage: string | null = null) {
  const db = await requireDb();
  await db
    .update(tafawoqStudents)
    .set({ stream: stream as never, schoolLevel: "bac", streamLockedAt: wholeSecond(), secondSubject: null, thirdLanguage })
    .where(eq(tafawoqStudents.id, studentId));
}

export async function setSecondSubject(studentId: number, subject: string | null) {
  const db = await requireDb();
  await db.update(tafawoqStudents).set({ secondSubject: subject }).where(eq(tafawoqStudents.id, studentId));
}

export async function recordSecondSubjectChange(input: {
  studentId: number;
  fromSubject: string | null;
  toSubject: string | null;
  changedBy: number;
  byAdmin: boolean;
}) {
  const db = await requireDb();
  await db.insert(tafawoqSecondSubjectChanges).values({ ...input, byAdmin: input.byAdmin ? 1 : 0 });
}

/** Changes the student made themselves (not first choices, not admin edits) since `since`. */
export async function countOwnSecondSubjectChanges(studentId: number, since: Date) {
  const db = await requireDb();
  const [row] = await db
    .select({ value: count() })
    .from(tafawoqSecondSubjectChanges)
    .where(
      and(
        eq(tafawoqSecondSubjectChanges.studentId, studentId),
        eq(tafawoqSecondSubjectChanges.byAdmin, 0),
        sql`${tafawoqSecondSubjectChanges.fromSubject} IS NOT NULL`,
        gte(tafawoqSecondSubjectChanges.createdAt, since)
      )
    );
  return row?.value ?? 0;
}

export async function markPlacementDone(studentId: number) {
  const db = await requireDb();
  await db.update(tafawoqStudents).set({ placementDoneAt: new Date() }).where(eq(tafawoqStudents.id, studentId));
}

export async function setShareChats(studentId: number, share: boolean) {
  const db = await requireDb();
  await db.update(tafawoqStudents).set({ shareChatsWithParent: share ? 1 : 0 }).where(eq(tafawoqStudents.id, studentId));
}

export async function addBonusCredit(studentId: number, days: number) {
  const db = await requireDb();
  await db
    .update(tafawoqStudents)
    .set({ bonusDaysCredit: sql`${tafawoqStudents.bonusDaysCredit} + ${days}` })
    .where(eq(tafawoqStudents.id, studentId));
}

/** Takes the whole bonus credit (returns how many days were taken). */
export async function takeBonusCredit(studentId: number) {
  const db = await requireDb();
  const student = await getStudentById(studentId);
  const days = student?.bonusDaysCredit ?? 0;
  if (days <= 0) return 0;
  const [result] = await db
    .update(tafawoqStudents)
    .set({ bonusDaysCredit: 0 })
    .where(and(eq(tafawoqStudents.id, studentId), eq(tafawoqStudents.bonusDaysCredit, days)));
  return result.affectedRows === 1 ? days : 0;
}

export async function listStudents(input: { search?: string; stream?: string; limit?: number }) {
  const db = await requireDb();
  const search = input.search?.trim();
  return db
    .select({
      studentId: tafawoqStudents.id,
      userId: tafawoqStudents.userId,
      displayName: tafawoqStudents.displayName,
      stream: tafawoqStudents.stream,
      thirdLanguage: tafawoqStudents.thirdLanguage,
      streamLockedAt: tafawoqStudents.streamLockedAt,
      secondSubject: tafawoqStudents.secondSubject,
      placementDoneAt: tafawoqStudents.placementDoneAt,
      createdAt: tafawoqStudents.createdAt,
      email: users.email,
      accountStatus: users.accountStatus,
      lastSignedIn: users.lastSignedIn,
    })
    .from(tafawoqStudents)
    .innerJoin(users, eq(users.id, tafawoqStudents.userId))
    .where(
      and(
        input.stream ? eq(tafawoqStudents.stream, input.stream as never) : undefined,
        search ? or(like(tafawoqStudents.displayName, `%${search}%`), like(users.email, `%${search}%`)) : undefined
      )
    )
    .orderBy(desc(tafawoqStudents.id))
    .limit(Math.min(input.limit ?? 100, 500));
}

export async function setAccountStatus(userId: number, status: "active" | "suspended") {
  const db = await requireDb();
  await db.update(users).set({ accountStatus: status }).where(eq(users.id, userId));
}

export async function getUserBasic(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, accountStatus: users.accountStatus })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0];
}

// ---------------------------------------------------------------------------
// Stream change requests and the change log
// ---------------------------------------------------------------------------

export async function createStreamRequest(input: {
  studentId: number;
  userId: number;
  fromStream: string;
  toStream: string;
  fromLanguage?: string | null;
  toLanguage?: string | null;
  reason: string;
}) {
  const db = await requireDb();
  const result = await db.insert(tafawoqStreamRequests).values(input).$returningId();
  return result[0].id;
}

export async function getPendingStreamRequest(studentId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqStreamRequests)
    .where(and(eq(tafawoqStreamRequests.studentId, studentId), eq(tafawoqStreamRequests.status, "pending")))
    .orderBy(desc(tafawoqStreamRequests.id))
    .limit(1);
  return rows[0];
}

export async function listStudentStreamRequests(studentId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqStreamRequests)
    .where(eq(tafawoqStreamRequests.studentId, studentId))
    .orderBy(desc(tafawoqStreamRequests.id))
    .limit(20);
}

export async function getStreamRequest(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(tafawoqStreamRequests).where(eq(tafawoqStreamRequests.id, id)).limit(1);
  return rows[0];
}

export async function listStreamRequests(status?: "pending" | "approved" | "rejected") {
  const db = await requireDb();
  return db
    .select({
      id: tafawoqStreamRequests.id,
      studentId: tafawoqStreamRequests.studentId,
      userId: tafawoqStreamRequests.userId,
      studentName: tafawoqStudents.displayName,
      fromStream: tafawoqStreamRequests.fromStream,
      toStream: tafawoqStreamRequests.toStream,
      fromLanguage: tafawoqStreamRequests.fromLanguage,
      toLanguage: tafawoqStreamRequests.toLanguage,
      reason: tafawoqStreamRequests.reason,
      status: tafawoqStreamRequests.status,
      reviewNote: tafawoqStreamRequests.reviewNote,
      createdAt: tafawoqStreamRequests.createdAt,
      reviewedAt: tafawoqStreamRequests.reviewedAt,
    })
    .from(tafawoqStreamRequests)
    .innerJoin(tafawoqStudents, eq(tafawoqStudents.id, tafawoqStreamRequests.studentId))
    .where(status ? eq(tafawoqStreamRequests.status, status) : undefined)
    .orderBy(desc(tafawoqStreamRequests.id))
    .limit(200);
}

/** Reviews a pending request once; false if someone already reviewed it. */
export async function resolveStreamRequest(
  id: number,
  status: "approved" | "rejected",
  adminId: number,
  note: string | null
) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqStreamRequests)
    .set({ status, reviewedBy: adminId, reviewNote: note, reviewedAt: new Date() })
    .where(and(eq(tafawoqStreamRequests.id, id), eq(tafawoqStreamRequests.status, "pending")));
  return result.affectedRows === 1;
}

export async function recordStreamChange(input: {
  studentId: number;
  studentName: string;
  fromStream: string;
  toStream: string;
  fromLanguage?: string | null;
  toLanguage?: string | null;
  reason: string;
  adminId: number;
  adminName: string | null;
  requestId: number | null;
}) {
  const db = await requireDb();
  await db.insert(tafawoqStreamChanges).values(input);
}

export async function listStreamChanges(limit = 200) {
  const db = await requireDb();
  return db.select().from(tafawoqStreamChanges).orderBy(desc(tafawoqStreamChanges.id)).limit(limit);
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export async function createSubscription(input: {
  userId: number;
  plan: string;
  months: number;
  priceDa: number;
  amountDa: number;
  couponId: number | null;
  referralCodeId: number | null;
  paymentMethod: string;
  paymentReference: string | null;
}) {
  const db = await requireDb();
  const result = await db.insert(tafawoqSubscriptions).values(input).$returningId();
  return result[0].id;
}

export async function getSubscription(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(tafawoqSubscriptions).where(eq(tafawoqSubscriptions.id, id)).limit(1);
  return rows[0];
}

export async function listUserSubscriptions(userId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqSubscriptions)
    .where(eq(tafawoqSubscriptions.userId, userId))
    .orderBy(desc(tafawoqSubscriptions.id))
    .limit(50);
}

/** The subscription covering `at` (active, started, not ended). */
export async function getCurrentSubscription(userId: number, at = new Date()) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqSubscriptions)
    .where(
      and(
        eq(tafawoqSubscriptions.userId, userId),
        eq(tafawoqSubscriptions.status, "active"),
        lte(tafawoqSubscriptions.startsAt, at),
        gt(tafawoqSubscriptions.endsAt, at)
      )
    )
    .orderBy(desc(tafawoqSubscriptions.endsAt))
    .limit(1);
  return rows[0];
}

/** Latest end among active subscriptions (a renewal starts after it). */
export async function getLatestActiveEnd(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ endsAt: tafawoqSubscriptions.endsAt })
    .from(tafawoqSubscriptions)
    .where(and(eq(tafawoqSubscriptions.userId, userId), eq(tafawoqSubscriptions.status, "active")))
    .orderBy(desc(tafawoqSubscriptions.endsAt))
    .limit(1);
  return rows[0]?.endsAt ?? null;
}

export async function getPendingSubscription(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqSubscriptions)
    .where(and(eq(tafawoqSubscriptions.userId, userId), eq(tafawoqSubscriptions.status, "pending_payment")))
    .orderBy(desc(tafawoqSubscriptions.id))
    .limit(1);
  return rows[0];
}

/** Activates a pending subscription once (false if already reviewed). */
export async function activateSubscription(input: {
  id: number;
  startsAt: Date;
  endsAt: Date;
  bonusDays: number;
  adminId: number;
  note: string | null;
}) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqSubscriptions)
    .set({
      status: "active",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      bonusDays: input.bonusDays,
      reviewedBy: input.adminId,
      reviewNote: input.note,
      reviewedAt: new Date(),
    })
    .where(and(eq(tafawoqSubscriptions.id, input.id), eq(tafawoqSubscriptions.status, "pending_payment")));
  return result.affectedRows === 1;
}

export async function closeSubscription(
  id: number,
  status: "rejected" | "canceled",
  adminId: number | null,
  note: string | null,
  fromStatuses: Array<"pending_payment" | "active">
) {
  const db = await requireDb();
  const [result] = await db
    .update(tafawoqSubscriptions)
    .set({ status, reviewedBy: adminId, reviewNote: note, reviewedAt: new Date() })
    .where(and(eq(tafawoqSubscriptions.id, id), inArray(tafawoqSubscriptions.status, fromStatuses)));
  return result.affectedRows === 1;
}

/** Adds days to the user's latest active subscription; false when none. */
export async function extendLatestActive(userId: number, days: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqSubscriptions)
    .where(
      and(
        eq(tafawoqSubscriptions.userId, userId),
        eq(tafawoqSubscriptions.status, "active"),
        gt(tafawoqSubscriptions.endsAt, new Date())
      )
    )
    .orderBy(desc(tafawoqSubscriptions.endsAt))
    .limit(1);
  const latest = rows[0];
  if (!latest?.endsAt) return false;
  await db
    .update(tafawoqSubscriptions)
    .set({
      endsAt: new Date(latest.endsAt.getTime() + days * 86_400_000),
      bonusDays: latest.bonusDays + days,
    })
    .where(eq(tafawoqSubscriptions.id, latest.id));
  return true;
}

export async function listSubscriptions(status?: "pending_payment" | "active" | "rejected" | "canceled") {
  const db = await requireDb();
  return db
    .select({
      id: tafawoqSubscriptions.id,
      userId: tafawoqSubscriptions.userId,
      userName: users.name,
      email: users.email,
      plan: tafawoqSubscriptions.plan,
      months: tafawoqSubscriptions.months,
      priceDa: tafawoqSubscriptions.priceDa,
      amountDa: tafawoqSubscriptions.amountDa,
      paymentMethod: tafawoqSubscriptions.paymentMethod,
      paymentReference: tafawoqSubscriptions.paymentReference,
      status: tafawoqSubscriptions.status,
      startsAt: tafawoqSubscriptions.startsAt,
      endsAt: tafawoqSubscriptions.endsAt,
      bonusDays: tafawoqSubscriptions.bonusDays,
      createdAt: tafawoqSubscriptions.createdAt,
      reviewNote: tafawoqSubscriptions.reviewNote,
    })
    .from(tafawoqSubscriptions)
    .innerJoin(users, eq(users.id, tafawoqSubscriptions.userId))
    .where(status ? eq(tafawoqSubscriptions.status, status) : undefined)
    .orderBy(desc(tafawoqSubscriptions.id))
    .limit(300);
}

/** Active subscriptions ending between `from` and `to`. */
export async function listSubscriptionsEndingBetween(from: Date, to: Date) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqSubscriptions)
    .where(
      and(
        eq(tafawoqSubscriptions.status, "active"),
        gt(tafawoqSubscriptions.endsAt, from),
        lte(tafawoqSubscriptions.endsAt, to)
      )
    );
}

// ---------------------------------------------------------------------------
// Coupons and referrals (the platform's existing tables)
// ---------------------------------------------------------------------------

export async function getCouponByCode(code: string) {
  const db = await requireDb();
  const rows = await db.select().from(coupons).where(eq(coupons.code, code.trim().toUpperCase())).limit(1);
  return rows[0];
}

export async function hasRedeemedCoupon(couponId: number, userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ id: couponRedemptions.id })
    .from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, couponId), eq(couponRedemptions.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

/** Records a coupon use once per user and counts it; false when already used. */
export async function redeemCoupon(couponId: number, userId: number) {
  const db = await requireDb();
  try {
    await db.insert(couponRedemptions).values({ couponId, userId });
  } catch {
    return false;
  }
  await db
    .update(coupons)
    .set({ timesRedeemed: sql`${coupons.timesRedeemed} + 1` })
    .where(eq(coupons.id, couponId));
  return true;
}

export async function createCoupon(input: {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxRedemptions: number | null;
  validUntil: Date | null;
}) {
  const db = await requireDb();
  await db.insert(coupons).values({ ...input, code: input.code.trim().toUpperCase() });
}

export async function listCoupons() {
  const db = await requireDb();
  return db.select().from(coupons).orderBy(desc(coupons.id)).limit(200);
}

export async function setCouponActive(id: number, active: boolean) {
  const db = await requireDb();
  await db.update(coupons).set({ isActive: active ? 1 : 0 }).where(eq(coupons.id, id));
}

export async function getOrCreateReferralCode(userId: number, makeCode: () => string) {
  const db = await requireDb();
  const existing = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await db.insert(referralCodes).values({ userId, code: makeCode() });
      break;
    } catch {
      // Code collision (or a concurrent insert for this user): try again.
    }
  }
  const rows = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  return rows[0];
}

export async function getReferralCodeByCode(code: string) {
  const db = await requireDb();
  const rows = await db.select().from(referralCodes).where(eq(referralCodes.code, code.trim().toUpperCase())).limit(1);
  return rows[0];
}

export async function getReferralRedemption(referredUserId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referredUserId, referredUserId))
    .limit(1);
  return rows[0];
}

export async function createReferralRedemption(referralCodeId: number, referredUserId: number) {
  const db = await requireDb();
  try {
    await db.insert(referralRedemptions).values({ referralCodeId, referredUserId });
    return true;
  } catch {
    return false;
  }
}

/** Marks the referral reward granted once; false when it already was. */
export async function claimReferralReward(redemptionId: number) {
  const db = await requireDb();
  const [result] = await db
    .update(referralRedemptions)
    .set({ rewardGranted: 1 })
    .where(and(eq(referralRedemptions.id, redemptionId), eq(referralRedemptions.rewardGranted, 0)));
  return result.affectedRows === 1;
}

export async function getReferralCodeById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(referralCodes).where(eq(referralCodes.id, id)).limit(1);
  return rows[0];
}

export async function countReferrals(referralCodeId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ rewardGranted: referralRedemptions.rewardGranted })
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referralCodeId, referralCodeId));
  return { total: rows.length, rewarded: rows.filter(row => row.rewardGranted === 1).length };
}

// ---------------------------------------------------------------------------
// Content switches (admin)
// ---------------------------------------------------------------------------

export async function getContentSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tafawoqContentSettings);
}

export async function setContentSetting(contentKey: string, enabled: boolean, adminId: number) {
  const db = await requireDb();
  await db
    .insert(tafawoqContentSettings)
    .values({ contentKey, enabled: enabled ? 1 : 0, updatedBy: adminId })
    .onDuplicateKeyUpdate({ set: { enabled: enabled ? 1 : 0, updatedBy: adminId } });
}

// ---------------------------------------------------------------------------
// Daily plans
// ---------------------------------------------------------------------------

export async function getDailyPlan(studentId: number, day: string) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqDailyPlans)
    .where(and(eq(tafawoqDailyPlans.studentId, studentId), eq(tafawoqDailyPlans.day, day)))
    .limit(1);
  return rows[0];
}

/** Stores today's plan unless one already exists (then returns the existing one). */
export async function insertDailyPlan(studentId: number, day: string, planJson: string) {
  const db = await requireDb();
  try {
    await db.insert(tafawoqDailyPlans).values({ studentId, day, planJson });
  } catch {
    // Two tabs created the plan at once: keep the first.
  }
  return (await getDailyPlan(studentId, day))!;
}

export async function updateDailyPlan(id: number, planJson: string) {
  const db = await requireDb();
  await db.update(tafawoqDailyPlans).set({ planJson }).where(eq(tafawoqDailyPlans.id, id));
}

export async function listDailyPlans(studentId: number, limit = 120) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqDailyPlans)
    .where(eq(tafawoqDailyPlans.studentId, studentId))
    .orderBy(desc(tafawoqDailyPlans.day))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Activity: days studied, totals, mistakes
// ---------------------------------------------------------------------------

export async function attemptTimesSince(studentId: number, since: Date) {
  const db = await requireDb();
  const rows = await db
    .select({ createdAt: tafawoqAttempts.createdAt })
    .from(tafawoqAttempts)
    .where(and(eq(tafawoqAttempts.studentId, studentId), gte(tafawoqAttempts.createdAt, since)))
    .limit(20000);
  return rows.map(row => row.createdAt);
}

export async function attemptTotals(studentId: number) {
  const db = await requireDb();
  const [row] = await db
    .select({
      answers: count(),
      correct: sql<number>`COALESCE(SUM(${tafawoqAttempts.correct}), 0)`,
    })
    .from(tafawoqAttempts)
    .where(eq(tafawoqAttempts.studentId, studentId));
  return { answers: Number(row?.answers ?? 0), correct: Number(row?.correct ?? 0) };
}

export async function gradedAssessmentIds(studentId: number, ids: number[]) {
  if (!ids.length) return new Set<number>();
  const db = await requireDb();
  const rows = await db
    .select({ id: tafawoqAssessments.id })
    .from(tafawoqAssessments)
    .where(
      and(
        eq(tafawoqAssessments.studentId, studentId),
        inArray(tafawoqAssessments.id, ids),
        eq(tafawoqAssessments.status, "graded")
      )
    );
  return new Set(rows.map(row => row.id));
}

export async function countGradedSets(studentId: number) {
  const db = await requireDb();
  const [row] = await db
    .select({ value: count() })
    .from(tafawoqAssessments)
    .where(and(eq(tafawoqAssessments.studentId, studentId), eq(tafawoqAssessments.status, "graded")));
  return Number(row?.value ?? 0);
}

export async function countGradedPapers(studentId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ kind: tafawoqExams.kind, value: count() })
    .from(tafawoqExams)
    .where(and(eq(tafawoqExams.studentId, studentId), eq(tafawoqExams.status, "graded")))
    .groupBy(tafawoqExams.kind);
  const byKind = new Map(rows.map(row => [row.kind, Number(row.value)]));
  return { mock: byKind.get("mock") ?? 0, weekly: byKind.get("weekly") ?? 0, placement: byKind.get("placement") ?? 0 };
}

/** Recently graded sets with their per-question results (newest first). */
export async function recentGradedResults(studentId: number, limit = 15) {
  const db = await requireDb();
  return db
    .select({
      id: tafawoqAssessments.id,
      lessonKey: tafawoqAssessments.lessonKey,
      kind: tafawoqAssessments.kind,
      score: tafawoqAssessments.score,
      resultJson: tafawoqAssessments.resultJson,
      gradedAt: tafawoqAssessments.gradedAt,
    })
    .from(tafawoqAssessments)
    .where(and(eq(tafawoqAssessments.studentId, studentId), eq(tafawoqAssessments.status, "graded")))
    .orderBy(desc(tafawoqAssessments.id))
    .limit(limit);
}

export async function errorTypeCounts(studentId: number, since?: Date) {
  const db = await requireDb();
  const rows = await db
    .select({ errorType: tafawoqAttempts.errorType, value: count() })
    .from(tafawoqAttempts)
    .where(
      and(
        eq(tafawoqAttempts.studentId, studentId),
        eq(tafawoqAttempts.correct, 0),
        sql`${tafawoqAttempts.errorType} IS NOT NULL`,
        since ? gte(tafawoqAttempts.createdAt, since) : undefined
      )
    )
    .groupBy(tafawoqAttempts.errorType);
  return Object.fromEntries(rows.map(row => [row.errorType!, Number(row.value)]));
}

/** Lessons the student answered questions in since `since`. */
export async function lessonsStudiedSince(studentId: number, since: Date) {
  const db = await requireDb();
  const rows = await db
    .selectDistinct({ lessonKey: tafawoqAttempts.lessonKey })
    .from(tafawoqAttempts)
    .where(and(eq(tafawoqAttempts.studentId, studentId), gte(tafawoqAttempts.createdAt, since)));
  return rows.map(row => row.lessonKey);
}

// ---------------------------------------------------------------------------
// Papers: weekly tests, placement, mock BAC drafts
// ---------------------------------------------------------------------------

export async function getOpenPaper(studentId: number, kind: "mock" | "weekly" | "placement") {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqExams)
    .where(and(eq(tafawoqExams.studentId, studentId), eq(tafawoqExams.kind, kind), eq(tafawoqExams.status, "open")))
    .orderBy(desc(tafawoqExams.id))
    .limit(1);
  return rows[0];
}

export async function getWeeklyPaper(studentId: number, week: string) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(tafawoqExams)
    .where(and(eq(tafawoqExams.studentId, studentId), eq(tafawoqExams.kind, "weekly"), eq(tafawoqExams.weekKey, week)))
    .orderBy(desc(tafawoqExams.id))
    .limit(1);
  return rows[0];
}

export async function savePaperDraft(examId: number, draftJson: string) {
  const db = await requireDb();
  await db
    .update(tafawoqExams)
    .set({ draftJson })
    .where(and(eq(tafawoqExams.id, examId), eq(tafawoqExams.status, "open")));
}

export async function savePaperTime(examId: number, timeJson: string) {
  const db = await requireDb();
  await db.update(tafawoqExams).set({ timeJson }).where(eq(tafawoqExams.id, examId));
}

// ---------------------------------------------------------------------------
// BAC topic bank (admin-published topics, saved topics, answers)
// ---------------------------------------------------------------------------

export type BankTopicInput = {
  subject: string;
  streams: string;
  year: number | null;
  unit: string;
  difficulty: number;
  questionType: string;
  kind: "full" | "single";
  title: string;
  statement: string;
  solution: string;
  methodology: string | null;
  points: number | null;
  commonMistakes: string | null;
  published: boolean;
};

export async function createBankTopic(input: BankTopicInput, adminId: number) {
  const db = await requireDb();
  const result = await db
    .insert(tafawoqBankTopics)
    .values({ ...input, published: input.published ? 1 : 0, createdBy: adminId })
    .$returningId();
  return result[0].id;
}

export async function updateBankTopic(id: number, input: BankTopicInput) {
  const db = await requireDb();
  await db
    .update(tafawoqBankTopics)
    .set({ ...input, published: input.published ? 1 : 0 })
    .where(eq(tafawoqBankTopics.id, id));
}

export async function deleteBankTopic(id: number) {
  const db = await requireDb();
  await db.delete(tafawoqTopicAnswers).where(eq(tafawoqTopicAnswers.topicId, id));
  await db.delete(tafawoqSavedTopics).where(eq(tafawoqSavedTopics.topicId, `db:${id}`));
  await db.delete(tafawoqBankTopics).where(eq(tafawoqBankTopics.id, id));
}

export async function listBankTopics(input: { publishedOnly: boolean }) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqBankTopics)
    .where(input.publishedOnly ? eq(tafawoqBankTopics.published, 1) : undefined)
    .orderBy(desc(tafawoqBankTopics.year), asc(tafawoqBankTopics.id))
    .limit(1000);
}

export async function getBankTopic(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(tafawoqBankTopics).where(eq(tafawoqBankTopics.id, id)).limit(1);
  return rows[0];
}

export async function saveTopicAnswer(studentId: number, topicId: number, answer: string, selfScore: number | null) {
  const db = await requireDb();
  await db.insert(tafawoqTopicAnswers).values({ studentId, topicId, answer, selfScore });
}

export async function listTopicAnswers(studentId: number, topicId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(tafawoqTopicAnswers)
    .where(and(eq(tafawoqTopicAnswers.studentId, studentId), eq(tafawoqTopicAnswers.topicId, topicId)))
    .orderBy(desc(tafawoqTopicAnswers.id))
    .limit(10);
}

export async function listSavedTopics(studentId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ topicId: tafawoqSavedTopics.topicId })
    .from(tafawoqSavedTopics)
    .where(eq(tafawoqSavedTopics.studentId, studentId));
  return rows.map(row => row.topicId);
}

export async function setTopicSaved(studentId: number, topicId: string, saved: boolean) {
  const db = await requireDb();
  if (saved) {
    await db.insert(tafawoqSavedTopics).values({ studentId, topicId }).onDuplicateKeyUpdate({ set: { topicId } });
  } else {
    await db
      .delete(tafawoqSavedTopics)
      .where(and(eq(tafawoqSavedTopics.studentId, studentId), eq(tafawoqSavedTopics.topicId, topicId)));
  }
}

// ---------------------------------------------------------------------------
// Admin analytics and notifications
// ---------------------------------------------------------------------------

/** Answers and success per lesson (most used first). */
export async function lessonUsage() {
  const db = await requireDb();
  const rows = await db
    .select({
      lessonKey: tafawoqAttempts.lessonKey,
      answers: count(),
      correct: sql<number>`COALESCE(SUM(${tafawoqAttempts.correct}), 0)`,
      students: sql<number>`COUNT(DISTINCT ${tafawoqAttempts.studentId})`,
    })
    .from(tafawoqAttempts)
    .groupBy(tafawoqAttempts.lessonKey);
  return rows
    .map(row => ({ ...row, answers: Number(row.answers), correct: Number(row.correct), students: Number(row.students) }))
    .sort((a, b) => b.answers - a.answers);
}

export async function topMisconceptions(limit = 15) {
  const db = await requireDb();
  const rows = await db
    .select({
      lessonKey: tafawoqAttempts.lessonKey,
      misconception: tafawoqAttempts.misconception,
      value: count(),
    })
    .from(tafawoqAttempts)
    .where(and(eq(tafawoqAttempts.correct, 0), sql`${tafawoqAttempts.misconception} IS NOT NULL`))
    .groupBy(tafawoqAttempts.lessonKey, tafawoqAttempts.misconception)
    .orderBy(desc(count()))
    .limit(limit);
  return rows.map(row => ({ ...row, value: Number(row.value) }));
}

export async function globalErrorTypes() {
  const db = await requireDb();
  const rows = await db
    .select({ errorType: tafawoqAttempts.errorType, value: count() })
    .from(tafawoqAttempts)
    .where(and(eq(tafawoqAttempts.correct, 0), sql`${tafawoqAttempts.errorType} IS NOT NULL`))
    .groupBy(tafawoqAttempts.errorType);
  return rows.map(row => ({ errorType: row.errorType!, value: Number(row.value) }));
}

export async function paperStats() {
  const db = await requireDb();
  const rows = await db
    .select({
      kind: tafawoqExams.kind,
      papers: count(),
      average: sql<number>`AVG(${tafawoqExams.score})`,
      passed: sql<number>`COALESCE(SUM(CASE WHEN ${tafawoqExams.score} >= 10 THEN 1 ELSE 0 END), 0)`,
    })
    .from(tafawoqExams)
    .where(eq(tafawoqExams.status, "graded"))
    .groupBy(tafawoqExams.kind);
  return rows.map(row => ({
    kind: row.kind,
    papers: Number(row.papers),
    average: row.average === null ? null : Number(row.average),
    passed: Number(row.passed),
  }));
}

export async function studentsPerStream() {
  const db = await requireDb();
  const rows = await db
    .select({ stream: tafawoqStudents.stream, value: count() })
    .from(tafawoqStudents)
    .where(sql`${tafawoqStudents.streamLockedAt} IS NOT NULL`)
    .groupBy(tafawoqStudents.stream);
  return rows.map(row => ({ stream: row.stream, value: Number(row.value) }));
}

/** User ids of students (optionally of one stream) — for an admin broadcast. */
export async function studentUserIds(stream?: string) {
  const db = await requireDb();
  const rows = await db
    .select({ userId: tafawoqStudents.userId })
    .from(tafawoqStudents)
    .where(stream ? eq(tafawoqStudents.stream, stream as never) : undefined);
  return rows.map(row => row.userId);
}

export async function insertNotifications(rows: Array<{ userId: number; type: string; title: string; body: string }>) {
  if (!rows.length) return;
  const db = await requireDb();
  for (let index = 0; index < rows.length; index += 500) {
    await db.insert(notifications).values(rows.slice(index, index + 500));
  }
}

/** Whether the user already got a notification of this type since `since`. */
export async function hasNotificationSince(userId: number, type: string, since: Date) {
  const db = await requireDb();
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.type, type), gte(notifications.createdAt, since)))
    .limit(1);
  return rows.length > 0;
}

export async function listUserNotifications(userId: number, limit = 20) {
  const db = await requireDb();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.id))
    .limit(limit);
}

export async function markNotificationsRead(userId: number) {
  const db = await requireDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/** Active parent user ids linked to a child. */
export async function parentIdsOf(childUserId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ parentId: parentLinks.parentId })
    .from(parentLinks)
    .where(and(eq(parentLinks.childId, childUserId), eq(parentLinks.status, "active")));
  return rows.map(row => row.parentId);
}
