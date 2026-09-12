import { and, eq } from "drizzle-orm";
import {
  courseEnrollments,
  courses,
  quizQuestions,
  unitQuizzes,
  units,
} from "../../../drizzle/schema";
import { getDb } from "../shared";
import { createNotification } from "../notifications";

export async function ownedQuiz(
  quizId: number,
  role: "teacher" | "institution" | "admin",
  userId: number
) {
  const db = await getDb();
  if (!db) return false;
  if (role === "admin") {
    const rows = await db
      .select({ id: unitQuizzes.id })
      .from(unitQuizzes)
      .where(eq(unitQuizzes.id, quizId))
      .limit(1);
    return rows.length > 0;
  }
  const rows = await db
    .select({ unitId: unitQuizzes.unitId, courseId: unitQuizzes.courseId })
    .from(unitQuizzes)
    .where(eq(unitQuizzes.id, quizId))
    .limit(1);
  const row = rows[0];
  if (!row) return false;
  if (row.unitId) {
    const owned = await db
      .select({ id: courses.id })
      .from(units)
      .leftJoin(courses, eq(courses.id, units.courseId))
      .where(and(eq(units.id, row.unitId), eq(courses.ownerId, userId)))
      .limit(1);
    return owned.length > 0;
  }
  if (row.courseId) {
    const owned = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, row.courseId), eq(courses.ownerId, userId)))
      .limit(1);
    return owned.length > 0;
  }
  return false;
}

export async function getManagedQuiz(
  unitId: number,
  role: "teacher" | "institution" | "admin",
  userId: number
) {
  const db = await getDb();
  if (!db) return { quiz: undefined, questions: [] };
  const ownedUnit = await db
    .select({ id: units.id })
    .from(units)
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(units.id, unitId),
        role === "admin" ? undefined : eq(courses.ownerId, userId)
      )
    )
    .limit(1);
  if (!ownedUnit.length) return { quiz: undefined, questions: [] };
  const quizRows = await db
    .select()
    .from(unitQuizzes)
    .where(eq(unitQuizzes.unitId, unitId))
    .limit(1);
  const quiz = quizRows[0];
  return {
    quiz,
    questions: quiz
      ? await db
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, quiz.id))
          .orderBy(quizQuestions.orderIndex)
      : [],
  };
}

export async function createManagedQuiz(input: {
  unitId: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  passScore: number;
  maxAttempts: number;
}) {
    const db = await getDb();
  if (!db) return undefined;
  const ownedUnit = await db
    .select({
      id: units.id,
      courseId: units.courseId,
      coursePublished: courses.isPublished,
    })
    .from(units)
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(units.id, input.unitId),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  if (!ownedUnit.length) return undefined;
  const existing = await db
    .select({ id: unitQuizzes.id })
    .from(unitQuizzes)
    .where(eq(unitQuizzes.unitId, input.unitId))
    .limit(1);
  if (existing.length) return existing[0];
  const result = await db
    .insert(unitQuizzes)
    .values({
      kind: "unit_quiz",
      unitId: input.unitId,
      passScore: input.passScore,
      maxAttempts: input.maxAttempts,
    });
  if (ownedUnit[0].coursePublished === 1 && ownedUnit[0].courseId) {
    const enrolledLearners = await db
      .select({ userId: courseEnrollments.userId })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, ownedUnit[0].courseId));
    for (const learner of enrolledLearners)
      await createNotification({
        userId: learner.userId,
        type: "quiz_added",
        title: "notifications.quizAdded",
        body: String(input.unitId),
      });
  }
  return result;
}

export async function createManagedFinalExam(input: {
  courseId: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  passScore: number;
  maxAttempts: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const ownedCourse = await db
    .select({ id: courses.id })
    .from(courses)
    .where(
      and(
        eq(courses.id, input.courseId),
        input.role === "admin" ? undefined : eq(courses.ownerId, input.userId)
      )
    )
    .limit(1);
  if (!ownedCourse.length) return undefined;
  const existing = await db
    .select({ id: unitQuizzes.id })
    .from(unitQuizzes)
    .where(
      and(
        eq(unitQuizzes.courseId, input.courseId),
        eq(unitQuizzes.kind, "final_exam")
      )
    )
    .limit(1);
  if (existing.length) return existing[0];
  const result = await db
    .insert(unitQuizzes)
    .values({
      kind: "final_exam",
      courseId: input.courseId,
      passScore: input.passScore,
      maxAttempts: input.maxAttempts,
    });
  return result;
}


export async function createManagedQuizQuestion(input: {
  quizId: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  questionType: "choice" | "true_false" | "open" | "code";
  promptAr: string;
  promptFr: string;
  promptEn: string;
  optionsJson?: string;
  answerKey?: string;
  explanationAr?: string;
  explanationFr?: string;
  explanationEn?: string;
  skillId?: number | null;
  orderIndex: number;
}) {
    const db = await getDb();
  if (!db || !(await ownedQuiz(input.quizId, input.role, input.userId)))
    return undefined;
  const { role: _role, userId: _userId, ...question } = input;
  return db.insert(quizQuestions).values(question);
}

export async function updateManagedQuizQuestion(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
  questionType: "choice" | "true_false" | "open" | "code";
  promptAr: string;
  promptFr: string;
  promptEn: string;
  optionsJson?: string | null;
  answerKey?: string | null;
  explanationAr?: string | null;
  explanationFr?: string | null;
  explanationEn?: string | null;
  skillId?: number | null;
  orderIndex: number;
}) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ quizId: quizQuestions.quizId })
    .from(quizQuestions)
    .where(eq(quizQuestions.id, input.id))
    .limit(1);
  if (
    !rows.length ||
    !(await ownedQuiz(rows[0].quizId, input.role, input.userId))
  )
    return false;
  await db
    .update(quizQuestions)
    .set({
      questionType: input.questionType,
      promptAr: input.promptAr,
      promptFr: input.promptFr,
      promptEn: input.promptEn,
      optionsJson: input.optionsJson ?? null,
      answerKey: input.answerKey ?? null,
      explanationAr: input.explanationAr ?? null,
      explanationFr: input.explanationFr ?? null,
      explanationEn: input.explanationEn ?? null,
      skillId: input.skillId ?? null,
      orderIndex: input.orderIndex,
    })
    .where(eq(quizQuestions.id, input.id));
  return true;
}

export async function deleteManagedQuizQuestion(input: {
  id: number;
  role: "teacher" | "institution" | "admin";
  userId: number;
}) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ quizId: quizQuestions.quizId })
    .from(quizQuestions)
    .where(eq(quizQuestions.id, input.id))
    .limit(1);
  if (
    !rows.length ||
    !(await ownedQuiz(rows[0].quizId, input.role, input.userId))
  )
    return false;
  await db.delete(quizQuestions).where(eq(quizQuestions.id, input.id));
  return true;
}

