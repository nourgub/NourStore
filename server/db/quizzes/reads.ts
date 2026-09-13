import { and, eq, isNull } from "drizzle-orm";
import {
  courseEnrollments,
  courses,
  quizAttemptAnswers,
  quizAttempts,
  quizQuestions,
  unitQuizzes,
  units,
  users,
} from "../../../drizzle/schema";
import { getDb } from "../shared";
import { ownedQuiz } from "./authoring";

export async function getUnitQuizWithQuestions(unitId: number) {
    return getUnitQuizWithQuestionsMysql(unitId);
}

async function getUnitQuizWithQuestionsMysql(unitId: number) {
  const db = await getDb();
  if (!db) return { quiz: undefined, questions: [] };
  const quizRows = await db
    .select()
    .from(unitQuizzes)
    .where(eq(unitQuizzes.unitId, unitId))
    .limit(1);
  const quiz = quizRows[0];
  if (!quiz) return { quiz: undefined, questions: [] };
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(quizQuestions.orderIndex);
  return { quiz, questions };
}

export async function getUnitQuizForLearner(unitId: number, userId: number) {
    return getUnitQuizForLearnerMysql(unitId, userId);
}

async function getUnitQuizForLearnerMysql(unitId: number, userId: number) {
  const db = await getDb();
  if (!db) return { quiz: undefined, questions: [] };
  const owningCourse = await db
    .select({ courseId: courses.id })
    .from(units)
    .leftJoin(courses, eq(courses.id, units.courseId))
    .where(and(eq(units.id, unitId), eq(courses.isPublished, 1)))
    .limit(1);
  const courseId = owningCourse[0]?.courseId;
  if (!courseId) return { quiz: undefined, questions: [] };
  const enrolled = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, courseId)
      )
    )
    .limit(1);
  if (!enrolled.length) return { quiz: undefined, questions: [] };
  const quizRows = await db
    .select()
    .from(unitQuizzes)
    .where(eq(unitQuizzes.unitId, unitId))
    .limit(1);
  const quiz = quizRows[0];
  if (!quiz) return { quiz: undefined, questions: [] };
  const questions = await db
    .select({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      questionType: quizQuestions.questionType,
      promptAr: quizQuestions.promptAr,
      promptFr: quizQuestions.promptFr,
      promptEn: quizQuestions.promptEn,
      optionsJson: quizQuestions.optionsJson,
      orderIndex: quizQuestions.orderIndex,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(quizQuestions.orderIndex);
  return { quiz, questions };
}


export async function getFinalExamWithQuestions(courseId: number) {
  const db = await getDb();
  if (!db) return { quiz: undefined, questions: [] };
  const quizRows = await db
    .select()
    .from(unitQuizzes)
    .where(
      and(
        eq(unitQuizzes.courseId, courseId),
        eq(unitQuizzes.kind, "final_exam")
      )
    )
    .limit(1);
  const quiz = quizRows[0];
  if (!quiz) return { quiz: undefined, questions: [] };
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(quizQuestions.orderIndex);
  return { quiz, questions };
}

export async function getFinalExamForLearner(courseId: number, userId: number) {
  const db = await getDb();
  if (!db) return { quiz: undefined, questions: [], eligible: false as const };
  const enrollment = await db
    .select({ status: courseEnrollments.status })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, courseId)
      )
    )
    .limit(1);
  const eligible = enrollment[0]?.status === "completed";
  const quizRows = await db
    .select()
    .from(unitQuizzes)
    .where(
      and(
        eq(unitQuizzes.courseId, courseId),
        eq(unitQuizzes.kind, "final_exam")
      )
    )
    .limit(1);
  const quiz = quizRows[0];
  if (!quiz) return { quiz: undefined, questions: [], eligible };
  const questions = eligible
    ? await db
        .select({
          id: quizQuestions.id,
          quizId: quizQuestions.quizId,
          questionType: quizQuestions.questionType,
          promptAr: quizQuestions.promptAr,
          promptFr: quizQuestions.promptFr,
          promptEn: quizQuestions.promptEn,
          optionsJson: quizQuestions.optionsJson,
          orderIndex: quizQuestions.orderIndex,
        })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quiz.id))
        .orderBy(quizQuestions.orderIndex)
    : [];
  return { quiz, questions, eligible };
}


export async function countQuizAttempts(quizId: number, userId: number) {
    const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, userId))
    );
  return rows.length;
}


export async function getPendingReviewAnswers(
  role: "teacher" | "institution" | "admin",
  userId: number
) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: quizAttemptAnswers.id,
      attemptId: quizAttemptAnswers.attemptId,
      submittedAnswer: quizAttemptAnswers.submittedAnswer,
      questionType: quizAttemptAnswers.questionType,
      createdAt: quizAttemptAnswers.createdAt,
      promptAr: quizQuestions.promptAr,
      promptFr: quizQuestions.promptFr,
      promptEn: quizQuestions.promptEn,
      quizId: quizAttempts.quizId,
      learnerId: quizAttempts.userId,
      learnerName: users.name,
    })
    .from(quizAttemptAnswers)
    .leftJoin(quizAttempts, eq(quizAttempts.id, quizAttemptAnswers.attemptId))
    .leftJoin(
      quizQuestions,
      eq(quizQuestions.id, quizAttemptAnswers.questionId)
    )
    .leftJoin(users, eq(users.id, quizAttempts.userId))
    .where(isNull(quizAttemptAnswers.isCorrect))
    .orderBy(quizAttemptAnswers.createdAt);
  if (role === "admin") return rows;
  const ownershipCache = new Map<number, boolean>();
  const filtered: typeof rows = [];
  for (const row of rows) {
    if (!row.quizId) continue;
    if (!ownershipCache.has(row.quizId))
      ownershipCache.set(row.quizId, await ownedQuiz(row.quizId, role, userId));
    if (ownershipCache.get(row.quizId)) filtered.push(row);
  }
  return filtered;
}
