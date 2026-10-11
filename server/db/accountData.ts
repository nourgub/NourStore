// A user's own data: export (a copy of everything kept about them) and
// account deletion (drizzle/0035 accountRequests).
//
// Deletion is an admin-confirmed anonymisation, not a row delete: the
// account can no longer sign in, and everything that identifies the person
// or that they wrote is erased (name, email, password, chats, uploaded
// exercises and photos, free-text answers, notes, notifications, parent
// links). What is kept, without a name attached: subscriptions and payment
// records (accounting), and answer correctness (aggregate statistics).
// How long those are kept is a retention decision for the owner — see
// docs/PRIVACY_REVIEW.md.
import { randomBytes } from "crypto";
import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import {
  accountRequests,
  notifications,
  parentInviteCodes,
  parentLinks,
  passwordResetTokens,
  tafawoqAssessments,
  tafawoqAttempts,
  tafawoqBookings,
  tafawoqDailyPlans,
  tafawoqEvents,
  tafawoqExams,
  tafawoqExercises,
  tafawoqMessages,
  tafawoqSavedTopics,
  tafawoqSkillStates,
  tafawoqStreamRequests,
  tafawoqStudents,
  tafawoqSubscriptions,
  tafawoqTopicAnswers,
  users,
} from "../../drizzle/schema";
import { getDb } from "./shared";

/** Everything kept about the user, as plain JSON. Never includes the password hash. */
export async function exportUserData(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      loginMethod: users.loginMethod,
      accountStatus: users.accountStatus,
      language: users.language,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;
  const [student] = await db.select().from(tafawoqStudents).where(eq(tafawoqStudents.userId, userId)).limit(1);
  const sid = student?.id ?? -1;
  const byStudent = async <T>(query: Promise<T>) => (student ? query : ([] as unknown as T));

  return {
    exportedAt: new Date().toISOString(),
    user,
    student: student ?? null,
    subscriptions: await db.select().from(tafawoqSubscriptions).where(eq(tafawoqSubscriptions.userId, userId)),
    streamRequests: await byStudent(db.select().from(tafawoqStreamRequests).where(eq(tafawoqStreamRequests.studentId, sid))),
    skillStates: await byStudent(db.select().from(tafawoqSkillStates).where(eq(tafawoqSkillStates.studentId, sid))),
    assessments: await byStudent(db.select().from(tafawoqAssessments).where(eq(tafawoqAssessments.studentId, sid))),
    attempts: await byStudent(db.select().from(tafawoqAttempts).where(eq(tafawoqAttempts.studentId, sid))),
    exams: await byStudent(db.select().from(tafawoqExams).where(eq(tafawoqExams.studentId, sid))),
    chats: await byStudent(db.select().from(tafawoqMessages).where(eq(tafawoqMessages.studentId, sid))),
    exercises: await byStudent(
      db
        .select({
          id: tafawoqExercises.id,
          lessonKey: tafawoqExercises.lessonKey,
          text: tafawoqExercises.text,
          note: tafawoqExercises.note,
          hasPhoto: sql<number>`${tafawoqExercises.imageKey} IS NOT NULL`,
          status: tafawoqExercises.status,
          answer: tafawoqExercises.answer,
          createdAt: tafawoqExercises.createdAt,
          answeredAt: tafawoqExercises.answeredAt,
        })
        .from(tafawoqExercises)
        .where(eq(tafawoqExercises.studentId, sid))
    ),
    topicAnswers: await byStudent(db.select().from(tafawoqTopicAnswers).where(eq(tafawoqTopicAnswers.studentId, sid))),
    savedTopics: await byStudent(db.select().from(tafawoqSavedTopics).where(eq(tafawoqSavedTopics.studentId, sid))),
    dailyPlans: await byStudent(db.select().from(tafawoqDailyPlans).where(eq(tafawoqDailyPlans.studentId, sid))),
    bookings: await db.select().from(tafawoqBookings).where(eq(tafawoqBookings.userId, userId)),
    parentLinks: await db
      .select({ id: parentLinks.id, parentId: parentLinks.parentId, childId: parentLinks.childId, status: parentLinks.status, createdAt: parentLinks.createdAt })
      .from(parentLinks)
      .where(or(eq(parentLinks.parentId, userId), eq(parentLinks.childId, userId))),
    notifications: await db.select().from(notifications).where(eq(notifications.userId, userId)),
    accountRequests: await db.select().from(accountRequests).where(eq(accountRequests.userId, userId)),
  };
}

/** Opens a deletion request unless one is already open. Returns false when one exists. */
export async function openDeletionRequest(userId: number, note: string | null): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const [open] = await tx
      .select({ id: accountRequests.id })
      .from(accountRequests)
      .where(and(eq(accountRequests.userId, userId), eq(accountRequests.kind, "delete"), eq(accountRequests.status, "open")))
      .limit(1);
    if (open) return false;
    await tx.insert(accountRequests).values({ userId, kind: "delete", note });
    return true;
  });
}

