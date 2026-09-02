// Pure grading logic, deliberately kept free of any database access so it can
// be unit-tested directly (see quizGrading.test.ts) without spinning up MySQL.
//
// The one rule this module exists to enforce: choice/true_false questions are
// auto-graded by comparing to answerKey; open/code questions are NEVER
// compared to answerKey automatically — their isCorrect is left `null`
// ("pending manual review") until a teacher grades them explicitly.

export type QuestionType = "choice" | "true_false" | "open" | "code";

export type GradableQuestion = {
  id: number;
  questionType: QuestionType;
  answerKey: string | null;
};

export type GradedAnswer = {
  questionId: number;
  questionType: QuestionType;
  submittedAnswer: string | null;
  /** true/false for auto-graded questions, null = pending manual review (open/code). */
  isCorrect: boolean | null;
};

const AUTO_GRADABLE_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  "choice",
  "true_false",
]);

export function gradeAnswers(
  questions: GradableQuestion[],
  answers: Record<string, string>
): GradedAnswer[] {
  return questions.map((question, index) => {
    const submitted = answers[String(index)] ?? null;
    const isAutoGradable = AUTO_GRADABLE_TYPES.has(question.questionType);
    return {
      questionId: question.id,
      questionType: question.questionType,
      submittedAnswer: submitted,
      isCorrect: isAutoGradable ? submitted === question.answerKey : null,
    };
  });
}

export type GradingSummary = {
  total: number;
  correctCount: number;
  hasPending: boolean;
  score: number;
  passed: boolean;
  status: "graded" | "pending_review";
};

export function summarizeGrading(
  graded: GradedAnswer[],
  passScore: number
): GradingSummary {
  const total = graded.length;
  const correctCount = graded.filter(g => g.isCorrect === true).length;
  const hasPending = graded.some(g => g.isCorrect === null);
  // Score is computed against the full question count (not just the graded
  // ones), so a pending-review attempt shows a conservative, not-yet-final
  // score rather than an inflated one based on a partial denominator.
  const score = total ? Math.round((correctCount / total) * 100) : 0;
  const passed = !hasPending && score >= passScore;
  return {
    total,
    correctCount,
    hasPending,
    score,
    passed,
    status: hasPending ? "pending_review" : "graded",
  };
}
