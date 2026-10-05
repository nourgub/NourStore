import {
  and,
  eq,
  inArray,
  isNotNull,
  or,
} from "drizzle-orm";
import {
  courses,
  lessons,
  quizAttempts,
  quizAttemptAnswers,
  quizQuestions,
  unitQuizzes,
  units,
  skills,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";

export async function getAllSkills() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).orderBy(skills.subject, skills.titleEn);
}

export async function createSkill(input: {
  slug: string;
  subject: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(skills).values(input);
}

export async function getLearnerSkillBreakdown(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      skillId: quizQuestions.skillId,
      isCorrect: quizAttemptAnswers.isCorrect,
      titleAr: skills.titleAr,
      titleFr: skills.titleFr,
      titleEn: skills.titleEn,
      subject: skills.subject,
    })
    .from(quizAttemptAnswers)
    .leftJoin(quizAttempts, eq(quizAttempts.id, quizAttemptAnswers.attemptId))
    .leftJoin(
      quizQuestions,
      eq(quizQuestions.id, quizAttemptAnswers.questionId)
    )
    .leftJoin(skills, eq(skills.id, quizQuestions.skillId))
    .where(
      and(eq(quizAttempts.userId, userId), isNotNull(quizQuestions.skillId))
    );

  const bySkill = new Map<
    number,
    {
      titleAr: string;
      titleFr: string;
      titleEn: string;
      subject: string;
      correct: number;
      graded: number;
    }
  >();
  for (const row of rows) {
    if (!row.skillId || row.isCorrect === null) continue; // exclude pending-review answers
    const entry = bySkill.get(row.skillId) ?? {
      titleAr: row.titleAr ?? "",
      titleFr: row.titleFr ?? "",
      titleEn: row.titleEn ?? "",
      subject: row.subject ?? "",
      correct: 0,
      graded: 0,
    };
    entry.graded += 1;
    if (row.isCorrect === 1) entry.correct += 1;
    bySkill.set(row.skillId, entry);
  }
  return Array.from(bySkill.entries())
    .map(([skillId, entry]) => {
      const percent = entry.graded
        ? Math.round((entry.correct / entry.graded) * 100)
        : 0;
      const level: "strength" | "developing" | "weakness" =
        entry.graded < 2
          ? "developing"
          : percent >= 70
            ? "strength"
            : percent < 50
              ? "weakness"
              : "developing";
      return {
        skillId,
        titleAr: entry.titleAr,
        titleFr: entry.titleFr,
        titleEn: entry.titleEn,
        subject: entry.subject,
        correct: entry.correct,
        graded: entry.graded,
        percent,
        level,
      };
    })
    .sort((a, b) => a.percent - b.percent);
}

export async function getRecommendedReviewLessons(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const breakdown = await getLearnerSkillBreakdown(userId);
  const weakSkillIds = breakdown
    .filter(entry => entry.level === "weakness")
    .map(entry => entry.skillId);
  if (!weakSkillIds.length) return [];
  return db
    .select({
      lessonId: lessons.id,
      titleAr: lessons.titleAr,
      titleFr: lessons.titleFr,
      titleEn: lessons.titleEn,
      skillId: lessons.skillId,
      courseSlug: courses.slug,
      courseTitleAr: courses.titleAr,
    })
    .from(lessons)
    .leftJoin(units, eq(units.id, lessons.unitId))
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(inArray(lessons.skillId, weakSkillIds), eq(courses.isPublished, 1))
    )
    .limit(20);
}

export async function getContentAnalytics(
  role: "teacher" | "institution" | "admin",
  userId: number
) {
  const db = await getDb();
  if (!db) return { quizzes: [], skillDifficulty: [] };
  const ownedCourseIds =
    role === "admin"
      ? (await db.select({ id: courses.id }).from(courses)).map(c => c.id)
      : (
          await db
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.ownerId, userId))
        ).map(c => c.id);
  if (!ownedCourseIds.length) return { quizzes: [], skillDifficulty: [] };

  const quizRows = await db
    .select({
      quizId: unitQuizzes.id,
      kind: unitQuizzes.kind,
      unitId: unitQuizzes.unitId,
      courseId: unitQuizzes.courseId,
      unitTitleAr: units.titleAr,
    })
    .from(unitQuizzes)
    .leftJoin(units, eq(units.id, unitQuizzes.unitId))
    .where(
      or(
        inArray(unitQuizzes.courseId, ownedCourseIds),
        inArray(units.courseId, ownedCourseIds)
      )
    );

  const quizzes = await Promise.all(
    quizRows.map(async quiz => {
      const attempts = await db
        .select({
          score: quizAttempts.score,
          passed: quizAttempts.passed,
          status: quizAttempts.status,
        })
        .from(quizAttempts)
        .where(eq(quizAttempts.quizId, quiz.quizId));
      const graded = attempts.filter(a => a.status === "graded");
      const averageScore = graded.length
        ? Math.round(
            graded.reduce((sum, a) => sum + a.score, 0) / graded.length
          )
        : 0;
      const passRate = graded.length
        ? Math.round(
            (graded.filter(a => a.passed === 1).length / graded.length) * 100
          )
        : 0;
      return {
        quizId: quiz.quizId,
        kind: quiz.kind,
        label: quiz.unitTitleAr || `Course #${quiz.courseId}`,
        attemptCount: attempts.length,
        averageScore,
        passRate,
      };
    })
  );

  const skillRows = await db
    .select({
      skillId: quizQuestions.skillId,
      titleAr: skills.titleAr,
      isCorrect: quizAttemptAnswers.isCorrect,
    })
    .from(quizAttemptAnswers)
    .leftJoin(
      quizQuestions,
      eq(quizQuestions.id, quizAttemptAnswers.questionId)
    )
    .leftJoin(unitQuizzes, eq(unitQuizzes.id, quizQuestions.quizId))
    .leftJoin(units, eq(units.id, unitQuizzes.unitId))
    .leftJoin(skills, eq(skills.id, quizQuestions.skillId))
    .where(
      and(
        isNotNull(quizQuestions.skillId),
        or(
          inArray(unitQuizzes.courseId, ownedCourseIds),
          inArray(units.courseId, ownedCourseIds)
        )
      )
    );

  const bySkill = new Map<
    number,
    { titleAr: string; correct: number; graded: number }
  >();
  for (const row of skillRows) {
    if (!row.skillId || row.isCorrect === null) continue;
    const entry = bySkill.get(row.skillId) ?? {
      titleAr: row.titleAr ?? "",
      correct: 0,
      graded: 0,
    };
    entry.graded += 1;
    if (row.isCorrect === 1) entry.correct += 1;
    bySkill.set(row.skillId, entry);
  }
  const skillDifficulty = Array.from(bySkill.entries())
    .map(([skillId, entry]) => ({
      skillId,
      titleAr: entry.titleAr,
      percent: entry.graded
        ? Math.round((entry.correct / entry.graded) * 100)
        : 0,
      graded: entry.graded,
    }))
    .sort((a, b) => a.percent - b.percent);

  return { quizzes, skillDifficulty };
}