export async function cancelDeletionRequest(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(accountRequests)
    .set({ status: "rejected", resolvedAt: new Date(), resolvedBy: userId, note: sql`CONCAT(COALESCE(${accountRequests.note}, ''), ' [cancelled by the user]')` })
    .where(and(eq(accountRequests.userId, userId), eq(accountRequests.kind, "delete"), eq(accountRequests.status, "open")));
}

export async function myAccountRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: accountRequests.id, kind: accountRequests.kind, status: accountRequests.status, createdAt: accountRequests.createdAt, resolvedAt: accountRequests.resolvedAt })
    .from(accountRequests)
    .where(eq(accountRequests.userId, userId))
    .orderBy(desc(accountRequests.createdAt));
}

export async function listAccountRequests(status?: "open" | "done" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: accountRequests.id,
      userId: accountRequests.userId,
      kind: accountRequests.kind,
      status: accountRequests.status,
      note: accountRequests.note,
      createdAt: accountRequests.createdAt,
      resolvedAt: accountRequests.resolvedAt,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(accountRequests)
    .innerJoin(users, eq(users.id, accountRequests.userId))
    .where(status ? eq(accountRequests.status, status) : undefined)
    .orderBy(desc(accountRequests.createdAt))
    .limit(200);
}

export async function getAccountRequest(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(accountRequests).where(eq(accountRequests.id, id)).limit(1);
  return row ?? null;
}

/** Marks an open request resolved. False when it was not open (already handled). */
export async function resolveAccountRequest(id: number, adminId: number, status: "done" | "rejected", note: string | null) {
  const db = await getDb();
  if (!db) return false;
  const [result] = await db
    .update(accountRequests)
    .set({ status, resolvedAt: new Date(), resolvedBy: adminId, ...(note ? { note } : {}) })
    .where(and(eq(accountRequests.id, id), eq(accountRequests.status, "open")));
  return (result as { affectedRows?: number }).affectedRows === 1;
}

/**
 * Erases what identifies the user, in one transaction. Returns the storage
 * keys of uploaded photos, which the caller deletes once the transaction
 * has committed (a file can't be rolled back).
 */
export async function anonymizeUser(userId: number): Promise<{ photoKeys: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    await tx
      .update(users)
      .set({
        name: null,
        email: null,
        passwordHash: null,
        openId: `deleted_${userId}_${randomBytes(8).toString("hex")}`,
        loginMethod: "deleted",
        accountStatus: "suspended",
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx
      .update(parentLinks)
      .set({ status: "revoked" })
      .where(or(eq(parentLinks.parentId, userId), eq(parentLinks.childId, userId)));
    await tx
      .update(parentInviteCodes)
      .set({ canceledAt: new Date() })
      .where(and(eq(parentInviteCodes.childId, userId), sql`${parentInviteCodes.usedAt} IS NULL`));
    await tx.update(tafawoqBookings).set({ note: null, tutorNote: null }).where(eq(tafawoqBookings.userId, userId));
    await tx.update(tafawoqEvents).set({ userId: null }).where(eq(tafawoqEvents.userId, userId));

    const [student] = await tx.select({ id: tafawoqStudents.id }).from(tafawoqStudents).where(eq(tafawoqStudents.userId, userId)).limit(1);
    let photoKeys: string[] = [];
    if (student) {
      const sid = student.id;
      const photos = await tx
        .select({ key: tafawoqExercises.imageKey })
        .from(tafawoqExercises)
        .where(and(eq(tafawoqExercises.studentId, sid), isNotNull(tafawoqExercises.imageKey)));
      photoKeys = photos.map(p => p.key!).filter(Boolean);
      await tx.delete(tafawoqMessages).where(eq(tafawoqMessages.studentId, sid));
      await tx.delete(tafawoqExercises).where(eq(tafawoqExercises.studentId, sid));
      await tx.delete(tafawoqTopicAnswers).where(eq(tafawoqTopicAnswers.studentId, sid));
      await tx.delete(tafawoqSavedTopics).where(eq(tafawoqSavedTopics.studentId, sid));
      await tx.delete(tafawoqDailyPlans).where(eq(tafawoqDailyPlans.studentId, sid));
      await tx.update(tafawoqStreamRequests).set({ reason: "-" }).where(eq(tafawoqStreamRequests.studentId, sid));
      await tx
        .update(tafawoqStudents)
        .set({ displayName: "-", goals: null, age: 0, shareChatsWithParent: 0 })
        .where(eq(tafawoqStudents.id, sid));
    }
    return { photoKeys };
  });
}

export async function userRole(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.role ?? null;
}
