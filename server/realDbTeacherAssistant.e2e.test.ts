import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "./db/shared";
import { createEmailUser } from "./db/usersAuth";
import { hashPassword, emailOpenId } from "./_core/emailAuth";
import {
  deleteExamPaper,
  deleteExamSolutionSet,
  deleteLessonPlan,
  getExamSolutionSet,
  getLessonPlan,
  getPaperGrade,
  getPaperGradesForLearner,
  getPaperGradesForParent,
  listExamPapers,
  listLessonPlans,
  listPaperGrades,
  markPaperGradeReviewed,
  savePaperGrade,
  saveExamPaper,
  saveExamSolutionSet,
  saveLessonPlan,
  teacherOwnsLearner,
} from "./db/teacherAssistant";
import {
  courseEnrollments,
  courses,
  examPapers,
  examSolutionSets,
  lessonPlans,
  notifications,
  paperGrades,
  parentLinks,
  users,
  type User,
} from "../drizzle/schema";

/**
 * REAL DATABASE coverage for the teacher-assistant storage (migration 0025).
 *
 * Same contract as realDb.e2e.test.ts: every test here runs against a real
 * MySQL with the real schema and real foreign keys, and the whole suite is
 * SKIPPED — not faked as passing — when DATABASE_URL is not set.
 *
 * What it is actually here to prove, beyond "the SQL runs": that one
 * teacher cannot read or delete another teacher's material, that a mark
 * reaches a learner only once a human has reviewed it, and that a grading
 * scale which reviewed marks depend on cannot be deleted out from under
 * them.
 *
 * To run for real:
 *   DATABASE_URL="mysql://user:pass@host:3306/db" JWT_SECRET=... npm run test:db
 * (migrations drizzle/0000 … 0025 must already be applied — scripts/migrate.mjs.)
 */

const HAS_DB = !!process.env.DATABASE_URL;

if (!HAS_DB) {
  // eslint-disable-next-line no-console
  console.warn(
    "[realDbTeacherAssistant.e2e.test.ts] SKIPPED — no DATABASE_URL set. " +
      "This suite only proves anything against a real MySQL instance; " +
      'skipping it is honest, reporting it as "passed" would not be.'
  );
}

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function mustGetDb() {
  const db = await getDb();
  if (!db) throw new Error("Expected a real database connection in this suite");
  return db;
}

async function makeUser(
  label: string,
  role: "teacher" | "learner" | "parent"
): Promise<User> {
  const email = `${label}-${RUN}@nourix.test`;
  const openId = emailOpenId(email);
  const result = await createEmailUser({
    openId,
    email,
    name: label,
    passwordHash: await hashPassword("Fixture-Pass-123"),
  });
  if (!result.ok) throw new Error(`Failed to create fixture user ${email}`);
  const db = await mustGetDb();
  await db.update(users).set({ role }).where(eq(users.openId, openId));
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  if (!rows[0]) throw new Error(`Fixture user not found: ${email}`);
  return rows[0];
}

