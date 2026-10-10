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

const SUPERSCRIPT_DIGITS: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };

/**
 * The number in a physics answer: "2.5", "2,5 s", "1.2×10⁻³", "1.2e-3 mol",
 * "1,2 x 10^-3"; null when there is none. A trailing unit is ignored.
 */
export function parseQuantity(text: string): number | null {
  let value = text
    .trim()
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, char => SUPERSCRIPT_DIGITS[char])
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, "")
    .replace(/(\d),(\d)/g, "$1.$2");
  value = value.replace(/(?:[×x*·]|\.)10\^?\(?([+-]?\d+)\)?/i, "e$1");
  const match = value.match(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function closeEnough(expected: number, value: number) {
  if (expected === 0) return Math.abs(value) < 1e-9;
  return Math.abs(value - expected) <= Math.abs(expected) * 0.02;
}

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
  if (question.grading === "numeric") {
    // A measured quantity: any written form of the same value, its unit or not, to 2 %.
    const expected = accepted.map(parseQuantity).filter((value): value is number => value !== null);
    const value = parseQuantity(given);
    if (value !== null && expected.some(target => closeEnough(target, value))) return { status: "correct" };
    return value === null ? { status: "unmatched" } : { status: "incorrect", misconception: null };
  }
  if (accepted.some(form => answersMatch(form, given))) return { status: "correct" };
  if (question.grading !== "exact" && accepted.some(form => expressionsEquivalent(form, given))) {
    return { status: "correct" };
  }
  return { status: "unmatched" };
}
