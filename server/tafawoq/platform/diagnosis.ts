// Tafawoq BAC platform — beyond "right / wrong": what kind of mistake a
// wrong answer is, and where in the worked solution the student stopped.
//
// Deterministic. A wrong multiple-choice option is tagged with the
// misconception it reveals (the item's distractors), which is classified
// from its own wording; a wrong typed answer is compared with the expected
// answer and with every intermediate result of the worked solution, so
// "the opposite of the answer" is a sign error and "the result of step 2"
// is an unfinished answer that stopped at step 3.
import type { ErrorType, PlacementLevel } from "@shared/bacPlatform";
import { PLACEMENT_LEVELS } from "@shared/bacPlatform";
import type { BankQuestion } from "../curriculum";
import { expressionsEquivalent, parseExpression, evaluateConstant } from "../mathExpr";
import { normalizeAnswer } from "../grading";

/** Kind of mistake behind a misconception, from its key and its label. */
export function classifyMisconception(key: string | null, label: string | null): ErrorType {
  const text = `${key ?? ""} ${label ?? ""}`.toLowerCase();
  if (/misread|قراءة/.test(text)) return "reading";
  if (/sign|إشارة|الإشارة|direction|اتجاه المتراجحة/.test(text)) return "sign";
  if (/دون التحقق|دون دراسة|التحقق من|شرط|التوقف عند|no_study|_check|condition|domain|indeterminate/.test(text)) {
    return "method";
  }
  if (/eval_error|calc|arith|حساب|التعويض|التبسيط/.test(text)) return "calculation";
  return "rule";
}

/** The result each step of a worked solution arrives at (text after its last "="). */
export function stepResults(steps: string[]): Array<string | null> {
  return steps.map(step => {
    const index = step.lastIndexOf("=");
    if (index === -1) return null;
    const result = step
      .slice(index + 1)
      .replace(/[.،؛:]+\s*$/, "")
      .trim();
    return result && parseExpression(result) !== null ? result : null;
  });
}

function negate(expression: string) {
  return `-(${expression})`;
}

export type Diagnosis = {
  errorType: ErrorType;
  /** 1-based step of the worked solution where the answer went wrong, when known. */
  step: number | null;
};

/**
 * Diagnoses a wrong answer. `misconceptionKey`/`label` come from grading
 * (a tagged distractor); for a typed answer they are usually null.
 */
export function diagnoseAnswer(
  item: Pick<BankQuestion, "type" | "answer" | "steps">,
  given: string,
  misconceptionKey: string | null,
  misconceptionLabel: string | null
): Diagnosis {
  if (!normalizeAnswer(given)) return { errorType: "incomplete", step: null };
  if (misconceptionKey || misconceptionLabel) {
    return { errorType: classifyMisconception(misconceptionKey, misconceptionLabel), step: null };
  }
  if (item.type === "mcq") return { errorType: "rule", step: null };

  // "x = 3" for "3": judge the value, not the way it was written.
  given = given.replace(/^\s*[a-zA-Z]\w*\s*=\s*/, "");
  if (parseExpression(given) === null) return { errorType: "organization", step: null };
  if (expressionsEquivalent(negate(item.answer), given)) return { errorType: "sign", step: null };

  const results = stepResults(item.steps ?? []);
  // Stopped half-way: the answer is an intermediate result of the solution.
  for (let index = 0; index < results.length - 1; index += 1) {
    const result = results[index];
    if (result && !expressionsEquivalent(item.answer, result) && expressionsEquivalent(result, given)) {
      return { errorType: "incomplete", step: index + 2 };
    }
  }
  const expected = evaluateConstant(item.answer);
  const value = evaluateConstant(given);
  if (expected !== null && value !== null) {
    if (Math.abs(value + expected) < 1e-9 && expected !== 0) return { errorType: "sign", step: null };
    return { errorType: "calculation", step: null };
  }
  return { errorType: "rule", step: null };
}

/** Difficulty-weighted share of correct answers (hard questions count more). */
export function weightedScore(items: Array<{ difficulty: number; correct: boolean }>) {
  const total = items.reduce((sum, item) => sum + item.difficulty, 0);
  if (!total) return 0;
  return items.reduce((sum, item) => sum + (item.correct ? item.difficulty : 0), 0) / total;
}

/** Placement level from a weighted score in [0, 1]. */
export function placementLevel(score: number): PlacementLevel {
  const index = Math.min(PLACEMENT_LEVELS.length - 1, Math.max(0, Math.floor(score * 5)));
  return PLACEMENT_LEVELS[index];
}
