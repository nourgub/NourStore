import {
  and,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import {
  certificates,
  lessonProgress,
  quizAttempts,
  users,
  badges,
  userBadges,
  pointsLedger,
  referralCodes,
  referralRedemptions,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";
import { createNotification } from "./notifications";
import { nanoid } from "nanoid";

const POINT_VALUES: Record<
  | "lesson_completed"
  | "quiz_passed"
  | "certificate_earned"
  | "algorithm_lab_passed",
  number
> = {
  lesson_completed: 10,
  quiz_passed: 20,
  certificate_earned: 50,
  algorithm_lab_passed: 15,
};

export async function awardPoints(input: {
  userId: number;
  reason: keyof typeof POINT_VALUES;
  refId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(pointsLedger)
    .values({
      userId: input.userId,
      points: POINT_VALUES[input.reason],
      reason: input.reason,
      refId: input.refId,
    });
}

export async function getUserPoints(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ points: pointsLedger.points })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId));
  return rows.reduce((sum, row) => sum + row.points, 0);
}

export async function getLeaderboard(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ userId: pointsLedger.userId, points: pointsLedger.points })
    .from(pointsLedger);
  const totals = new Map<number, number>();
  for (const row of rows)
    totals.set(row.userId, (totals.get(row.userId) ?? 0) + row.points);
  const ranked = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (!ranked.length) return [];
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      inArray(
        users.id,
        ranked.map(([userId]) => userId)
      )
    );
  const nameById = new Map(userRows.map(u => [u.id, u.name]));
  return ranked.map(([userId, points], index) => ({
    rank: index + 1,
    userId,
    name: nameById.get(userId) || `#${userId}`,
    points,
  }));
}

export async function getAllBadges() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(badges)
    .where(eq(badges.isActive, 1))
    .orderBy(badges.createdAt);
}

export async function getAllBadgesForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(badges).orderBy(desc(badges.createdAt));
}

export async function createBadge(input: {
  slug: string;
  icon: string;
  criteriaKey:
    | "first_lesson"
    | "five_lessons"
    | "twenty_lessons"
    | "first_quiz_pass"
    | "perfect_quiz_score"
    | "first_certificate"
    | "three_certificates";
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(badges).values(input);
}

export async function setBadgeActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(badges)
    .set({ isActive: isActive ? 1 : 0 })
    .where(eq(badges.id, id));
  return true;
}

export async function getUserBadges(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: badges.id,
      slug: badges.slug,
      icon: badges.icon,
      titleAr: badges.titleAr,
      titleFr: badges.titleFr,
      titleEn: badges.titleEn,
      descriptionAr: badges.descriptionAr,
      awardedAt: userBadges.awardedAt,
    })
    .from(userBadges)
    .leftJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.awardedAt));
}

export async function checkAndAwardBadges(
  userId: number
): Promise<{ slug: string; titleAr: string }[]> {
  const db = await getDb();
  if (!db) return [];
  const activeBadges = await db
    .select()
    .from(badges)
    .where(eq(badges.isActive, 1));
  if (!activeBadges.length) return [];
  const alreadyAwarded = new Set(
    (
      await db
        .select({ badgeId: userBadges.badgeId })
        .from(userBadges)
        .where(eq(userBadges.userId, userId))
    ).map(r => r.badgeId)
  );
  const candidates = activeBadges.filter(b => !alreadyAwarded.has(b.id));
  if (!candidates.length) return [];

  const completedLessonsCount = (
    await db
      .select({ id: lessonProgress.id })
      .from(lessonProgress)
      .where(
        and(eq(lessonProgress.userId, userId), eq(lessonProgress.completed, 1))
      )
  ).length;
  const passedQuizzesCount = (
    await db
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.passed, 1)))
  ).length;
  const hasPerfectScore =
    (
      await db
        .select({ id: quizAttempts.id })
        .from(quizAttempts)
        .where(
          and(eq(quizAttempts.userId, userId), eq(quizAttempts.score, 100))
        )
    ).length > 0;
  const certificatesCount = (
    await db
      .select({ id: certificates.id })
      .from(certificates)
      .where(eq(certificates.userId, userId))
  ).length;

  const meetsCriteria: Record<string, boolean> = {
    first_lesson: completedLessonsCount >= 1,
    five_lessons: completedLessonsCount >= 5,
    twenty_lessons: completedLessonsCount >= 20,
    first_quiz_pass: passedQuizzesCount >= 1,
    perfect_quiz_score: hasPerfectScore,
    first_certificate: certificatesCount >= 1,
    three_certificates: certificatesCount >= 3,
  };

  const newlyAwarded: { slug: string; titleAr: string }[] = [];
  for (const badge of candidates) {
    if (meetsCriteria[badge.criteriaKey]) {
      await db
        .insert(userBadges)
        .values({ userId, badgeId: badge.id })
        .onDuplicateKeyUpdate({ set: { userId } });
      await createNotification({
        userId,
        type: "badge_earned",
        title: "notifications.badgeEarned",
        body: badge.slug,
      });
      newlyAwarded.push({ slug: badge.slug, titleAr: badge.titleAr });
    }
  }
  return newlyAwarded;
}

