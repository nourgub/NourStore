// Tafawoq AI Teacher — parametric exercise generators.
//
// A generator is a template ("derivative of a·xⁿ") that draws its numbers
// from a seeded RNG and COMPUTES the answer, a worked solution, and — for
// multiple choice — distractors produced by applying a specific wrong
// rule (so picking one reveals that misconception). This gives an
// unlimited supply of correct, diagnostic exercises for free: no model
// call, no hand-written answer key that can be wrong.
//
// Every generator is exercised by server/tafawoq/generators.test.ts over
// many seeds: the key must grade as correct, options must be distinct,
// and no distractor may be mathematically equal to the answer.

export type Rng = {
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Non-zero integer in [min, max]. */
  nonZero(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
};

export function createRng(seed: number): Rng {
  // mulberry32 — tiny, fast, good enough for exercise variety.
  let state = seed >>> 0 || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    nonZero: (min, max) => {
      for (;;) {
        const value = rng.int(min, max);
        if (value !== 0) return value;
      }
    },
    pick: items => items[Math.floor(next() * items.length)],
    chance: probability => next() < probability,
    shuffle: items => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
  return rng;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31) + 1;
}

export type GeneratedItem = {
  type: "mcq" | "short";
  prompt: string;
  /** Canonical answer, shown to the student after grading. */
  answer: string;
  /** Other accepted spellings (short answers). */
  accept?: string[];
  /**
   * How a short answer is checked: "expression" (default) accepts any
   * mathematically equivalent form; "exact" requires one of the listed
   * forms (e.g. "simplify this fraction", where 6/9 must not pass as 2/3).
   */
  grading?: "expression" | "exact" | "numeric";
  /** MCQ only: exactly three wrong options, each tagged with its misconception key. */
  distractors?: Array<{ option: string; misconception: string }>;
  /** Worked solution, step by step. */
  steps: string[];
};

export type Generator = {
  /** Unique within its lesson, e.g. "power-rule-basic". */
  id: string;
  skill: string;
  difficulty: 1 | 2 | 3;
  generate(rng: Rng): GeneratedItem;
};

// ---------------------------------------------------------------------------
// Formatting helpers — produce the readable unicode math used everywhere in
// the UI (x², f′(x), √, −). Keep all generator output going through these
// so a sign or exponent is never rendered two different ways.
// ---------------------------------------------------------------------------

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", n: "ⁿ",
};

export function sup(exponent: number | string): string {
  return String(exponent)
    .split("")
    .map(char => SUPERSCRIPTS[char] ?? char)
    .join("");
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** A number with a real minus sign: −3. */
export function num(value: number): string {
  if (Object.is(value, -0)) value = 0;
  const text = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
  return text.replace("-", "−");
}

/** Reduced fraction p/q ("3/4", "−1/2", "5"). */
export function frac(p: number, q: number): string {
  if (q === 0) throw new Error("zero denominator");
  if (q < 0) {
    p = -p;
    q = -q;
  }
  const divisor = gcd(p, q);
  p /= divisor;
  q /= divisor;
  return q === 1 ? num(p) : `${num(p)}/${q}`;
}

/** k·(variable)^power as a monomial without sign handling: "3x²", "x", "5". */
function monomialBody(coefficient: number, power: number, variable: string): string {
  const abs = Math.abs(coefficient);
  if (power === 0) return num(abs);
  const coefficientText = abs === 1 ? "" : num(abs);
  const powerText = power === 1 ? "" : sup(power);
  return `${coefficientText}${variable}${powerText}`;
}

/**
 * Polynomial from [exponent, coefficient] terms, highest first, with
 * zero terms dropped and proper " + " / " − " joins: "3x² − x + 5".
 */
export function poly(terms: Array<[number, number]>, variable = "x"): string {
  const nonZero = terms.filter(([, coefficient]) => coefficient !== 0);
  if (!nonZero.length) return "0";
  return nonZero
    .map(([power, coefficient], index) => {
      const body = monomialBody(coefficient, power, variable);
      if (index === 0) return coefficient < 0 ? `−${body}` : body;
      return coefficient < 0 ? ` − ${body}` : ` + ${body}`;
    })
    .join("");
}

/** a·x + b */
export function linear(a: number, b: number, variable = "x"): string {
  return poly([
    [1, a],
    [0, b],
  ], variable);
}

/** Wraps in parentheses when the text is a sum/difference or starts with a sign. */
export function paren(text: string): string {
  return /[+−-]/.test(text.slice(1)) || text.startsWith("−") ? `(${text})` : text;
}

/** "+ 3" / "− 3" for appending a signed constant to an expression. */
export function signed(value: number): string {
  return value < 0 ? `− ${num(-value)}` : `+ ${num(value)}`;
}

/** k·body with the coefficient written the way a teacher would: x, −x, 3x. */
export function mul(k: number, body: string): string {
  if (k === 1) return body;
  if (k === -1) return `−${body}`;
  return `${num(k)}${body}`;
}

/**
 * Joins already-formatted terms into a sum, turning a leading "−" into a
 * subtraction and dropping zero terms: join("3x", "−2", "0") → "3x − 2".
 */
export function join(...terms: string[]): string {
  const kept = terms.filter(term => term !== "0" && term !== "");
  if (!kept.length) return "0";
  return kept
    .map((term, index) => {
      if (index === 0) return term;
      return term.startsWith("−") ? ` − ${term.slice(1)}` : ` + ${term}`;
    })
    .join("");
}

/** (p/q)·x^power as a monomial: "x⁵/5" style is avoided; gives "5/6x⁶"→"(5/6)x⁶". */
export function fracMonomial(p: number, q: number, power: number, variable = "x"): string {
  const coefficient = frac(p, q);
  const body = power === 0 ? "" : power === 1 ? variable : `${variable}${sup(power)}`;
  if (!body) return coefficient;
  if (coefficient === "1") return body;
  if (coefficient === "−1") return `−${body}`;
  return coefficient.includes("/") ? `(${coefficient})${body}` : `${coefficient}${body}`;
}

/** k × body for written arithmetic: "3×(−2)²", "(−2)²", "−(−2)²". */
export function times(k: number, body: string): string {
  if (k === 1) return body;
  if (k === -1) return `−${body}`;
  return `${num(k)}×${body}`;
}

/**
 * How many variants of each generated exercise the teacher says aloud. What
 * is spoken (the call's example, the oral quiz, the tutor's worked examples)
 * is drawn from this fixed set, so its voice is synthesised once and shared
 * by every student (server/tafawoq/ttsWarmup.ts prepares it ahead, variant 1
 * first). Written practice and exams keep unlimited variety (randomSeed).
 */
export const SPOKEN_VARIANTS = Math.max(1, Number(process.env.TAFAWOQ_SPOKEN_VARIANTS ?? 30));

/**
 * A seed among the spoken variants. With `used` (what this student already
 * answered): the first variant they have not met — every student goes
 * through the same, already-voiced variants in the same order; once all are
 * met, any of them.
 */
export function spokenSeed(used?: (seed: number) => boolean): number {
  if (used) {
    for (let seed = 1; seed <= SPOKEN_VARIANTS; seed += 1) if (!used(seed)) return seed;
  }
  return 1 + Math.floor(Math.random() * SPOKEN_VARIANTS);
}