describe.skipIf(!HAS_DB)("REAL DB — teacher assistant storage", () => {
  let teacherA: User;
  let teacherB: User;
  let learner: User;
  let parent: User;
  let courseId: number;

  beforeAll(async () => {
    teacherA = await makeUser("ta-teacher-a", "teacher");
    teacherB = await makeUser("ta-teacher-b", "teacher");
    learner = await makeUser("ta-learner", "learner");
    parent = await makeUser("ta-parent", "parent");

    const db = await mustGetDb();
    const [course] = await db.insert(courses).values({
      slug: `ta-course-${RUN}`,
      subject: "math",
      stage: "middle",
      level: "foundation",
      titleAr: "دورة اختبار",
      titleFr: "Cours de test",
      titleEn: "Test course",
      descriptionAr: "وصف",
      descriptionFr: "Description",
      descriptionEn: "Description",
      ownerId: teacherA.id,
    });
    courseId = (course as { insertId: number }).insertId;
    await db
      .insert(courseEnrollments)
      .values({ userId: learner.id, courseId, progressPercent: 10 });
    await db
      .insert(parentLinks)
      .values({ parentId: parent.id, childId: learner.id, status: "active" });
  }, 60000);

  it("stores and reads back a lesson plan, scoped to its owner", async () => {
    const id = await saveLessonPlan({
      teacherId: teacherA.id,
      level: "السنة الرابعة متوسط",
      topic: "نظرية فيثاغورس",
      durationMinutes: 45,
      priorKnowledge: "المثلث القائم",
      content: "## الأهداف التعلمية\n- …",
      model: "claude-opus-5",
      truncated: false,
    });
    expect(id).toBeTruthy();
    const mine = await getLessonPlan(id!, teacherA.id, "teacher");
    expect(mine?.topic).toBe("نظرية فيثاغورس");
    expect(mine?.content).toContain("الأهداف التعلمية");
    // The security-critical half: another teacher gets nothing, and cannot
    // delete it either, even knowing the id.
    expect(await getLessonPlan(id!, teacherB.id, "teacher")).toBeNull();
    expect(await deleteLessonPlan(id!, teacherB.id, "teacher")).toBe(false);
    const theirList = await listLessonPlans(teacherB.id, "teacher");
    expect(theirList.some(row => row.id === id)).toBe(false);
    // An admin can reach it — same bypass as everywhere else in this codebase.
    expect((await getLessonPlan(id!, teacherB.id, "admin"))?.id).toBe(id);
    expect(await deleteLessonPlan(id!, teacherA.id, "teacher")).toBe(true);
    expect(await getLessonPlan(id!, teacherA.id, "teacher")).toBeNull();
  });

  it("keeps a model solution usable after its source paper is deleted", async () => {
    const paperId = await saveExamPaper({
      teacherId: teacherA.id,
      level: "3AS",
      topics: ["المتتاليات", "الاحتمالات"],
      durationMinutes: 180,
      totalPoints: 20,
      content: "## امتحان",
      model: "claude-opus-5",
      truncated: false,
    });
    const setId = await saveExamSolutionSet({
      teacherId: teacherA.id,
      examPaperId: paperId,
      examText: "1) …",
      solutionsJson: "[]",
      questionCount: 0,
      scaleTotalPoints: 0,
      model: "claude-opus-5",
      truncated: false,
    });
    expect(await deleteExamPaper(paperId!, teacherA.id, "teacher")).toBe(true);
    const orphaned = await getExamSolutionSet(setId!, teacherA.id, "teacher");
    // The link is cleared, the exam text (its own copy) survives — the
    // solution stays usable for grading.
    expect(orphaned?.examPaperId).toBeNull();
    expect(orphaned?.examText).toBe("1) …");
    const papers = await listExamPapers(teacherA.id, "teacher");
    expect(papers.some(row => row.id === paperId)).toBe(false);
  });

  it("only lets a teacher attach a grade to their own student", async () => {
    expect(await teacherOwnsLearner(teacherA.id, "teacher", learner.id)).toBe(
      true
    );
    expect(await teacherOwnsLearner(teacherB.id, "teacher", learner.id)).toBe(
      false
    );
    expect(await teacherOwnsLearner(teacherB.id, "admin", learner.id)).toBe(
      true
    );
  });

  it("keeps a mark out of a learner's hands until a human reviews it", async () => {
    const setId = await saveExamSolutionSet({
      teacherId: teacherA.id,
      examText: "1) حل المعادلة (2ن)",
      solutionsJson: '[{"رقم_السؤال":1}]',
      questionCount: 1,
      scaleTotalPoints: 20,
      model: "claude-opus-5",
      truncated: false,
    });
    const gradeId = await savePaperGrade({
      teacherId: teacherA.id,
      solutionSetId: setId!,
      learnerId: learner.id,
      answerText: "المميز يساوي 25",
      report: "1 | 2/3 | حسابي | …",
      model: "claude-opus-5",
      truncated: false,
      maxPoints: 20,
    });
    const draft = await getPaperGrade(gradeId!, teacherA.id, "teacher");
    expect(draft?.status).toBe("draft");
    expect(draft?.finalPoints).toBeNull();
    // Nothing is visible to the learner or the parent while it is a draft.
    expect(await getPaperGradesForLearner(learner.id)).toHaveLength(0);
    expect(await getPaperGradesForParent(parent.id)).toHaveLength(0);

    // A mark above the maximum is rejected outright, not clamped.
    expect(
      await markPaperGradeReviewed({
        id: gradeId!,
        teacherId: teacherA.id,
        role: "teacher",
        finalPoints: 21,
        maxPoints: 20,
      })
    ).toEqual({ ok: false, reason: "invalid_mark" });
    // And another teacher cannot review it at all.
    expect(
      await markPaperGradeReviewed({
        id: gradeId!,
        teacherId: teacherB.id,
        role: "teacher",
        finalPoints: 15,
        maxPoints: 20,
      })
    ).toEqual({ ok: false, reason: "not_found" });

    const reviewed = await markPaperGradeReviewed({
      id: gradeId!,
      teacherId: teacherA.id,
      role: "teacher",
      finalPoints: 15,
      maxPoints: 20,
      teacherNotes: "منهجية سليمة، انتبه للحساب.",
    });
    // The learner and the one actively-linked parent are both notified.
    expect(reviewed).toEqual({ ok: true, notified: 2 });

    const learnerView = await getPaperGradesForLearner(learner.id);
    expect(learnerView).toHaveLength(1);
    expect(learnerView[0].finalPoints).toBe(15);
    expect(learnerView[0].maxPoints).toBe(20);
    const parentView = await getPaperGradesForParent(parent.id);
    expect(parentView).toHaveLength(1);
    expect(parentView[0].learnerId).toBe(learner.id);

    // Correcting an already-reviewed mark updates it without notifying again,
    // so a correction does not spam the family.
    const corrected = await markPaperGradeReviewed({
      id: gradeId!,
      teacherId: teacherA.id,
      role: "teacher",
      finalPoints: 16,
      maxPoints: 20,
    });
    expect(corrected).toEqual({ ok: true, notified: 0 });
    expect((await getPaperGradesForLearner(learner.id))[0].finalPoints).toBe(
      16
    );

    // The grading scale behind a reviewed mark cannot be deleted.
    expect(await deleteExamSolutionSet(setId!, teacherA.id, "teacher")).toEqual(
      {
        ok: false,
        reason: "has_reviewed_grades",
      }
    );

    const listed = await listPaperGrades(teacherA.id, "teacher", {
      solutionSetId: setId!,
    });
    expect(listed).toHaveLength(1);
    expect(listed[0].learnerName).toBe("ta-learner");
    expect(await listPaperGrades(teacherB.id, "teacher")).toHaveLength(0);
  });

  it("deletes a grading scale together with its unreviewed drafts", async () => {
    const setId = await saveExamSolutionSet({
      teacherId: teacherA.id,
      examText: "1) …",
      solutionsJson: "[]",
      model: "claude-opus-5",
      truncated: false,
    });
    await savePaperGrade({
      teacherId: teacherA.id,
      solutionSetId: setId!,
      studentLabel: "تلميذ بلا حساب",
      answerText: "…",
      report: "…",
      model: "claude-opus-5",
      truncated: false,
    });
    expect(await deleteExamSolutionSet(setId!, teacherB.id, "teacher")).toEqual(
      {
        ok: false,
        reason: "not_found",
      }
    );
    expect(await deleteExamSolutionSet(setId!, teacherA.id, "teacher")).toEqual(
      {
        ok: true,
        deletedDraftGrades: 1,
      }
    );
    expect(await getExamSolutionSet(setId!, teacherA.id, "teacher")).toBeNull();
  });

  afterAll(async () => {
    if (!HAS_DB) return;
    const db = await mustGetDb();
    const userIds = [
      teacherA?.id,
      teacherB?.id,
      learner?.id,
      parent?.id,
    ].filter((id): id is number => typeof id === "number");
    if (!userIds.length) return;
    // Fixture cleanup only — never done this way in application code.
    await db.delete(paperGrades).where(inArray(paperGrades.teacherId, userIds));
    await db
      .delete(examSolutionSets)
      .where(inArray(examSolutionSets.teacherId, userIds));
    await db.delete(examPapers).where(inArray(examPapers.teacherId, userIds));
    await db.delete(lessonPlans).where(inArray(lessonPlans.teacherId, userIds));
    await db
      .delete(notifications)
      .where(inArray(notifications.userId, userIds));
    await db.delete(parentLinks).where(inArray(parentLinks.childId, userIds));
    await db
      .delete(courseEnrollments)
      .where(inArray(courseEnrollments.userId, userIds));
    if (courseId) await db.delete(courses).where(eq(courses.id, courseId));
    await db.execute("SET FOREIGN_KEY_CHECKS=0");
    try {
      await db.delete(users).where(inArray(users.id, userIds));
    } finally {
      await db.execute("SET FOREIGN_KEY_CHECKS=1");
    }
  }, 30000);
});