const REFERRAL_REWARD_POINTS = 100;

export async function getOrCreateReferralCode(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  const code = nanoid(8)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "0");
  await db.insert(referralCodes).values({ userId, code });
  return (
    await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.userId, userId))
      .limit(1)
  )[0];
}

export type ReferralRedeemResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "self_referral" | "already_redeemed" };

export async function redeemReferralCode(input: {
  code: string;
  referredUserId: number;
}): Promise<ReferralRedeemResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const codeRows = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.code, input.code.toUpperCase()))
    .limit(1);
  const referral = codeRows[0];
  if (!referral) return { ok: false, reason: "not_found" };
  if (referral.userId === input.referredUserId)
    return { ok: false, reason: "self_referral" };
  const existingRedemption = await db
    .select({ id: referralRedemptions.id })
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referredUserId, input.referredUserId))
    .limit(1);
  if (existingRedemption.length)
    return { ok: false, reason: "already_redeemed" };
  await db
    .insert(referralRedemptions)
    .values({
      referralCodeId: referral.id,
      referredUserId: input.referredUserId,
    });
  return { ok: true };
}

export async function grantReferralRewardIfEligible(paidUserId: number) {
  const db = await getDb();
  if (!db) return;
  const redemptionRows = await db
    .select({
      id: referralRedemptions.id,
      referralCodeId: referralRedemptions.referralCodeId,
      rewardGranted: referralRedemptions.rewardGranted,
    })
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referredUserId, paidUserId))
    .limit(1);
  const redemption = redemptionRows[0];
  if (!redemption || redemption.rewardGranted === 1) return;
  const codeRows = await db
    .select({ userId: referralCodes.userId })
    .from(referralCodes)
    .where(eq(referralCodes.id, redemption.referralCodeId))
    .limit(1);
  const referrerId = codeRows[0]?.userId;
  if (!referrerId) return;
  await db
    .update(referralRedemptions)
    .set({ rewardGranted: 1 })
    .where(eq(referralRedemptions.id, redemption.id));
  await db
    .insert(pointsLedger)
    .values({
      userId: referrerId,
      points: REFERRAL_REWARD_POINTS,
      reason: "referral_reward",
      refId: paidUserId,
    });
  await createNotification({
    userId: referrerId,
    type: "referral",
    title: "notifications.referralRewardEarned",
    body: String(REFERRAL_REWARD_POINTS),
  });
}

export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db)
    return { code: null as string | null, totalReferred: 0, rewardedCount: 0 };
  const codeRow = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId))
    .limit(1);
  if (!codeRow[0]) return { code: null, totalReferred: 0, rewardedCount: 0 };
  const redemptions = await db
    .select({ rewardGranted: referralRedemptions.rewardGranted })
    .from(referralRedemptions)
    .where(eq(referralRedemptions.referralCodeId, codeRow[0].id));
  return {
    code: codeRow[0].code,
    totalReferred: redemptions.length,
    rewardedCount: redemptions.filter(r => r.rewardGranted === 1).length,
  };
}
