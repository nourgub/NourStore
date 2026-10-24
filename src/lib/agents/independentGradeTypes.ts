import type { GeneratedQuestion } from "../types";

// Shared contract both independent graders (Claude in gradingAgent.ts, Gemini
// in geminiPaperReviewAgent.ts) must produce, so the grading manager can
// compare them field-for-field without special-casing either model.

export type AnswerStatus = "answered" | "empty" | "unreadable" | "missing_page";

export interface IndependentCriterionAward {
  criterionId: string;
  // null only when the question's answerStatus is not "answered" — an
  // unreadable or missing answer is never silently scored as 0.
  awardedPoints: number | null;
  note: string;
}

export interface IndependentQuestionGrade {
  questionId: string;
  transcription: string;
  answerStatus: AnswerStatus;
  criteriaAwards: IndependentCriterionAward[];
  // Short constructive note for the student about this answer.
  feedback: string;
  // Non-null when the student's writing appears to address the grader/AI
  // directly rather than answering the question — flagged for mandatory
  // human review, never acted on by either model.
  suspiciousInstructionNote: string | null;
}

export interface IndependentPaperGrade {
  model: string;
  questions: IndependentQuestionGrade[];
}

/**
 * Rejects model output that doesn't name every known question/criterion id
 * exactly once — never falls back to matching by array position. Used by
 * both independent graders so an id-matching bug can't hide in just one.
 */
export function validateAgainstRubric(
  results: { questionId: string; criteriaAwards: { criterionId: string }[] }[],
  questions: GeneratedQuestion[],
  errorClass: new (message: string) => Error,
): void {
  const expectedQuestionIds = new Set(questions.map((q) => q.id));
  const seenQuestionIds = new Set<string>();

  for (const r of results) {
    if (!expectedQuestionIds.has(r.questionId)) {
      throw new errorClass(`نتيجة تصحيح تشير إلى سؤال غير معروف: ${r.questionId}`);
    }
    if (seenQuestionIds.has(r.questionId)) {
      throw new errorClass(`نتيجة تصحيح مكررة لنفس السؤال: ${r.questionId}`);
    }
    seenQuestionIds.add(r.questionId);
  }
  for (const q of questions) {
    if (!seenQuestionIds.has(q.id)) {
      throw new errorClass(`لا توجد نتيجة تصحيح لسؤال: ${q.id}`);
    }
  }

  for (const r of results) {
    const question = questions.find((q) => q.id === r.questionId)!;
    const expectedCriterionIds = new Set(question.rubric.map((c) => c.id));
    const seenCriterionIds = new Set<string>();
    for (const award of r.criteriaAwards) {
      if (!expectedCriterionIds.has(award.criterionId)) {
        throw new errorClass(`معيار غير معروف للسؤال ${r.questionId}: ${award.criterionId}`);
      }
      if (seenCriterionIds.has(award.criterionId)) {
        throw new errorClass(`معيار مكرر للسؤال ${r.questionId}: ${award.criterionId}`);
      }
      seenCriterionIds.add(award.criterionId);
    }
    for (const c of question.rubric) {
      if (!seenCriterionIds.has(c.id)) {
        throw new errorClass(`لا توجد نتيجة لمعيار في السؤال ${r.questionId}: ${c.id}`);
      }
    }
  }
}
