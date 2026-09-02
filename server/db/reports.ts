import {
  and,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import {
  courseEnrollments,
  courses,
  learnerReports,
  parentLinks,
  quizAttempts,
  users,
} from "../../drizzle/schema";
import { getDb } from "./shared";
import { createNotification } from "./notifications";

/**
 * A teacher's own student roster: every distinct learner enrolled in a
 * course the teacher owns (courses.ownerId), one row per (learner, course)
 * enrollment so progress is shown per-course rather than averaged away. An
 * admin sees every enrollment platform-wide instead of being scoped to
 * ownerId.
 */
export async function getStudentsForTeacher(
  teacherId: number,
  role: "teacher" | "institution" | "admin"
) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      learnerId: users.id,
      learnerName: users.name,
      learnerEmail: users.email,
      courseId: courses.id,
      courseTitleAr: courses.titleAr,
      courseTitleFr: courses.titleFr,
      courseTitleEn: courses.titleEn,
      subject: courses.subject,
      progressPercent: courseEnrollments.progressPercent,
      status: courseEnrollments.status,
      updatedAt: courseEnrollments.updatedAt,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .innerJoin(users, eq(users.id, courseEnrollments.userId))
    .where(role === "admin" ? undefined : eq(courses.ownerId, teacherId))
    .orderBy(desc(courseEnrollments.updatedAt));

  // Latest quiz score per learner — a light-weight "level" signal alongside
  // course progress, not a full grade book.
  const learnerIds = Array.from(new Set(rows.map(r => r.learnerId)));
  const latestScores = new Map<number, number>();
  if (learnerIds.length) {
    const scoreRows = await db
      .select({
        userId: quizAttempts.userId,
        score: quizAttempts.score,
        completedAt: quizAttempts.completedAt,
      })
      .from(quizAttempts)
      .where(inArray(quizAttempts.userId, learnerIds))
      .orderBy(desc(quizAttempts.completedAt));
    for (const row of scoreRows) {
      if (!latestScores.has(row.userId)) latestScores.set(row.userId, row.score);
    }
  }

  return rows.map(row => ({
    ...row,
    latestScore: latestScores.get(row.learnerId) ?? null,
  }));
}

export type CreateReportResult =
  | { ok: true; id: number; parentsNotified: number }
  | { ok: false; reason: "not_found" };

/**
 * A teacher's written report on one of their own students. Ownership is
 * verified the same way as every other teacher-authoring endpoint in this
 * codebase (courses.ownerId, admin bypasses) — a teacher can only report on
 * a learner genuinely enrolled in one of their own courses. Every active
 * parent linked to the learner (parentLinks) gets an in-app notification;
 * the report itself is then visible on that parent's dashboard via
 * getReportsForParent.
 */
export async function createLearnerReport(input: {
  teacherId: number;
  role: "teacher" | "institution" | "admin";
  learnerId: number;
  courseId?: number;
  level: string;
  title: string;
  notes: string;
}): Promise<CreateReportResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  if (input.role !== "admin") {
    const owned = await db
      .select({ id: courseEnrollments.id })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
      .where(
        and(
          eq(courseEnrollments.userId, input.learnerId),
          eq(courses.ownerId, input.teacherId)
        )
      )
      .limit(1);
    if (!owned.length) return { ok: false, reason: "not_found" };
  }
  const [insertResult] = await db.insert(learnerReports).values({
    learnerId: input.learnerId,
    teacherId: input.teacherId,
    courseId: input.courseId,
    level: input.level,
    title: input.title,
    notes: input.notes,
  });
  const reportId = (insertResult as { insertId: number }).insertId;

  const parents = await db
    .select({ parentId: parentLinks.parentId })
    .from(parentLinks)
    .where(
      and(eq(parentLinks.childId, input.learnerId), eq(parentLinks.status, "active"))
    );
  for (const parent of parents) {
    await createNotification({
      userId: parent.parentId,
      type: "learner_report",
      title: `تقرير جديد: ${input.title}`,
      body: input.notes,
    });
  }
  return { ok: true, id: reportId, parentsNotified: parents.length };
}

/** Every report for every child linked (actively) to this parent. */
export async function getReportsForParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db
    .select({ childId: parentLinks.childId })
    .from(parentLinks)
    .where(and(eq(parentLinks.parentId, parentId), eq(parentLinks.status, "active")));
  const childIds = links.map(l => l.childId);
  if (!childIds.length) return [];
  return db
    .select({
      id: learnerReports.id,
      learnerId: learnerReports.learnerId,
      learnerName: users.name,
      level: learnerReports.level,
      title: learnerReports.title,
      notes: learnerReports.notes,
      createdAt: learnerReports.createdAt,
      courseId: learnerReports.courseId,
    })
    .from(learnerReports)
    .innerJoin(users, eq(users.id, learnerReports.learnerId))
    .where(inArray(learnerReports.learnerId, childIds))
    .orderBy(desc(learnerReports.createdAt));
}

/** A learner's own reports — same data a linked parent sees, scoped to self. */
export async function getReportsForLearner(learnerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: learnerReports.id,
      level: learnerReports.level,
      title: learnerReports.title,
      notes: learnerReports.notes,
      createdAt: learnerReports.createdAt,
      courseId: learnerReports.courseId,
    })
    .from(learnerReports)
    .where(eq(learnerReports.learnerId, learnerId))
    .orderBy(desc(learnerReports.createdAt));
}
