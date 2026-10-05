// Tafawoq AI Teacher — deterministic answer checking.
//
// Multiple-choice answers and short answers are graded here, never by a
// model: a short answer passes when it matches an accepted form or — unless
// the item says grading: "exact" — when it is mathematically equivalent to
// the key (./mathExpr.ts), so "2(3x²−2)" passes for "6x² − 4". Only an
// answer that fails both is optionally passed on to Claude (./ai.ts), when
// one is configured, to explain the mistake.
import type { BankQuestion } from "./curriculum";
import { expressionsEquivalent } from "./mathExpr";

const DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

const SUPERSCRIPTS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-",
};

export function normalizeAnswer(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/[٠-٩۰-۹]/g, digit => DIGITS[digit] ?? digit);
  // Runs of superscripts become one exponent: x²³ → x^23, x⁻² → x^-2.
  value = value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, run =>
    "^" + Array.from(run).map(char => SUPERSCRIPTS[char]).join("")
  );
  value = value
    .replace(/[−–—]/g, "-")
    .replace(/[×·✕]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[٫,،]/g, ".")
    .replace(/\s+/g, "");
  return value;
}

function asNumber(value: string): number | null {
  return /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : null;
}

export function answersMatch(expected: string, given: string): boolean {
  const a = normalizeAnswer(expected);
  const b = normalizeAnswer(given);
  if (!b) return false;
  if (a === b) return true;
  const numberA = asNumber(a);
  const numberB = asNumber(b);
  return numberA !== null && numberB !== null && Math.abs(numberA - numberB) < 1e-9;
}

export type DeterministicGrade =
  | { status: "correct" }
  | { status: "incorrect"; misconception: string | null }
  | { status: "unmatched" };

export function gradeDeterministic(
  question: Pick<BankQuestion, "type" | "answer" | "accept" | "distractors" | "options" | "grading">,
  given: string
): DeterministicGrade {
  if (question.type === "mcq") {
    const chosen = question.options?.find(option => answersMatch(option, given));
    if (chosen === undefined) return { status: "incorrect", misconception: null };
    if (answersMatch(question.answer, chosen)) return { status: "correct" };
    return {
      status: "incorrect",
      misconception: question.distractors?.[chosen] ?? null,
    };
  }
  if (!normalizeAnswer(given)) return { status: "incorrect", misconception: null };
  const accepted = [question.answer, ...(question.accept ?? [])];
  if (accepted.some(form => answersMatch(form, given))) return { status: "correct" };
  if (question.grading !== "exact" && accepted.some(form => expressionsEquivalent(form, given))) {
    return { status: "correct" };
  }
  return { status: "unmatched" };
}
