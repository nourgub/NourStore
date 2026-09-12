import { and, eq } from "drizzle-orm";
import {
  quizAttemptAnswers,
  quizAttempts,
  unitQuizzes,
} from "../../../drizzle/schema";
import { getDb } from "../shared";
import { GradableQuestion, gradeAnswers, summarizeGrading } from "../../quizGrading";
import { issueCertificate } from "../certificates";
import { awardPoints, checkAndAwardBadges } from "../gamification";
import { countQuizAttempts } from "./reads";
import { ownedQuiz } from "./authoring";

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

