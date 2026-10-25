import { toHundredths } from "./points";
import type { GeneratedQuestion, GenerationRequest } from "./types";

// A purely deterministic, code-computed check of an exam's STRUCTURE
// (question count, point arithmetic, id integrity) — distinct from Gemini's
// independent PEDAGOGICAL review (ExamReview: solution errors, ambiguous
// wording, missing data). Never calls a model and never approximates with
// floating point: every points comparison goes through toHundredths's exact
// integer-hundredths representation, so it can never falsely pass or fail a
// total due to rounding. Shown to the teacher as its own panel
// (StructuralReviewPanel) so the two kinds of review are never conflated —
// a structural pass says nothing about whether the questions or solutions
// are pedagogically sound, and a pedagogical "no issues" says nothing about
// whether the points actually add up.
export type StructuralCheckId =
  | "has_questions"
  | "unique_question_ids"
  | "unique_criterion_ids"
  | "criteria_sum_matches_question_points"
  | "no_empty_prompt_or_solution"
  | "no_empty_or_nonpositive_criterion_points"
  | "question_count_matches_requested";

export interface StructuralCheckResult {
  id: StructuralCheckId;
  label: string;
  passed: boolean;
  detail: string;
}

export interface StructuralReview {
  passed: boolean;
  totalPoints: number;
  checks: StructuralCheckResult[];
}

function pointsLabel(hundredths: number): string {
  return (hundredths / 100).toString();
}

export function computeStructuralReview(exam: Pick<GenerationRequest, "questions" | "numQuestions">): StructuralReview {
  const { questions } = exam;
  const checks: StructuralCheckResult[] = [];

  checks.push({
    id: "has_questions",
    label: "يحتوي الامتحان على سؤال واحد على الأقل",
    passed: questions.length > 0,
    detail: `${questions.length} سؤال(أسئلة)`,
  });

  const questionIds = questions.map((q) => q.id);
  const uniqueQuestionIds = new Set(questionIds);
  checks.push({
    id: "unique_question_ids",
    label: "معرّفات الأسئلة فريدة بلا تكرار",
    passed: uniqueQuestionIds.size === questionIds.length,
    detail:
      uniqueQuestionIds.size === questionIds.length
        ? "لا تكرار"
        : `يوجد تكرار: ${questionIds.length - uniqueQuestionIds.size} معرّف(ات) مكرّرة`,
  });

  const duplicateCriterionIssues: string[] = [];
  const emptyPromptIssues: string[] = [];
  const nonPositiveCriterionIssues: string[] = [];
  const mismatchIssues: string[] = [];
  let totalUnits = 0;

  questions.forEach((q: GeneratedQuestion, i: number) => {
    totalUnits += toHundredths(q.points);

    const criterionIds = q.rubric.map((r) => r.id);
    if (new Set(criterionIds).size !== criterionIds.length) {
      duplicateCriterionIssues.push(`السؤال ${i + 1}`);
    }

    if (!q.prompt.trim() || !q.solution.trim()) {
      emptyPromptIssues.push(`السؤال ${i + 1}`);
    }

    for (const r of q.rubric) {
      if (!(r.points > 0)) nonPositiveCriterionIssues.push(`${r.criterion || "معيار"} (السؤال ${i + 1})`);
    }

    const criteriaSum = q.rubric.reduce((s, r) => s + toHundredths(r.points), 0);
    if (criteriaSum !== toHundredths(q.points)) {
      mismatchIssues.push(
        `السؤال ${i + 1}: مجموع المعايير ${pointsLabel(criteriaSum)} لا يساوي نقطة السؤال ${q.points}`,
      );
    }
  });

  checks.push({
    id: "unique_criterion_ids",
    label: "معرّفات معايير التصحيح فريدة داخل كل سؤال",
    passed: duplicateCriterionIssues.length === 0,
    detail: duplicateCriterionIssues.length === 0 ? "لا تكرار" : `تكرار في: ${duplicateCriterionIssues.join("، ")}`,
  });

  checks.push({
    id: "criteria_sum_matches_question_points",
    label: "مجموع نقاط معايير كل سؤال يساوي نقطة السؤال بالضبط",
    passed: mismatchIssues.length === 0,
    detail: mismatchIssues.length === 0 ? "مطابق في كل الأسئلة" : mismatchIssues.join(" — "),
  });

  checks.push({
    id: "no_empty_prompt_or_solution",
    label: "لا يوجد سؤال أو حل نموذجي فارغ",
    passed: emptyPromptIssues.length === 0,
    detail: emptyPromptIssues.length === 0 ? "لا فراغات" : `فارغ في: ${emptyPromptIssues.join("، ")}`,
  });

  checks.push({
    id: "no_empty_or_nonpositive_criterion_points",
    label: "كل معايير التصحيح لها نقطة موجبة",
    passed: nonPositiveCriterionIssues.length === 0,
    detail:
      nonPositiveCriterionIssues.length === 0 ? "كل المعايير موجبة" : `غير صالح: ${nonPositiveCriterionIssues.join("، ")}`,
  });

  // numQuestions reflects what the teacher originally asked for only for the
  // AI-generated path — an imported or page-exercise exam's numQuestions is
  // set to the actual extracted count, so this check never fires a false
  // mismatch for those paths (see createGeneration in generation.ts).
  checks.push({
    id: "question_count_matches_requested",
    label: "عدد الأسئلة يطابق العدد المطلوب",
    passed: questions.length === exam.numQuestions,
    detail: `مطلوب: ${exam.numQuestions} — فعلي: ${questions.length}`,
  });

  return {
    passed: checks.every((c) => c.passed),
    totalPoints: totalUnits / 100,
    checks,
  };
}
