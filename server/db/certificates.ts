import {
  and,
  desc,
  eq,
} from "drizzle-orm";
import {
  certificates,
  courseEnrollments,
  courses,
  quizAttempts,
  unitQuizzes,
  users,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";
import { awardPoints, checkAndAwardBadges } from "./gamification";
import { createNotification } from "./notifications";
import { nanoid } from "nanoid";

export async function getUserCertificates(userId: number) {
    return getUserCertificatesMysql(userId);
}

async function getUserCertificatesMysql(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: certificates.id,
      certificateId: certificates.certificateId,
      status: certificates.status,
      courseId: certificates.courseId,
      courseSlug: courses.slug,
      courseTitleAr: courses.titleAr,
      courseTitleFr: courses.titleFr,
      courseTitleEn: courses.titleEn,
      issuedAt: certificates.issuedAt,
    })
    .from(certificates)
    .leftJoin(courses, eq(courses.id, certificates.courseId))
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt));
}

export async function verifyCertificate(certificateId: string) {
    return verifyCertificateMysql(certificateId);
}

async function verifyCertificateMysql(certificateId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      certificateId: certificates.certificateId,
      status: certificates.status,
      studentName: users.name,
      courseId: courses.id,
      courseSlug: courses.slug,
      courseTitleAr: courses.titleAr,
      courseTitleFr: courses.titleFr,
      courseTitleEn: courses.titleEn,
      issuedAt: certificates.issuedAt,
      revokedAt: certificates.revokedAt,
    })
    .from(certificates)
    .leftJoin(users, eq(users.id, certificates.userId))
    .leftJoin(courses, eq(courses.id, certificates.courseId))
    .where(eq(certificates.certificateId, certificateId))
    .limit(1);
  return rows[0];
}

export async function issueCertificate(input: {
  userId: number;
  courseId: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const completed = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, input.userId),
        eq(courseEnrollments.courseId, input.courseId),
        eq(courseEnrollments.status, "completed")
      )
    )
    .limit(1);
  if (!completed.length) return undefined;
  const examRows = await db
    .select({ id: unitQuizzes.id })
    .from(unitQuizzes)
    .where(
      and(
        eq(unitQuizzes.courseId, input.courseId),
        eq(unitQuizzes.kind, "final_exam")
      )
    )
    .limit(1);
  if (examRows[0]) {
    const passedAttempt = await db
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, examRows[0].id),
          eq(quizAttempts.userId, input.userId),
          eq(quizAttempts.passed, 1),
          eq(quizAttempts.status, "graded")
        )
      )
      .limit(1);
    if (!passedAttempt.length) return undefined; // final exam exists but hasn't been passed (or is still pending manual review) yet
  }
  const existing = await db
    .select({ certificateId: certificates.certificateId })
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, input.userId),
        eq(certificates.courseId, input.courseId)
      )
    )
    .limit(1);
  if (existing[0]) return existing[0];
  const certificateId = `NX-${nanoid(12).toUpperCase()}`;
  await db
    .insert(certificates)
    .values({ certificateId, userId: input.userId, courseId: input.courseId });
  await createNotification({
    userId: input.userId,
    type: "certificate",
    title: "notifications.certificateIssued",
    body: certificateId,
  });
  await awardPoints({
    userId: input.userId,
    reason: "certificate_earned",
    refId: input.courseId,
  });
  await checkAndAwardBadges(input.userId);
  return { certificateId };
}

export async function revokeCertificate(certificateId: string) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(certificates)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(certificates.certificateId, certificateId));
  return true;
}

export async function reissueCertificate(input: {
  userId: number;
  courseId: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db
    .select({ id: certificates.id })
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, input.userId),
        eq(certificates.courseId, input.courseId)
      )
    )
    .limit(1);
  if (!existing[0]) return undefined;
  const certificateId = `NX-${nanoid(12).toUpperCase()}`;
  await db
    .update(certificates)
    .set({
      certificateId,
      status: "active",
      issuedAt: new Date(),
      revokedAt: null,
    })
    .where(eq(certificates.id, existing[0].id));
  await createNotification({
    userId: input.userId,
    type: "certificate",
    title: "notifications.certificateReissued",
    body: certificateId,
  });
  return { certificateId };
}
