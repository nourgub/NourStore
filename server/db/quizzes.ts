import {
  and,
  eq,
  isNull,
} from "drizzle-orm";
import {
  courseEnrollments,
  courses,
  quizAttempts,
  quizAttemptAnswers,
  quizQuestions,
  unitQuizzes,
  units,
  users,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";

// ---------------------------------------------------------------------------
// Admin audit log: a real, append-only record of sensitive admin actions.
// MySQL-only. Never throws — a logging failure must never block the actual
// action it's recording.
// ---------------------------------------------------------------------------
import { getDb } from "./shared";
import { GradableQuestion, gradeAnswers, summarizeGrading } from "../quizGrading";
import { issueCertificate } from "./certificates";
import { awardPoints, checkAndAwardBadges } from "./gamification";
import { createNotification } from "./notifications";

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

async function ownedQuiz(
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

export async function saveQuizAttempt(input: {
  quizId: number;
  userId: number;
  score: number;
  passed: boolean;
  attemptNumber: number;
  feedbackJson?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db
    .insert(quizAttempts)
    .values({ ...input, passed: input.passed ? 1 : 0 });
}

export async function submitQuizAttempt(input: {
  quiz: {
    id: number;
    passScore: number;
    maxAttempts: number;
    kind: "unit_quiz" | "final_exam";
    courseId?: number | null;
  };
  questions: (GradableQuestion & {
    promptAr: string;
    promptFr: string;
    promptEn: string;
    optionsJson: string | null;
    explanationAr: string | null;
    explanationFr: string | null;
    explanationEn: string | null;
  })[];
  userId: number;
  answers: Record<string, string>;
}) {
    return submitQuizAttemptMysql(input);
}

async function submitQuizAttemptMysql(input: {
  quiz: {
    id: number;
    passScore: number;
    maxAttempts: number;
    kind: "unit_quiz" | "final_exam";
    courseId?: number | null;
  };
  questions: (GradableQuestion & {
    promptAr: string;
    promptFr: string;
    promptEn: string;
    optionsJson: string | null;
    explanationAr: string | null;
    explanationFr: string | null;
    explanationEn: string | null;
  })[];
  userId: number;
  answers: Record<string, string>;
}) {
  const db = await getDb();
  if (!db) return { ok: false as const, reason: "unavailable" as const };
  const attempts = await countQuizAttempts(input.quiz.id, input.userId);
  if (attempts >= input.quiz.maxAttempts)
    return { ok: false as const, reason: "max_attempts" as const };
  const graded = gradeAnswers(input.questions, input.answers);
  const summary = summarizeGrading(graded, input.quiz.passScore);
  const attemptNumber = attempts + 1;
  await db
    .insert(quizAttempts)
    .values({
      quizId: input.quiz.id,
      userId: input.userId,
      score: summary.score,
      passed: summary.passed ? 1 : 0,
      status: summary.status,
      attemptNumber,
      feedbackJson: JSON.stringify({
        correct: summary.correctCount,
        total: summary.total,
        pending: summary.hasPending,
      }),
    });
  const insertedRows = await db
    .select({ id: quizAttempts.id })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.quizId, input.quiz.id),
        eq(quizAttempts.userId, input.userId),
        eq(quizAttempts.attemptNumber, attemptNumber)
      )
    )
    .limit(1);
  const attemptId = insertedRows[0]?.id;
  if (attemptId) {
    for (const answer of graded) {
      await db
        .insert(quizAttemptAnswers)
        .values({
          attemptId,
          questionId: answer.questionId,
          questionType: answer.questionType,
          submittedAnswer: answer.submittedAnswer,
          isCorrect:
            answer.isCorrect === null ? null : answer.isCorrect ? 1 : 0,
        });
    }
  }
  if (
    summary.status === "graded" &&
    summary.passed &&
    input.quiz.kind === "final_exam" &&
    input.quiz.courseId
  ) {
    await issueCertificate({
      userId: input.userId,
      courseId: input.quiz.courseId,
    });
  }
  if (summary.status === "graded" && summary.passed) {
    await awardPoints({
      userId: input.userId,
      reason: "quiz_passed",
      refId: input.quiz.id,
    });
    await checkAndAwardBadges(input.userId);
  }
  const results = input.questions.map((question, index) => {
    const answer = graded[index];
    // Correct answer / explanation are only ever revealed once that specific
    // question has a verdict — never for a still-pending open/code answer.
    const reveal = answer.isCorrect !== null;
    return {
      id: question.id,
      selected: answer.submittedAnswer,
      correct: answer.isCorrect,
      pendingReview: answer.isCorrect === null,
      answerKey: reveal ? question.answerKey : null,
      explanationAr: reveal ? question.explanationAr : null,
      explanationFr: reveal ? question.explanationFr : null,
      explanationEn: reveal ? question.explanationEn : null,
    };
  });
  return {
    ok: true as const,
    score: summary.score,
    passed: summary.passed,
    status: summary.status,
    attemptNumber,
    attemptsRemaining: Math.max(0, input.quiz.maxAttempts - attemptNumber),
    correct: summary.correctCount,
    total: summary.total,
    pendingReview: summary.hasPending,
    results,
  };
}

export async function gradeQuizAnswer(input: {
  attemptAnswerId: number;
  isCorrect: boolean;
  role: "teacher" | "institution" | "admin";
  userId: number;
}) {
  const db = await getDb();
  if (!db) return false;
  const answerRows = await db
    .select({
      id: quizAttemptAnswers.id,
      attemptId: quizAttemptAnswers.attemptId,
    })
    .from(quizAttemptAnswers)
    .where(eq(quizAttemptAnswers.id, input.attemptAnswerId))
    .limit(1);
  const answerRow = answerRows[0];
  if (!answerRow) return false;
  const attemptRows = await db
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      userId: quizAttempts.userId,
    })
    .from(quizAttempts)
    .where(eq(quizAttempts.id, answerRow.attemptId))
    .limit(1);
  const attempt = attemptRows[0];
  if (!attempt) return false;
  if (!(await ownedQuiz(attempt.quizId, input.role, input.userId)))
    return false;
  await db
    .update(quizAttemptAnswers)
    .set({
      isCorrect: input.isCorrect ? 1 : 0,
      reviewedBy: input.userId,
      reviewedAt: new Date(),
    })
    .where(eq(quizAttemptAnswers.id, answerRow.id));
  const allAnswers = await db
    .select({ isCorrect: quizAttemptAnswers.isCorrect })
    .from(quizAttemptAnswers)
    .where(eq(quizAttemptAnswers.attemptId, attempt.id));
  const stillPending = allAnswers.some(a => a.isCorrect === null);
  const correctCount = allAnswers.filter(a => a.isCorrect === 1).length;
  const total = allAnswers.length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;
  const quizRows = await db
    .select({
      passScore: unitQuizzes.passScore,
      courseId: unitQuizzes.courseId,
      kind: unitQuizzes.kind,
    })
    .from(unitQuizzes)
    .where(eq(unitQuizzes.id, attempt.quizId))
    .limit(1);
  const passScore = quizRows[0]?.passScore ?? 60;
  const passed = !stillPending && score >= passScore;
  await db
    .update(quizAttempts)
    .set({
      score,
      passed: passed ? 1 : 0,
      status: stillPending ? "pending_review" : "graded",
    })
    .where(eq(quizAttempts.id, attempt.id));
  if (
    !stillPending &&
    passed &&
    quizRows[0]?.kind === "final_exam" &&
    quizRows[0]?.courseId
  ) {
    await issueCertificate({
      userId: attempt.userId,
      courseId: quizRows[0].courseId,
    });
  }
  return true;
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
