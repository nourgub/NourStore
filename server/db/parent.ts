import {
  and,
  count,
  desc,
  eq,
} from "drizzle-orm";
import {
  courseEnrollments,
  courses,
  parentInviteCodes,
  parentLinks,
  placementAttempts,
  quizAttempts,
  users,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";
import { createNotification } from "./notifications";
import { nanoid } from "nanoid";

export async function getParentLinks(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: parentLinks.id,
      childId: parentLinks.childId,
      status: parentLinks.status,
      createdAt: parentLinks.createdAt,
      childName: users.name,
    })
    .from(parentLinks)
    .leftJoin(users, eq(users.id, parentLinks.childId))
    .where(eq(parentLinks.parentId, parentId))
    .orderBy(desc(parentLinks.createdAt));
}

export async function createParentInvite(childId: number) {
  const db = await getDb();
  if (!db) return undefined;
  // Found via real-database integration testing: inserting straight away let an admin-supplied,
  // nonexistent childId crash with a raw SQL foreign-key error instead of a clean "not found".
  const childRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, childId))
    .limit(1);
  if (!childRows.length) return undefined;
  const code = nanoid(10).toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(parentInviteCodes).values({ childId, code, expiresAt });
  return { code, expiresAt };
}

export async function acceptParentInvite(parentId: number, code: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(parentInviteCodes)
    .where(eq(parentInviteCodes.code, code))
    .limit(1);
  const invite = rows[0];
  if (
    !invite ||
    invite.usedAt ||
    invite.canceledAt ||
    invite.expiresAt.getTime() < Date.now()
  )
    return false;
  const existingLink = await db
    .select()
    .from(parentLinks)
    .where(
      and(
        eq(parentLinks.parentId, parentId),
        eq(parentLinks.childId, invite.childId)
      )
    )
    .limit(1);
  if (existingLink[0]) {
    // Re-activate a previously revoked link instead of violating the parentId+childId unique constraint.
    if (existingLink[0].status !== "active")
      await db
        .update(parentLinks)
        .set({ status: "active" })
        .where(eq(parentLinks.id, existingLink[0].id));
  } else {
    await db
      .insert(parentLinks)
      .values({ parentId, childId: invite.childId, status: "active" });
  }
  await db
    .update(parentInviteCodes)
    .set({ usedAt: new Date() })
    .where(eq(parentInviteCodes.id, invite.id));
  await createNotification({
    userId: invite.childId,
    type: "parent_link",
    title: "notifications.parentLinkAccepted",
    body: String(parentId),
  });
  return true;
}

export async function cancelParentInvite(input: {
  inviteId: number;
  requesterId: number;
  role: "learner" | "parent" | "teacher" | "institution" | "admin";
}) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(parentInviteCodes)
    .where(eq(parentInviteCodes.id, input.inviteId))
    .limit(1);
  const invite = rows[0];
  if (!invite) return false;
  if (input.role !== "admin" && invite.childId !== input.requesterId)
    return false;
  if (invite.usedAt || invite.canceledAt) return false;
  await db
    .update(parentInviteCodes)
    .set({ canceledAt: new Date() })
    .where(eq(parentInviteCodes.id, invite.id));
  await createNotification({
    userId: invite.childId,
    type: "parent_link",
    title: "notifications.parentInviteCanceled",
    body: String(invite.id),
  });
  return true;
}

export async function unlinkParent(input: {
  linkId: number;
  requesterId: number;
  role: "learner" | "parent" | "teacher" | "institution" | "admin";
}) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(parentLinks)
    .where(eq(parentLinks.id, input.linkId))
    .limit(1);
  const link = rows[0];
  if (!link) return false;
  if (
    input.role !== "admin" &&
    link.parentId !== input.requesterId &&
    link.childId !== input.requesterId
  )
    return false;
  await db
    .update(parentLinks)
    .set({ status: "revoked" })
    .where(eq(parentLinks.id, link.id));
  return true;
}

export async function getParentDashboard(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db
    .select({
      id: parentLinks.id,
      childId: parentLinks.childId,
      childName: users.name,
      status: parentLinks.status,
      createdAt: parentLinks.createdAt,
    })
    .from(parentLinks)
    .leftJoin(users, eq(users.id, parentLinks.childId))
    .where(eq(parentLinks.parentId, parentId))
    .orderBy(desc(parentLinks.createdAt));
  const activeLinks = links.filter(link => link.status === "active");
  return Promise.all(
    activeLinks.map(async link => {
      const enrollments = await db
        .select({
          courseId: courseEnrollments.courseId,
          progressPercent: courseEnrollments.progressPercent,
          status: courseEnrollments.status,
          updatedAt: courseEnrollments.updatedAt,
          subject: courses.subject,
          titleAr: courses.titleAr,
          titleFr: courses.titleFr,
          titleEn: courses.titleEn,
        })
        .from(courseEnrollments)
        .leftJoin(courses, eq(courses.id, courseEnrollments.courseId))
        .where(eq(courseEnrollments.userId, link.childId))
        .orderBy(desc(courseEnrollments.updatedAt));
      const attempts = await db
        .select({
          score: quizAttempts.score,
          passed: quizAttempts.passed,
          completedAt: quizAttempts.completedAt,
          feedbackJson: quizAttempts.feedbackJson,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, link.childId))
        .orderBy(desc(quizAttempts.completedAt))
        .limit(10);
      const attemptCountRows = await db
        .select({ value: count(quizAttempts.id) })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, link.childId));
      const placement = await db
        .select({
          recommendedLevel: placementAttempts.recommendedLevel,
          completedAt: placementAttempts.completedAt,
        })
        .from(placementAttempts)
        .where(eq(placementAttempts.userId, link.childId))
        .orderBy(desc(placementAttempts.completedAt))
        .limit(1);
      const progress = enrollments.length
        ? Math.round(
            enrollments.reduce((sum, item) => sum + item.progressPercent, 0) /
              enrollments.length
          )
        : 0;
      const latestScore = attempts[0]?.score ?? null;
      const activityDates = [
        attempts[0]?.completedAt,
        enrollments[0]?.updatedAt,
        placement[0]?.completedAt,
      ].filter((value): value is Date => value instanceof Date);
      const lastActivityAt =
        activityDates.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      return {
        ...link,
        enrollments,
        attempts,
        attemptCount: Number(attemptCountRows[0]?.value ?? 0),
        recommendedLevel: placement[0]?.recommendedLevel ?? null,
        lastActivityAt,
        progress,
        latestScore,
      };
    })
  );
}

export async function getManagedLearnerCount(
  role: "learner" | "parent" | "teacher" | "institution" | "admin"
) {
  const db = await getDb();
  if (!db || role !== "admin") return null;
  const rows = await db
    .select({ userId: courseEnrollments.userId })
    .from(courseEnrollments);
  return new Set(rows.map(row => row.userId)).size;
}
