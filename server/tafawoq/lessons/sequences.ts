// BAC lesson "المتتاليات العددية" (Algerian curriculum): skill graph,
// misconceptions, remedies and parametric generators (see
// ./derivativesGenerators.ts for the pattern every generator follows).
// Numeric terms, sums, ratios and explicit forms in n are typed; the nature
// of a sequence, its monotonicity and ±∞ / "no limit" answers are mcq.
import type { Lesson } from "../curriculum";
import { sequenceProblems } from "./sequencesProblems";
import { answersMatch } from "../grading";
import { expressionsEquivalent } from "../mathExpr";
import { frac, gcd, join, linear, mul, num, paren, poly, signed, sup, type Generator, type Rng } from "../generators/core";

/** Re-draws until `valid` holds — keeps generators free of degenerate cases. */
function draw<T>(rng: Rng, make: (rng: Rng) => T, valid: (value: T) => boolean): T {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = make(rng);
    if (valid(value)) return value;
  }
  throw new Error("generator could not find valid parameters");
}

/** Options are pairwise different as text and as mathematics. */
function allDifferent(...options: string[]): boolean {
  for (let i = 0; i < options.length; i += 1) {
    for (let j = i + 1; j < options.length; j += 1) {
      if (answersMatch(options[i], options[j])) return false;
      if (expressionsEquivalent(options[i], options[j])) return false;
    }
  }
  return true;
}

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  n: "ₙ", p: "ₚ", "+": "₊", "−": "₋", "-": "₋",
};
const sub = (text: number | string) =>
  Array.from(String(text))
    .map(char => SUBSCRIPTS[char] ?? char)
    .join("");
/** The term u with index i: u₀, u₁₂, uₙ₊₁. */
const u = (i: number | string) => `u${sub(i)}`;

/** Superscript exponent, including n, + and −: "ⁿ⁺¹", "ⁿ⁻¹". */
const supExt = (text: number | string) =>
  Array.from(String(text))
    .map(char => (char === "+" ? "⁺" : char === "−" ? "⁻" : sup(char)))
    .join("");

/** A rational ratio p/d with d > 0. */
type Q = readonly [number, number];
const qStr = ([p, d]: Q) => frac(p, d);
const qValue = ([p, d]: Q) => p / d;
/** q raised to a power: "2ⁿ", "(1/2)ⁿ⁺¹", "(−3)⁴". */
const qPow = (q: Q, exponent: number | string) =>
  `${q[0] < 0 || q[1] !== 1 ? `(${qStr(q)})` : qStr(q)}${supExt(exponent)}`;
/** a × q^exponent written as a teacher would: "3 × 2ⁿ", "(1/2)ⁿ", "−(−2)ⁿ". */
function geoTerm(a: number, q: Q, exponent: number | string): string {
  const power = qPow(q, exponent);
  if (a === 1) return power;
  if (a === -1) return `−${power}`;
  return `${num(a)} × ${power}`;
}
/** a·q^k as a reduced fraction. */
const geoValue = (a: number, [p, d]: Q, k: number) => frac(a * p ** k, d ** k);
const sign = (value: number) => (value > 0 ? ">" : "<");

const ARITH = (r: string) => `حسابية أساسها ${r}`;
const GEO = (q: string) => `هندسية أساسها ${q}`;
const NEITHER = "ليست حسابية ولا هندسية";
const INC = "متزايدة تماماً";
const DEC = "متناقصة تماماً";
const CONST = "ثابتة";
const NOT_MONO = "ليست رتيبة";
const NO_LIMIT = "ليست لها نهاية";

const POSITIVE_Q: Q[] = [[2, 1], [3, 1], [4, 1], [5, 1], [1, 2], [1, 3], [2, 3], [3, 2], [1, 4], [3, 4]];
const SMALL_Q: Q[] = [[1, 2], [1, 3], [2, 3], [3, 4], [1, 5], [2, 5], [-1, 2], [-1, 3], [-2, 3], [-3, 4]];

const generators: Generator[] = [
  // ------------------------------------------------- arithmetic general term
  {
    id: "arith-term-value",
    skill: "arith_term",
    difficulty: 1,
    generate: rng => {
      const a = rng.int(-12, 12);
      const r = rng.nonZero(-7, 7);
      const n = rng.int(6, 40);
      const value = a + n * r;
      return {
        type: "short",
        prompt: `(uₙ) متتالية حسابية حدها الأول u₀ = ${num(a)} وأساسها r = ${num(r)}. احسب ${u(n)}.`,
        answer: num(value),
        steps: [
          "الحد العام لمتتالية حسابية حدها الأول u₀: uₙ = u₀ + n·r",
          `${u(n)} = ${num(a)} + ${n} × ${paren(num(r))}`,
          `${u(n)} = ${num(a)} ${signed(n * r)} = ${num(value)}`,
        ],
      };
    },
  },
  {
    id: "arith-explicit-form",
    skill: "arith_term",
    difficulty: 2,
    generate: rng => {
      const s = rng.chance(0.5) ? 1 : 0;
      const a = rng.int(-12, 12);
      const r = rng.nonZero(-6, 6);
      const answer = linear(r, a - s * r, "n");
      return {
        type: "short",
        prompt: `(uₙ) متتالية حسابية حدها الأول ${u(s)} = ${num(a)} وأساسها r = ${num(r)}. اكتب uₙ بدلالة n.`,
        answer,
        steps:
          s === 0
            ? ["الحد الأول هو u₀ إذن uₙ = u₀ + n·r", `uₙ = ${num(a)} + n × ${paren(num(r))}`, `uₙ = ${answer}`]
            : [
                "الحد الأول هو u₁ إذن uₙ = u₁ + (n − 1)·r",
                `uₙ = ${num(a)} + (n − 1) × ${paren(num(r))}`,
                `uₙ = ${join(num(a), mul(r, "n"), num(-r))}`,
                `uₙ = ${answer}`,
              ],
      };
    },
  },
  {
    id: "arith-term-from-up",
    skill: "arith_term",
    difficulty: 2,
    generate: rng => {
      const [p, k, A, r] = draw(
        rng,
        g => [g.int(1, 6), g.int(4, 20), g.int(-15, 15), g.nonZero(-5, 5)] as const,
        ([p, k, A, r]) =>
          allDifferent(num(A + k * r), num(A + (p + k) * r), num(A + (k + 1) * r), num(k * r))
      );
      const m = p + k;
      const value = A + k * r;
      return {
        type: "mcq",
        prompt: `(uₙ) متتالية حسابية أساسها r = ${num(r)} و ${u(p)} = ${num(A)}. ما قيمة ${u(m)}؟`,
        answer: num(value),
        distractors: [
          { option: num(A + m * r), misconception: "first_term_index" },
          { option: num(A + (k + 1) * r), misconception: "off_by_one" },
          { option: num(k * r), misconception: "arith_forgot_first_term" },
        ],
        steps: [
          "من أجل كل n و p: uₙ = uₚ + (n − p)·r",
          `${u(m)} = ${u(p)} + (${m} − ${p}) × ${paren(num(r))} = ${num(A)} + ${k} × ${paren(num(r))}`,
          `${u(m)} = ${num(A)} ${signed(k * r)} = ${num(value)}`,
        ],
      };
    },
  },
  // -------------------------------------------------- geometric general term
  {
    id: "geo-term-value",
    skill: "geo_term",
    difficulty: 1,
    generate: rng => {
      const s = rng.chance(0.5) ? 1 : 0;
      const [a, q, n] = draw(
        rng,
        g => [g.nonZero(-5, 5), g.pick([-3, -2, 2, 3, 4]), g.int(3, 6)] as const,
        ([a, q, n]) => {
          const e = n - s;
          const wrongIndex = s === 0 ? a * q ** (e - 1) : a * q ** (e + 1);
          return allDifferent(num(a * q ** e), num(a + e * q), num(wrongIndex), num(a * e * q));
        }
      );
      const e = n - s;
      const value = a * q ** e;
      const wrongIndex = s === 0 ? a * q ** (e - 1) : a * q ** (e + 1);
      return {
        type: "mcq",
        prompt: `(uₙ) متتالية هندسية حدها الأول ${u(s)} = ${num(a)} وأساسها q = ${num(q)}. ما قيمة ${u(n)}؟`,
        answer: num(value),
        distractors: [
          { option: num(a + e * q), misconception: "geo_added" },
          { option: num(wrongIndex), misconception: "first_term_index" },
          { option: num(a * e * q), misconception: "geo_power_as_product" },
        ],
        steps: [
          s === 0 ? "الحد الأول هو u₀ إذن uₙ = u₀ × qⁿ" : "الحد الأول هو u₁ إذن uₙ = u₁ × qⁿ⁻¹",
          `${u(n)} = ${num(a)} × ${paren(num(q))}${sup(e)}`,
          `${paren(num(q))}${sup(e)} = ${num(q ** e)}`,
          `${u(n)} = ${num(a)} × ${paren(num(q ** e))} = ${num(value)}`,
        ],
      };
    },
  },
  {
    id: "geo-explicit-form",
    skill: "geo_term",
    difficulty: 2,
    generate: rng => {
      const s = rng.chance(0.5) ? 1 : 0;
      const a = rng.nonZero(-6, 6);
      const q = rng.pick(POSITIVE_Q);
      const answer = geoTerm(a, q, s === 0 ? "n" : "n−1");
      return {
        type: "short",
        prompt: `(uₙ) متتالية هندسية حدها الأول ${u(s)} = ${num(a)} وأساسها q = ${qStr(q)}. اكتب uₙ بدلالة n.`,
        answer,
        steps:
          s === 0
            ? ["الحد الأول هو u₀ إذن uₙ = u₀ × qⁿ", `u₀ = ${num(a)} و q = ${qStr(q)}`, `uₙ = ${answer}`]
            : [
                "الحد الأول هو u₁ (وليس u₀) إذن uₙ = u₁ × qⁿ⁻¹",
                `u₁ = ${num(a)} و q = ${qStr(q)}`,
                `uₙ = ${answer}`,
              ],
      };
    },
  },
  // ------------------------------------------------- r or q from two terms
  {
    id: "find-r-two-terms",
    skill: "ratio_from_terms",
    difficulty: 1,
    generate: rng => {
      const p = rng.int(1, 6);
      const k = rng.int(2, 9);
      const A = rng.nonZero(-15, 15);
      const r = rng.nonZero(-6, 6);
      const B = A + k * r;
      const m = p + k;
      return {
        type: "short",
        prompt: `(uₙ) متتالية حسابية فيها ${u(p)} = ${num(A)} و ${u(m)} = ${num(B)}. احسب أساسها r.`,
        answer: num(r),
        steps: [
          `${u(m)} = ${u(p)} + (${m} − ${p})·r أي ${num(B)} = ${num(A)} + ${k}r`,
          `${k}r = ${num(B)} − ${paren(num(A))} = ${num(k * r)}`,
          `r = ${num(k * r)}/${k} = ${num(r)}`,
        ],
      };
    },
  },
  {
    id: "find-q-two-terms",
    skill: "ratio_from_terms",
    difficulty: 2,
    generate: rng => {
      const [q, k, p, A] = draw(
        rng,
        g => [g.pick([2, 3, 4, 5]), g.pick([2, 3]), g.int(0, 4), g.nonZero(-5, 5)] as const,
        ([q, k, , A]) => allDifferent(num(q), frac(A * q ** k - A, k), num(q ** k), frac(q ** k, k))
      );
      const B = A * q ** k;
      return {
        type: "mcq",
        prompt: `(uₙ) متتالية هندسية حدودها غير معدومة وأساسها q موجب، فيها ${u(p)} = ${num(A)} و ${u(p + k)} = ${num(B)}. ما قيمة q؟`,
        answer: num(q),
        distractors: [
          { option: frac(B - A, k), misconception: "confuse_r_q" },
          { option: num(q ** k), misconception: "geo_root_forgotten" },
          { option: frac(q ** k, k), misconception: "geo_root_as_division" },
        ],
        steps: [
          `${u(p + k)} = ${u(p)} × q${sup(k)} لأن بين الحدين ${k} خطوات`,
          `q${sup(k)} = ${num(B)}/${paren(num(A))} = ${num(q ** k)}`,
          `q > 0 و ${q}${sup(k)} = ${num(q ** k)}، إذن q = ${q}`,
        ],
      };
    },
  },
  {
    id: "explicit-from-two-terms",
    skill: "ratio_from_terms",
    difficulty: 3,
    generate: rng => {
      if (rng.chance(0.6)) {
        const p = rng.int(1, 5);
        const k = rng.int(2, 7);
        const r = rng.nonZero(-5, 5);
        const u0 = rng.int(-10, 10);
        const m = p + k;
        const A = u0 + p * r;
        const B = u0 + m * r;
        const answer = linear(r, u0, "n");
        return {
          type: "short",
          prompt: `(uₙ) متتالية حسابية فيها ${u(p)} = ${num(A)} و ${u(m)} = ${num(B)}. اكتب uₙ بدلالة n.`,
          answer,
          steps: [
            `${u(m)} − ${u(p)} = (${m} − ${p})·r أي ${k}r = ${A === 0 ? num(B) : `${num(B)} − ${paren(num(A))} = ${num(B - A)}`}`,
            `r = ${num(B - A)}/${k} = ${num(r)}`,
            `u₀ = ${u(p)} − ${mul(p, "r")} = ${num(A)} − ${p} × ${paren(num(r))} = ${num(u0)}`,
            `uₙ = u₀ + n·r = ${answer}`,
          ],
        };
      }
      const q = rng.pick([2, 3]);
      const p = rng.int(1, 3);
      const k = rng.int(1, 2);
      const u0 = rng.nonZero(-4, 4);
      const A = u0 * q ** p;
      const B = u0 * q ** (p + k);
      const answer = geoTerm(u0, [q, 1], "n");
      return {
        type: "short",
        prompt: `(uₙ) متتالية هندسية أساسها موجب، فيها ${u(p)} = ${num(A)} و ${u(p + k)} = ${num(B)}. اكتب uₙ بدلالة n.`,
        answer,
        steps: [
          k === 1
            ? `q = ${u(p + 1)}/${u(p)} = ${num(B)}/${paren(num(A))} = ${q}`
            : `q² = ${u(p + 2)}/${u(p)} = ${num(B)}/${paren(num(A))} = ${q * q} و q > 0 إذن q = ${q}`,
          `u₀ = ${u(p)}/q${p === 1 ? "" : sup(p)} = ${num(A)}/${q ** p} = ${num(u0)}`,
          `uₙ = u₀ × qⁿ = ${answer}`,
        ],
      };
    },
  },
  // -------------------------------------------- nature and monotonicity
  {
    id: "nature-recurrence",
    skill: "sequence_nature",
    difficulty: 1,
    generate: rng => {
      const kind = rng.pick(["arith", "geo", "neither"] as const);
      if (kind === "arith") {
        const [c, b] = draw(
          rng,
          g => [g.nonZero(-6, 9), g.nonZero(-9, 9)] as const,
          ([c, b]) => allDifferent(ARITH(num(b)), GEO(num(b)), ARITH(num(c)), NEITHER)
        );
        return {
          type: "mcq",
          prompt: `(uₙ) متتالية معرفة بـ u₀ = ${num(c)} ومن أجل كل n ∈ ℕ: uₙ₊₁ = uₙ ${signed(b)}. ما طبيعتها؟`,
          answer: ARITH(num(b)),
          distractors: [
            { option: GEO(num(b)), misconception: "confuse_r_q" },
            { option: ARITH(num(c)), misconception: "ratio_misread" },
            { option: NEITHER, misconception: "nature_unrecognized" },
          ],
          steps: [
            `uₙ₊₁ − uₙ = ${num(b)}`,
            "الفرق بين حدين متتاليين ثابت لا يتعلق بـ n",
            `إذن (uₙ) حسابية أساسها r = ${num(b)} وحدها الأول u₀ = ${num(c)}`,
          ],
        };
      }
      if (kind === "geo") {
        const ratios: Q[] = [[-3, 1], [-2, 1], [2, 1], [3, 1], [4, 1], [5, 1], [1, 2], [1, 3], [-1, 2], [2, 3]];
        const [c, q] = draw(
          rng,
          g => [g.nonZero(-6, 9), g.pick(ratios)] as const,
          ([c, q]) => allDifferent(GEO(qStr(q)), ARITH(qStr(q)), GEO(num(c)), NEITHER)
        );
        const [p, d] = q;
        const rule = d === 1 ? mul(p, "uₙ") : p === 1 ? `uₙ/${d}` : p === -1 ? `−uₙ/${d}` : `(${qStr(q)})uₙ`;
        return {
          type: "mcq",
          prompt: `(uₙ) متتالية معرفة بـ u₀ = ${num(c)} ومن أجل كل n ∈ ℕ: uₙ₊₁ = ${rule}. ما طبيعتها؟`,
          answer: GEO(qStr(q)),
          distractors: [
            { option: ARITH(qStr(q)), misconception: "confuse_r_q" },
            { option: GEO(num(c)), misconception: "ratio_misread" },
            { option: NEITHER, misconception: "nature_unrecognized" },
          ],
          steps: [
            `u₀ = ${num(c)} ≠ 0 فكل الحدود غير معدومة`,
            `uₙ₊₁/uₙ = ${qStr(q)}: النسبة ثابتة لا تتعلق بـ n`,
            `إذن (uₙ) هندسية أساسها q = ${qStr(q)} وحدها الأول u₀ = ${num(c)}`,
          ],
        };
      }
      const [c, k, b] = draw(
        rng,
        g => [g.nonZero(-5, 6), g.pick([-2, 2, 3, 4]), g.nonZero(-7, 7)] as const,
        ([c, k, b]) => {
          const u1 = k * c + b;
          const u2 = k * u1 + b;
          return (
            u1 !== c &&
            u1 !== 0 &&
            u1 * u1 !== c * u2 &&
            allDifferent(NEITHER, ARITH(num(b)), GEO(num(k)), ARITH(num(k)))
          );
        }
      );
      const u1 = k * c + b;
      const u2 = k * u1 + b;
      return {
        type: "mcq",
        prompt: `(uₙ) متتالية معرفة بـ u₀ = ${num(c)} ومن أجل كل n ∈ ℕ: uₙ₊₁ = ${mul(k, "uₙ")} ${signed(b)}. ما طبيعتها؟`,
        answer: NEITHER,
        distractors: [
          { option: ARITH(num(b)), misconception: "nature_partial" },
          { option: GEO(num(k)), misconception: "nature_partial" },
          { option: ARITH(num(k)), misconception: "confuse_r_q" },
        ],
        steps: [
          `u₁ = ${num(k)} × ${paren(num(c))} ${signed(b)} = ${num(u1)} و u₂ = ${num(k)} × ${paren(num(u1))} ${signed(b)} = ${num(u2)}`,
          `u₁ − u₀ = ${num(u1 - c)} و u₂ − u₁ = ${num(u2 - u1)}: الفرق غير ثابت فليست حسابية`,
          `u₁/u₀ = ${frac(u1, c)} و u₂/u₁ = ${frac(u2, u1)}: النسبة غير ثابتة فليست هندسية`,
        ],
      };
    },
  },
  {
    id: "nature-explicit",
    skill: "sequence_nature",
    difficulty: 2,
    generate: rng => {
      const kind = rng.pick(["arith", "geo", "neither"] as const);
      if (kind === "arith") {
        const [a, b] = draw(
          rng,
          g => [g.nonZero(-7, 7), g.nonZero(-9, 9)] as const,
          ([a, b]) => allDifferent(ARITH(num(a)), ARITH(num(b)), GEO(num(a)), NEITHER)
        );
        const f = linear(a, b, "n");
        return {
          type: "mcq",
          prompt: `(uₙ) المتتالية المعرفة على ℕ بـ uₙ = ${f}. ما طبيعتها؟`,
          answer: ARITH(num(a)),
          distractors: [
            { option: ARITH(num(b)), misconception: "ratio_misread" },
            { option: GEO(num(a)), misconception: "confuse_r_q" },
            { option: NEITHER, misconception: "nature_unrecognized" },
          ],
          steps: [
            `uₙ₊₁ = ${join(mul(a, "(n + 1)"), num(b))}`,
            `uₙ₊₁ − uₙ = ${join(mul(a, "(n + 1)"), num(b))} − ${paren(f)} = ${num(a)}`,
            `الفرق ثابت، إذن (uₙ) حسابية أساسها r = ${num(a)} وحدها الأول u₀ = ${num(b)}`,
          ],
        };
      }
      if (kind === "geo") {
        const [c, k] = draw(
          rng,
          g => [g.nonZero(-5, 6), g.pick([2, 3, 4, 5])] as const,
          ([c, k]) => allDifferent(GEO(num(k)), GEO(num(c)), ARITH(num(k)), NEITHER)
        );
        const f = geoTerm(c, [k, 1], "n");
        return {
          type: "mcq",
          prompt: `(uₙ) المتتالية المعرفة على ℕ بـ uₙ = ${f}. ما طبيعتها؟`,
          answer: GEO(num(k)),
          distractors: [
            { option: GEO(num(c)), misconception: "ratio_misread" },
            { option: ARITH(num(k)), misconception: "confuse_r_q" },
            { option: NEITHER, misconception: "nature_unrecognized" },
          ],
          steps: [
            `uₙ₊₁ = ${geoTerm(c, [k, 1], "n+1")} = ${k} × ${paren(f)}`,
            `أي uₙ₊₁ = ${k}uₙ من أجل كل n`,
            `إذن (uₙ) هندسية أساسها q = ${k} وحدها الأول u₀ = ${num(c)}`,
          ],
        };
      }
      const [k, b] = draw(
        rng,
        g => [g.pick([2, 3, 4, 5]), g.nonZero(-6, 6)] as const,
        ([k, b]) => b !== -1 && b !== -k && allDifferent(NEITHER, GEO(num(k)), ARITH(num(b)), ARITH(num(k)))
      );
      const u0 = 1 + b;
      const u1 = k + b;
      const u2 = k * k + b;
      return {
        type: "mcq",
        prompt: `(uₙ) المتتالية المعرفة على ℕ بـ uₙ = ${k}ⁿ ${signed(b)}. ما طبيعتها؟`,
        answer: NEITHER,
        distractors: [
          { option: GEO(num(k)), misconception: "nature_partial" },
          { option: ARITH(num(b)), misconception: "ratio_misread" },
          { option: ARITH(num(k)), misconception: "confuse_r_q" },
        ],
        steps: [
          `u₀ = ${num(u0)} و u₁ = ${num(u1)} و u₂ = ${num(u2)}`,
          `u₁ − u₀ = ${num(u1 - u0)} و u₂ − u₁ = ${num(u2 - u1)}: الفرق غير ثابت فليست حسابية`,
          `u₁/u₀ = ${frac(u1, u0)} و u₂/u₁ = ${frac(u2, u1)}: النسبة غير ثابتة فليست هندسية`,
        ],
      };
    },
  },
  {
    id: "monotonic-arith-geo",
    skill: "sequence_nature",
    difficulty: 2,
    generate: rng => {
      if (rng.chance(0.45)) {
        const a = rng.nonZero(-6, 6);
        const b = rng.int(-9, 9);
        const f = linear(a, b, "n");
        return {
          type: "mcq",
          prompt: `ما اتجاه تغير المتتالية (uₙ) المعرفة على ℕ بـ uₙ = ${f}؟`,
          answer: a > 0 ? INC : DEC,
          distractors: [
            { option: a > 0 ? DEC : INC, misconception: "monotonic_sign" },
            { option: CONST, misconception: "monotonic_constant_difference" },
            { option: NOT_MONO, misconception: "monotonic_no_study" },
          ],
          steps: [
            `uₙ₊₁ − uₙ = ${join(mul(a, "(n + 1)"), num(b))} − ${paren(f)} = ${num(a)}`,
            `uₙ₊₁ − uₙ = ${num(a)} ${sign(a)} 0 من أجل كل n`,
            `إذن (uₙ) ${a > 0 ? INC : DEC}`,
          ],
        };
      }
      const c = rng.nonZero(-5, 5);
      const q = rng.pick<Q>([[2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [3, 2], [2, 3], [1, 4]]);
      const qMinusOne = frac(q[0] - q[1], q[1]);
      const s = Math.sign(c) * Math.sign(qValue(q) - 1);
      const f = geoTerm(c, q, "n");
      return {
        type: "mcq",
        prompt: `ما اتجاه تغير المتتالية (uₙ) المعرفة على ℕ بـ uₙ = ${f}؟`,
        answer: s > 0 ? INC : DEC,
        distractors: [
          { option: s > 0 ? DEC : INC, misconception: c < 0 ? "monotonic_q_only" : "monotonic_sign" },
          { option: CONST, misconception: "monotonic_difference_error" },
          { option: NOT_MONO, misconception: "monotonic_no_study" },
        ],
        steps: [
          `uₙ₊₁ − uₙ = ${geoTerm(c, q, "n+1")} − ${paren(f)} = ${f} × (${qStr(q)} − 1)`,
          `uₙ₊₁ − uₙ = ${f} × ${paren(qMinusOne)}`,
          `${qPow(q, "n")} > 0${c === 1 ? "" : ` و ${num(c)} ${sign(c)} 0`} و ${qMinusOne} ${sign(qValue(q) - 1)} 0، إذن uₙ₊₁ − uₙ ${sign(s)} 0`,
          `إذن (uₙ) ${s > 0 ? INC : DEC}`,
        ],
      };
    },
  },
  {
    id: "monotonic-difference",
    skill: "sequence_nature",
    difficulty: 3,
    generate: rng => {
      const kind = rng.pick(["rational", "quadratic", "alternating"] as const);
      if (kind === "rational") {
        const [a, b] = draw(
          rng,
          g => [g.nonZero(-5, 5), g.int(-5, 5)] as const,
          ([a, b]) => a !== b
        );
        const top = linear(a, b, "n");
        const top1 = linear(a, a + b, "n");
        const wrap = (text: string) => (/\s/.test(text) ? `(${text})` : text);
        const s = Math.sign(a - b);
        return {
          type: "mcq",
          prompt: `ما اتجاه تغير المتتالية (uₙ) المعرفة على ℕ بـ uₙ = ${wrap(top)}/(n + 1)؟`,
          answer: s > 0 ? INC : DEC,
          distractors: [
            { option: s > 0 ? DEC : INC, misconception: "monotonic_sign" },
            { option: CONST, misconception: "monotonic_difference_error" },
            { option: NOT_MONO, misconception: "monotonic_no_study" },
          ],
          steps: [
            `uₙ₊₁ = ${wrap(top1)}/(n + 2)`,
            `uₙ₊₁ − uₙ = [(${top1})(n + 1) − (${top})(n + 2)]/((n + 1)(n + 2))`,
            `بعد النشر والتبسيط: uₙ₊₁ − uₙ = ${num(a - b)}/((n + 1)(n + 2))`,
            `المقام موجب و ${num(a - b)} ${sign(s)} 0، إذن uₙ₊₁ − uₙ ${sign(s)} 0 و (uₙ) ${s > 0 ? INC : DEC}`,
          ],
        };
      }
      if (kind === "quadratic") {
        const inc = rng.chance(0.5);
        const b = inc ? rng.int(0, 6) : rng.int(-6, 0);
        const c = rng.int(-9, 9);
        const lead = inc ? 1 : -1;
        const f = poly([[2, lead], [1, b], [0, c]], "n");
        const shifted = join(inc ? "(n + 1)²" : "−(n + 1)²", b === 0 ? "" : mul(b, "(n + 1)"), num(c));
        const diff = inc ? linear(2, 1 + b, "n") : linear(-2, b - 1, "n");
        return {
          type: "mcq",
          prompt: `ما اتجاه تغير المتتالية (uₙ) المعرفة على ℕ بـ uₙ = ${f}؟`,
          answer: inc ? INC : DEC,
          distractors: [
            { option: inc ? DEC : INC, misconception: "monotonic_sign" },
            { option: CONST, misconception: "monotonic_difference_error" },
            { option: NOT_MONO, misconception: "monotonic_no_study" },
          ],
          steps: [
            `uₙ₊₁ − uₙ = ${shifted} − ${paren(f)}`,
            `uₙ₊₁ − uₙ = ${diff}`,
            `من أجل كل n ∈ ℕ (n ≥ 0): ${diff} ${inc ? ">" : "<"} 0`,
            `إذن (uₙ) ${inc ? INC : DEC}`,
          ],
        };
      }
      const c = rng.nonZero(-5, 5);
      const q = rng.pick<Q>([[-2, 1], [-3, 1], [-1, 2], [-1, 3], [-2, 3], [-3, 2]]);
      const f = geoTerm(c, q, "n");
      return {
        type: "mcq",
        prompt: `ما اتجاه تغير المتتالية (uₙ) المعرفة على ℕ بـ uₙ = ${f}؟`,
        answer: NOT_MONO,
        distractors: [
          { option: INC, misconception: "monotonic_negative_q" },
          { option: DEC, misconception: "monotonic_negative_q" },
          { option: CONST, misconception: "monotonic_difference_error" },
        ],
        steps: [
          `uₙ₊₁ − uₙ = ${f} × (${qStr(q)} − 1) = ${f} × ${paren(frac(q[0] - q[1], q[1]))}`,
          `الأساس q = ${qStr(q)} سالب، فإشارة ${qPow(q, "n")} تتغير حسب زوجية n، وكذلك إشارة uₙ₊₁ − uₙ`,
          `مثلاً u₀ = ${num(c)} و u₁ = ${geoValue(c, q, 1)} و u₂ = ${geoValue(c, q, 2)}: الحدود تصعد وتنزل`,
          `إذن (uₙ) ${NOT_MONO}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------------- sums
  {
    id: "arith-sum",
    skill: "sequence_sums",
    difficulty: 2,
    generate: rng => {
      const s = rng.chance(0.5) ? 1 : 0;
      const a = rng.int(-10, 10);
      const r = rng.nonZero(-5, 5);
      const n = rng.int(8, 30);
      const count = n - s + 1;
      const last = a + (n - s) * r;
      const total = (count * (a + last)) / 2;
      return {
        type: "short",
        prompt: `(uₙ) متتالية حسابية حدها الأول ${u(s)} = ${num(a)} وأساسها r = ${num(r)}. احسب المجموع S = ${u(s)} + ${u(s + 1)} + … + ${u(n)}.`,
        answer: num(total),
        steps: [
          `الحد الأخير: ${u(n)} = ${num(a)} + ${n - s} × ${paren(num(r))} = ${num(last)}`,
          s === 0 ? `عدد الحدود من u₀ إلى ${u(n)}: ${n} + 1 = ${count}` : `عدد الحدود من u₁ إلى ${u(n)}: ${count}`,
          `S = عدد الحدود × (الحد الأول + الحد الأخير)/2 = ${count} × (${num(a)} + ${paren(num(last))})/2`,
          `S = ${count} × ${paren(num(a + last))}/2 = ${num(total)}`,
        ],
      };
    },
  },
  {
    id: "arith-sum-range",
    skill: "sequence_sums",
    difficulty: 3,
    generate: rng => {
      const [r, b, p, k] = draw(
        rng,
        g => [g.nonZero(-4, 4), g.int(-9, 9), g.int(2, 8), g.int(5, 20)] as const,
        ([r, b, p, k]) => {
          const m = p + k;
          const ends = r * p + b + r * m + b;
          return allDifferent(frac((k + 1) * ends, 2), frac(k * ends, 2), num((k + 1) * ends), frac(m * ends, 2));
        }
      );
      const m = p + k;
      const first = r * p + b;
      const last = r * m + b;
      const ends = first + last;
      const count = k + 1;
      return {
        type: "mcq",
        prompt: `(uₙ) المتتالية المعرفة على ℕ بـ uₙ = ${linear(r, b, "n")}. ما قيمة S = ${u(p)} + ${u(p + 1)} + … + ${u(m)}؟`,
        answer: frac(count * ends, 2),
        distractors: [
          { option: frac(k * ends, 2), misconception: "sum_term_count" },
          { option: num(count * ends), misconception: "sum_formula" },
          { option: frac(m * ends, 2), misconception: "sum_index_as_count" },
        ],
        steps: [
          `uₙ₊₁ − uₙ = ${num(r)} إذن (uₙ) حسابية أساسها ${num(r)}`,
          `${u(p)} = ${num(first)} و ${u(m)} = ${num(last)}`,
          `عدد الحدود: ${m} − ${p} + 1 = ${count}`,
          `S = ${count} × (${num(first)} + ${paren(num(last))})/2 = ${frac(count * ends, 2)}`,
        ],
      };
    },
  },
  {
    id: "geo-sum-value",
    skill: "sequence_sums",
    difficulty: 3,
    generate: rng => {
      const s = rng.chance(0.5) ? 1 : 0;
      const [a, q, n] = draw(
        rng,
        g => [g.nonZero(-4, 4), g.pick([-3, -2, 2, 3]), g.int(3 + s, 6 + s)] as const,
        ([a, q, n]) => {
          const c = n - s + 1;
          const total = (a * (1 - q ** c)) / (1 - q);
          return allDifferent(
            num(total),
            num((a * (1 - q ** (c - 1))) / (1 - q)),
            frac(c * (a + a * q ** (c - 1)), 2),
            num(-total)
          );
        }
      );
      const count = n - s + 1;
      const total = (a * (1 - q ** count)) / (1 - q);
      return {
        type: "mcq",
        prompt: `(uₙ) متتالية هندسية حدها الأول ${u(s)} = ${num(a)} وأساسها q = ${num(q)}. ما قيمة S = ${u(s)} + ${u(s + 1)} + … + ${u(n)}؟`,
        answer: num(total),
        distractors: [
          { option: num((a * (1 - q ** (count - 1))) / (1 - q)), misconception: "sum_term_count" },
          { option: frac(count * (a + a * q ** (count - 1)), 2), misconception: "geo_sum_as_arith" },
          { option: num(-total), misconception: "sum_formula" },
        ],
        steps: [
          s === 0 ? `عدد الحدود: ${n} + 1 = ${count}` : `عدد الحدود من u₁ إلى ${u(n)}: ${count}`,
          `S = الحد الأول × (1 − q^(عدد الحدود))/(1 − q) = ${num(a)} × (1 − ${paren(num(q))}${sup(count)})/(1 − ${paren(num(q))})`,
          `S = ${num(a)} × ${paren(num(1 - q ** count))}/${paren(num(1 - q))} = ${num(total)}`,
        ],
      };
    },
  },
  {
    id: "geo-sum-from-explicit",
    skill: "sequence_sums",
    difficulty: 2,
    generate: rng => {
      const a = rng.int(1, 6);
      const q = rng.pick([2, 3]);
      const n = rng.int(3, 7);
      const total = (a * (q ** (n + 1) - 1)) / (q - 1);
      const f = geoTerm(a, [q, 1], "n");
      return {
        type: "short",
        prompt: `(uₙ) المتتالية المعرفة على ℕ بـ uₙ = ${f}. احسب S = u₀ + u₁ + … + ${u(n)}.`,
        answer: num(total),
        steps: [
          `(uₙ) هندسية حدها الأول u₀ = ${a} وأساسها q = ${q}`,
          `عدد الحدود: ${n} + 1 = ${n + 1}`,
          `S = u₀ × (1 − q${sup(n + 1)})/(1 − q) = ${a} × (1 − ${q ** (n + 1)})/(1 − ${q})`,
          `S = ${a} × ${paren(num(1 - q ** (n + 1)))}/${paren(num(1 - q))} = ${num(total)}`,
        ],
      };
    },
  },
  {
    id: "geo-sum-expression",
    skill: "sequence_sums",
    difficulty: 3,
    generate: rng => {
      const a = rng.nonZero(-6, 6);
      const q = rng.pick([2, 3, 4, 5]);
      const power = `${q}ⁿ⁺¹`;
      const g = gcd(a, q - 1);
      const [k, den] = [a / g, (q - 1) / g];
      let answer: string;
      if (den === 1) {
        answer = k === 1 ? `${power} − 1` : k === -1 ? `1 − ${power}` : `${num(k)}(${power} − 1)`;
      } else {
        answer = `${k === 1 ? "" : k === -1 ? "−" : num(k)}(${power} − 1)/${den}`;
      }
      return {
        type: "short",
        prompt: `(uₙ) المتتالية المعرفة على ℕ بـ uₙ = ${geoTerm(a, [q, 1], "n")}. اكتب Sₙ = u₀ + u₁ + … + uₙ بدلالة n.`,
        answer,
        steps: [
          `(uₙ) هندسية حدها الأول u₀ = ${num(a)} وأساسها q = ${q}`,
          "عدد الحدود من u₀ إلى uₙ هو n + 1",
          `Sₙ = u₀ × (1 − qⁿ⁺¹)/(1 − q) = ${num(a)} × (1 − ${power})/(1 − ${q}) = ${num(a)} × (${power} − 1)${q === 2 ? "" : `/${q - 1}`}`,
          `Sₙ = ${answer}`,
        ],
      };
    },
  },
  // ----------------------------------------------------------------- limits
  {
    id: "limit-q-power",
    skill: "geometric_limits",
    difficulty: 1,
    generate: rng => {
      const pool: Q[] = [
        [2, 1], [3, 1], [5, 1], [3, 2], [5, 4], [4, 3], [1, 2], [1, 3], [2, 3],
        [3, 4], [-1, 2], [-1, 3], [-2, 3], [-2, 1], [-3, 1], [-3, 2], [1, 1], [-1, 1],
      ];
      const q = rng.pick(pool);
      const v = qValue(q);
      const qn = qPow(q, "n");
      const prompt = rng.chance(0.5)
        ? `ما نهاية ${qn} عندما يؤول n إلى +∞؟`
        : `(uₙ) المتتالية المعرفة على ℕ بـ uₙ = ${qn}. ما lim uₙ عندما n → +∞؟`;
      const Q_ = qStr(q);
      if (v > 1) {
        return {
          type: "mcq",
          prompt,
          answer: "+∞",
          distractors: [
            { option: "0", misconception: "limit_q_gt1_zero" },
            { option: "1", misconception: "limit_q_one" },
            { option: NO_LIMIT, misconception: "limit_cases_confusion" },
          ],
          steps: [`q = ${Q_} > 1`, "إذا كان q > 1 فإن qⁿ يؤول إلى +∞", `lim ${qn} = +∞`],
        };
      }
      if (v === 1) {
        return {
          type: "mcq",
          prompt,
          answer: "1",
          distractors: [
            { option: "+∞", misconception: "limit_power_grows" },
            { option: "0", misconception: "limit_cases_confusion" },
            { option: NO_LIMIT, misconception: "limit_cases_confusion" },
          ],
          steps: ["q = 1 إذن 1ⁿ = 1 من أجل كل n", "المتتالية ثابتة", "النهاية 1"],
        };
      }
      if (v > 0) {
        return {
          type: "mcq",
          prompt,
          answer: "0",
          distractors: [
            { option: "+∞", misconception: "limit_power_grows" },
            { option: "1", misconception: "limit_q_one" },
            { option: NO_LIMIT, misconception: "limit_cases_confusion" },
          ],
          steps: [`0 < ${Q_} < 1`, "إذا كان −1 < q < 1 فإن qⁿ يؤول إلى 0", `lim ${qn} = 0`],
        };
      }
      if (v > -1) {
        return {
          type: "mcq",
          prompt,
          answer: "0",
          distractors: [
            { option: "−∞", misconception: "limit_negative_q" },
            { option: "+∞", misconception: "limit_power_grows" },
            { option: NO_LIMIT, misconception: "limit_negative_q" },
          ],
          steps: [
            `−1 < ${Q_} < 0`,
            "الحدود تتناوب في الإشارة لكن |qⁿ| = |q|ⁿ يؤول إلى 0 لأن |q| < 1",
            `lim ${qn} = 0`,
          ],
        };
      }
      return {
        type: "mcq",
        prompt,
        answer: NO_LIMIT,
        distractors: [
          { option: "−∞", misconception: "limit_negative_q" },
          { option: v === -1 ? "1" : "+∞", misconception: "limit_abs_value" },
          { option: "0", misconception: "limit_cases_confusion" },
        ],
        steps:
          v === -1
            ? ["q = −1: الحدود تتناوب بين 1 و −1", "لا تقترب من عدد واحد", `${qn} ${NO_LIMIT}`]
            : [
                `q = ${Q_} ≤ −1`,
                "qⁿ يتناوب في الإشارة و |qⁿ| يؤول إلى +∞، فالحدود تقفز بين قيم موجبة كبيرة وسالبة كبيرة",
                `${qn} ${NO_LIMIT}`,
              ],
      };
    },
  },
  {
    id: "limit-geometric-sequence",
    skill: "geometric_limits",
    difficulty: 2,
    generate: rng => {
      const c = rng.nonZero(-6, 6);
      const q = rng.pick(SMALL_Q);
      const d = rng.int(-9, 9);
      const term = geoTerm(c, q, "n");
      return {
        type: "short",
        prompt: `(uₙ) المتتالية المعرفة على ℕ بـ uₙ = ${join(term, num(d))}. احسب lim uₙ عندما يؤول n إلى +∞.`,
        answer: num(d),
        steps: [
          `−1 < ${qStr(q)} < 1 إذن ${qPow(q, "n")} يؤول إلى 0`,
          Math.abs(c) === 1 ? `إذن ${term} يؤول إلى 0 أيضاً` : `إذن ${term} يؤول إلى ${num(c)} × 0 = 0`,
          d === 0 ? "lim uₙ = 0" : `lim uₙ = 0 ${signed(d)} = ${num(d)}`,
        ],
      };
    },
  },
  {
    id: "limit-geometric-sum",
    skill: "geometric_limits",
    difficulty: 3,
    generate: rng => {
      const a = rng.nonZero(-6, 6);
      const q = rng.pick(SMALL_Q);
      const [p, d] = q;
      const oneMinusQ = frac(d - p, d);
      const answer = frac(a * d, d - p);
      return {
        type: "short",
        prompt: `(uₙ) متتالية هندسية حدها الأول u₀ = ${num(a)} وأساسها q = ${qStr(q)}. نضع Sₙ = u₀ + u₁ + … + uₙ. احسب lim Sₙ عندما يؤول n إلى +∞.`,
        answer,
        steps: [
          `Sₙ = u₀ × (1 − qⁿ⁺¹)/(1 − q) = ${num(a)} × (1 − ${qPow(q, "n+1")})/(1 − ${paren(qStr(q))})`,
          `−1 < ${qStr(q)} < 1 إذن ${qPow(q, "n+1")} يؤول إلى 0`,
          `lim Sₙ = ${num(a)}/(1 − ${paren(qStr(q))}) = ${num(a)}/(${oneMinusQ}) = ${answer}`,
        ],
      };
    },
  },
];

export const sequencesLesson: Lesson = {
  key: "math-sequences",
  curriculum: "dz",
  subject: "math",
  title: "المتتاليات العددية",
  levels: ["bac"],
  skills: [
    {
      key: "arith_term",
      name: "الحد العام لمتتالية حسابية",
      prerequisites: [],
      explanation:
        "تكون (uₙ) حسابية إذا وُجد عدد ثابت r (الأساس) بحيث uₙ₊₁ = uₙ + r من أجل كل n. حدها العام uₙ = u₀ + n·r، وإذا كان الحد الأول u₁ فإن uₙ = u₁ + (n − 1)·r. وبصفة عامة من أجل كل n و p: uₙ = uₚ + (n − p)·r.",
      example: {
        problem: "(uₙ) حسابية أساسها r = 4 و u₃ = 7. احسب u₁₀.",
        steps: ["u₁₀ = u₃ + (10 − 3) × 4", "u₁₀ = 7 + 7 × 4", "u₁₀ = 35"],
        answer: "u₁₀ = 35",
      },
      dialogue: {
        opening: "عندك في الحصّالة 10 دنانير، وكل يوم تضيف إليها 3 دنانير. نسمي u₀ = 10 ما عندك في اليوم الأول، و uₙ ما عندك بعد n يوماً.",
        steps: [
          {
            ask: "كم يصبح عندك بعد يوم واحد، أي u₁؟",
            answer: "13",
            hint: "أضف ما تضعه كل يوم إلى ما كان في الحصّالة.",
          },
          {
            ask: "واصل: احسب u₂ ثم u₃. كم يساوي u₃؟",
            answer: "19",
            hint: "انطلق مما وجدته وأضف الدنانير اليومية مرة، ثم مرة أخرى.",
            then: "لاحظ: u₃ هو العدد الأول مضافاً إليه الأساس ثلاث مرات.",
          },
          {
            ask: "لن نحسب الحدود واحداً واحداً: بعد مئة يوم أضفنا 3 دنانير كم مرة؟ إذن كم يساوي u₁₀₀؟",
            answer: "310",
            hint: "في u₃ أضفنا الأساس ثلاث مرات؛ في u₁₀₀ نضيفه بعدد الأيام، ثم نضيف ما كان في البداية.",
          },
          {
            ask: "عوّض الآن عدد الأيام بالحرف n: اكتب uₙ بدلالة n.",
            answer: "3n + 10",
            accept: ["10 + 3n"],
            hint: "افعل بالضبط ما فعلته في السؤال السابق، لكن بالحرف بدل العدد.",
          },
          {
            ask: "وإذا بدأنا العد من u₁ بدل u₀: كم مرة نضيف الأساس للانتقال من u₁ إلى u₈؟",
            answer: "7",
            hint: "من u₁ إلى u₂ خطوة واحدة، ومن u₁ إلى u₃ خطوتان… عدّ الخطوات لا الحدود.",
            then: "عدد الخطوات هو الفرق بين الدليلين.",
          },
        ],
        rule: "في متتالية حسابية أساسها r: uₙ = u₀ + n·r، وإذا كان الحد الأول u₁ فإن uₙ = u₁ + (n − 1)·r. وعموماً uₙ = uₚ + (n − p)·r: الأساس يُضاف بعدد الخطوات بين الدليلين.",
      },
    },
    {
      key: "geo_term",
      name: "الحد العام لمتتالية هندسية",
      prerequisites: [],
      explanation:
        "تكون (uₙ) هندسية إذا وُجد عدد ثابت q (الأساس) بحيث uₙ₊₁ = q·uₙ من أجل كل n: ننتقل من حد إلى الذي يليه بالضرب لا بالجمع. حدها العام uₙ = u₀ × qⁿ، وإذا كان الحد الأول u₁ فإن uₙ = u₁ × qⁿ⁻¹، وعموماً uₙ = uₚ × qⁿ⁻ᵖ.",
      example: {
        problem: "(uₙ) هندسية حدها الأول u₀ = 3 وأساسها q = 2. احسب u₄ ثم اكتب uₙ بدلالة n.",
        steps: ["uₙ = u₀ × qⁿ = 3 × 2ⁿ", "u₄ = 3 × 2⁴ = 3 × 16", "u₄ = 48"],
        answer: "uₙ = 3 × 2ⁿ و u₄ = 48",
      },
      dialogue: {
        opening: "في المخبر نضع 3 بكتيريات، وعددها يتضاعف كل ساعة. نسمي u₀ = 3 العدد في البداية، و uₙ العدد بعد n ساعة.",
        steps: [
          {
            ask: "كم بكتيريا بعد ساعة واحدة، أي u₁؟",
            answer: "6",
            hint: "يتضاعف يعني أننا نضرب، لا نجمع.",
          },
          {
            ask: "واصل بنفس الطريقة: كم يساوي u₃؟",
            answer: "24",
            hint: "انطلق مما وجدته واضربه في نفس العدد مرة، ثم مرة أخرى.",
            then: "في u₃ ضربنا العدد الأول في الأساس ثلاث مرات.",
          },
          {
            ask: "بعد عشر ساعات ضربنا في 2 كم مرة؟ إذن احسب u₁₀.",
            answer: "3072",
            accept: ["3 × 2¹⁰"],
            hint: "الضرب المتكرر في نفس العدد يُكتب على شكل قوة: الأس هو عدد الساعات.",
          },
          {
            ask: "عوّض عدد الساعات بالحرف n: اكتب uₙ بدلالة n.",
            answer: "3 × 2ⁿ",
            accept: ["3·2ⁿ"],
            hint: "افعل ما فعلته في السؤال السابق، لكن الأس هذه المرة هو الحرف.",
            then: "في الحسابية نضيف n مرة، وفي الهندسية نضرب n مرة: الأساس يصبح أُسّاً.",
          },
        ],
        rule: "في متتالية هندسية أساسها q: uₙ = u₀ × qⁿ، وإذا كان الحد الأول u₁ فإن uₙ = u₁ × qⁿ⁻¹. وعموماً uₙ = uₚ × qⁿ⁻ᵖ.",
      },
    },
    {
      key: "ratio_from_terms",
      name: "تعيين الأساس من حدين",
      prerequisites: ["arith_term", "geo_term"],
      explanation:
        "إذا عُلم حدان uₚ و uₘ لمتتالية حسابية فإن uₘ − uₚ = (m − p)·r ومنه r = (uₘ − uₚ)/(m − p). ولمتتالية هندسية uₘ = uₚ × qᵐ⁻ᵖ، فنحسب النسبة uₘ/uₚ ثم نستخرج q منها (جذر وليس قسمة). بعد معرفة الأساس نستنتج u₀ ثم الحد العام.",
      example: {
        problem: "(uₙ) حسابية فيها u₂ = 5 و u₇ = 20. احسب r ثم اكتب uₙ بدلالة n.",
        steps: ["u₇ − u₂ = 5r أي 5r = 15", "r = 3", "u₀ = u₂ − 2r = 5 − 6 = −1", "uₙ = 3n − 1"],
        answer: "r = 3 و uₙ = 3n − 1",
      },
      dialogue: {
        opening: "(uₙ) متتالية حسابية لا نعرف أساسها r، لكننا نعرف حدّين: u₂ = 5 و u₇ = 20. سنجد الأساس دون أي دستور جديد.",
        steps: [
          {
            ask: "كم مرة نضيف r للانتقال من u₂ إلى u₇؟",
            answer: "5",
            hint: "عدّ الخطوات: من u₂ إلى u₃ خطوة، ثم إلى u₄ خطوة ثانية، وهكذا.",
          },
          {
            ask: "خلال هذه الخطوات انتقلت المتتالية من 5 إلى 20. بكم زادت في المجموع؟",
            answer: "15",
            hint: "اطرح القيمة الأولى من القيمة الأخيرة.",
          },
          {
            ask: "إذن كم يساوي الأساس r؟",
            answer: "3",
            hint: "الزيادة الكلية موزعة بالتساوي على الخطوات.",
            then: "r = (u₇ − u₂)/(7 − 2).",
          },
          {
            ask: "الآن (vₙ) هندسية أساسها موجب، و v₁ = 2 و v₃ = 18. بين v₁ و v₃ نضرب في q مرتين، أي v₃ = v₁ × q². كم يساوي q²؟",
            answer: "9",
            hint: "في الهندسية نقسم الحد الأخير على الحد الأول بدل الطرح.",
          },
          {
            ask: "إذن كم يساوي q؟",
            answer: "3",
            hint: "ابحث عن العدد الموجب الذي مربعه هو ما وجدته، ولا تقسم على عدد الخطوات.",
            then: "في الهندسية نستخرج الجذر لا نقسم.",
          },
        ],
        rule: "حسابية: uₘ − uₚ = (m − p)·r ومنه r = (uₘ − uₚ)/(m − p). هندسية: uₘ/uₚ = qᵐ⁻ᵖ، فنحسب النسبة ثم نستخرج q منها بالجذر.",
      },
    },
    {
      key: "sequence_nature",
      name: "طبيعة متتالية واتجاه تغيرها",
      prerequisites: ["arith_term", "geo_term"],
      explanation:
        "لإثبات أن (uₙ) حسابية نبيّن أن uₙ₊₁ − uₙ ثابت (هو r)، ولإثبات أنها هندسية نبيّن أن uₙ₊₁ = q·uₙ مع q ثابت. لدراسة اتجاه التغير ندرس إشارة uₙ₊₁ − uₙ: إذا كانت موجبة تماماً فالمتتالية متزايدة تماماً، وإذا كانت سالبة تماماً فهي متناقصة تماماً. متتالية هندسية أساسها سالب ليست رتيبة لأن حدودها تتناوب في الإشارة.",
      example: {
        problem: "ادرس اتجاه تغير المتتالية uₙ = −3n + 5.",
        steps: ["uₙ₊₁ − uₙ = −3(n + 1) + 5 − (−3n + 5)", "uₙ₊₁ − uₙ = −3 < 0", "إذن (uₙ) متناقصة تماماً"],
        answer: "(uₙ) متناقصة تماماً",
      },
      dialogue: {
        opening: "خذ المتتالية uₙ = 2n + 1. نريد أن نعرف كيف ننتقل من حد إلى الذي يليه، دون أن نخمّن.",
        steps: [
          {
            ask: "احسب u₀ و u₁. كم يساوي الفرق u₁ − u₀؟",
            answer: "2",
            hint: "عوّض n بالعدد صفر ثم بالواحد في العبارة، ثم اطرح.",
          },
          {
            ask: "تحقق أن ذلك صحيح دائماً: uₙ₊₁ = 2(n + 1) + 1. احسب uₙ₊₁ − uₙ بدلالة n، ماذا تجد؟",
            answer: "2",
            hint: "انشر العبارة ثم اطرح منها uₙ: الحدود التي فيها n تختفي.",
            then: "الفرق ثابت لا يتعلق بـ n: المتتالية حسابية، وبما أن الفرق موجب فكل حد أكبر من الذي قبله، أي هي متزايدة تماماً.",
          },
          {
            ask: "خذ الآن wₙ = −3n + 7. احسب wₙ₊₁ − wₙ.",
            answer: "−3",
            hint: "نفس العمل: انشر ثم اطرح، وانتبه للإشارة أمام n.",
            then: "الفرق سالب: كل حد أصغر من الذي قبله، فالمتتالية متناقصة تماماً.",
          },
          {
            ask: "والآن vₙ = 5 × 3ⁿ. الفرق هنا ليس ثابتاً، فاحسب النسبة vₙ₊₁ / vₙ.",
            answer: "3",
            hint: "اكتب القوة ذات الأس n + 1 على شكل جداء ثم اختزل.",
            then: "النسبة ثابتة: المتتالية هندسية.",
          },
        ],
        rule: "إذا كان uₙ₊₁ − uₙ ثابتاً (= r) فالمتتالية حسابية، وإذا كان uₙ₊₁ = q·uₙ مع q ثابت فهي هندسية. واتجاه التغير تحدده إشارة uₙ₊₁ − uₙ: موجبة ⟹ متزايدة تماماً، سالبة ⟹ متناقصة تماماً.",
      },
    },
    {
      key: "sequence_sums",
      name: "مجموع حدود متتابعة",
      prerequisites: ["arith_term", "geo_term"],
      explanation:
        "مجموع حدود متتابعة من متتالية حسابية = عدد الحدود × (الحد الأول + الحد الأخير)/2. ومجموع حدود متتابعة من متتالية هندسية أساسها q ≠ 1 هو الحد الأول × (1 − q^(عدد الحدود))/(1 − q)، فمثلاً u₀ + u₁ + … + uₙ = u₀(1 − qⁿ⁺¹)/(1 − q). عدد الحدود من uₚ إلى uₘ هو m − p + 1، فمن u₀ إلى uₙ يوجد n + 1 حداً.",
      example: {
        problem: "(uₙ) حسابية u₀ = 2 و r = 3. احسب S = u₀ + u₁ + … + u₉.",
        steps: ["u₉ = 2 + 9 × 3 = 29", "عدد الحدود: 9 + 1 = 10", "S = 10 × (2 + 29)/2", "S = 155"],
        answer: "S = 155",
      },
      dialogue: {
        opening: "يُحكى أن معلماً طلب من تلاميذه جمع كل الأعداد من 1 إلى 100 ليشغلهم، فأجاب الصغير غاوس بعد دقيقة. لنكتشف حيلته.",
        steps: [
          {
            ask: "اجمع العدد الأول مع الأخير: 1 + 100 = ؟",
            answer: "101",
            hint: "مجرد جمع بسيط.",
          },
          {
            ask: "والثاني مع ما قبل الأخير: 2 + 99؟ ماذا تلاحظ؟",
            answer: "101",
            hint: "أحدهما زاد بواحد والآخر نقص بواحد.",
            then: "كل زوج (الأول من البداية مع الأول من النهاية) يعطي نفس المجموع.",
          },
          {
            ask: "كم زوجاً من هذا النوع نكوّن بالأعداد من 1 إلى 100؟",
            answer: "50",
            hint: "كل زوج يأخذ عددين من المئة.",
          },
          {
            ask: "إذن كم يساوي 1 + 2 + … + 100؟",
            answer: "5050",
            hint: "عدد الأزواج مضروب في مجموع كل زوج.",
          },
          {
            ask: "طبّق نفس الحيلة على المتتالية الحسابية 2 + 5 + 8 + … + 29 التي فيها 10 حدود.",
            answer: "155",
            hint: "اجمع الحد الأول مع الأخير، ثم اضرب في نصف عدد الحدود.",
          },
        ],
        rule: "مجموع حدود متتابعة من متتالية حسابية = عدد الحدود × (الحد الأول + الحد الأخير)/2. (ولمتتالية هندسية أساسها q ≠ 1: الحد الأول × (1 − q^(عدد الحدود))/(1 − q).)",
      },
    },
    {
      key: "geometric_limits",
      name: "نهاية متتالية هندسية",
      prerequisites: ["geo_term", "sequence_sums"],
      explanation:
        "نهاية qⁿ عندما n → +∞ تتعلق بقيمة q: إذا كان q > 1 فإن qⁿ → +∞، وإذا كان −1 < q < 1 فإن qⁿ → 0، وإذا كان q = 1 فإن qⁿ = 1، وإذا كان q ≤ −1 فليست لها نهاية. ومنه إذا كان −1 < q < 1 فإن u₀ + u₁ + … + uₙ يؤول إلى u₀/(1 − q).",
      example: {
        problem: "احسب نهاية uₙ = 4 × (1/2)ⁿ + 3 عندما n → +∞.",
        steps: ["−1 < 1/2 < 1 إذن (1/2)ⁿ → 0", "4 × (1/2)ⁿ → 0", "lim uₙ = 0 + 3 = 3"],
        answer: "lim uₙ = 3",
      },
      dialogue: {
        opening: "نعرف أن 2ⁿ يكبر بسرعة كبيرة. لكن ماذا يحدث لقوى عدد أصغر من 1، مثل (1/2)ⁿ؟",
        steps: [
          {
            ask: "احسب (1/2)³.",
            answer: "1/8",
            hint: "اضرب النصف في نفسه ثلاث مرات: البسط يبقى واحداً والمقام يتضاعف.",
          },
          {
            ask: "(1/2)¹⁰ = 1/1024، و (1/2)²⁰ أصغر من جزء من مليون. كلما كبر n، من أي عدد يقترب (1/2)ⁿ؟",
            answer: "0",
            hint: "البسط ثابت والمقام يكبر بلا حدود.",
          },
          {
            ask: "وماذا عن 2ⁿ: 2¹⁰ = 1024 و 2²⁰ أكثر من مليون. هل يقترب 2ⁿ من عدد معيّن، أم يذهب إلى …؟",
            answer: "ما لا نهاية",
            accept: ["مالانهاية", "لانهاية", "+inf"],
            hint: "هل يتوقف عن الكبر أم يتجاوز كل عدد تختاره؟",
          },
          {
            ask: "و q = −1/2: الحدود −1/2، 1/4، −1/8، 1/16… تتناوب في الإشارة. من أي عدد تقترب؟",
            answer: "0",
            hint: "انظر إلى بُعد كل حد عن الصفر، أي قيمته المطلقة.",
            then: "ما يهم هو أن |q| < 1.",
          },
          {
            ask: "استنتج: نهاية uₙ = 3 + 4 × (1/3)ⁿ عندما n → +∞.",
            answer: "3",
            hint: "ابدأ بما يحدث لـ (1/3)ⁿ، ثم لجداء صغير جداً في 4.",
          },
        ],
        rule: "lim qⁿ: إذا كان q > 1 فهي +∞، وإذا كان −1 < q < 1 فهي 0، وإذا كان q = 1 فهي 1، وإذا كان q ≤ −1 فليست لها نهاية.",
      },
    },
  ],
  misconceptions: {
    first_term_index: "استعمال uₙ = u₀ + n·r (أو u₀·qⁿ) بينما الحد المعطى ليس u₀، أو العكس",
    off_by_one: "خطأ بواحد في عدد الخطوات بين حدين (n − p + 1 بدل n − p)",
    arith_forgot_first_term: "نسيان إضافة الحد المعطى: uₘ = (m − p)·r",
    geo_added: "الجمع بدل الضرب في متتالية هندسية: uₙ = u₀ + n·q",
    geo_power_as_product: "حساب qⁿ على أنه n × q",
    confuse_r_q: "الخلط بين المتتالية الحسابية (أساس r يُجمع) والهندسية (أساس q يُضرب)",
    geo_root_forgotten: "أخذ النسبة uₘ/uₚ = qᵐ⁻ᵖ على أنها q مباشرة",
    geo_root_as_division: "قسمة النسبة uₘ/uₚ على m − p بدل استخراج الجذر",
    sum_term_count: "خطأ بواحد في عدد حدود المجموع (m − p بدل m − p + 1)",
    sum_index_as_count: "اعتبار دليل الحد الأخير هو عدد الحدود",
    sum_formula: "خطأ في دستور المجموع (نسيان القسمة على 2 أو قلب الإشارة)",
    geo_sum_as_arith: "تطبيق دستور مجموع المتتالية الحسابية على متتالية هندسية",
    ratio_misread: "قراءة الحد الأول أو الحد الثابت على أنه الأساس",
    nature_unrecognized: "عدم التعرف على الشكل الحسابي أو الهندسي",
    nature_partial: "الحكم على طبيعة المتتالية من جزء من العلاقة فقط",
    monotonic_sign: "قلب الاستنتاج: uₙ₊₁ − uₙ > 0 تعني متناقصة",
    monotonic_q_only: "الحكم على اتجاه تغير متتالية هندسية من q وحده دون إشارة الحد الأول",
    monotonic_constant_difference: "اعتبار المتتالية ثابتة لأن الفرق uₙ₊₁ − uₙ ثابت",
    monotonic_difference_error: "خطأ في حساب الفرق uₙ₊₁ − uₙ",
    monotonic_no_study: "الحكم بأن المتتالية ليست رتيبة دون دراسة إشارة uₙ₊₁ − uₙ",
    monotonic_negative_q: "اعتبار متتالية هندسية أساسها سالب رتيبة",
    limit_q_gt1_zero: "الاعتقاد أن qⁿ يؤول إلى 0 مع q > 1",
    limit_power_grows: "الاعتقاد أن qⁿ يؤول دائماً إلى +∞ (حتى لما |q| < 1 أو q = 1)",
    limit_negative_q: "خطأ في حالة q سالب: الظن أن qⁿ → −∞ أو أنه بلا نهاية رغم −1 < q < 0",
    limit_abs_value: "حساب نهاية |q|ⁿ بدل qⁿ لما q ≤ −1",
    limit_q_one: "الظن أن qⁿ يؤول إلى 1 (الخلط مع حالة q = 1)",
    limit_cases_confusion: "الخلط بين حالات نهاية qⁿ حسب قيمة q",
  },
  remedies: {
    first_term_index: "انظر إلى دليل الحد الأول: من u₀ نكتب u₀ + n·r، ومن u₁ نكتب u₁ + (n − 1)·r؛ عموماً uₙ = uₚ + (n − p)·r.",
    off_by_one: "من uₚ إلى uₙ نقوم بـ n − p خطوة: u₃ إلى u₁₀ سبع خطوات لا ثماني.",
    arith_forgot_first_term: "الأساس يعطي الزيادة فقط؛ أضفها إلى الحد المعلوم: uₘ = uₚ + (m − p)·r.",
    geo_added: "في الهندسية نضرب في q عند كل خطوة: uₙ = u₀ × qⁿ وليس u₀ + n·q.",
    geo_power_as_product: "qⁿ هو q مضروب في نفسه n مرة: 2⁴ = 16 وليس 4 × 2.",
    confuse_r_q: "حسابية: uₙ₊₁ − uₙ = r ثابت؛ هندسية: uₙ₊₁/uₙ = q ثابت. حدد العملية قبل الأساس.",
    geo_root_forgotten: "uₘ/uₚ = qᵐ⁻ᵖ، فنستخرج q من هذه القوة: q² = 9 مع q > 0 تعطي q = 3.",
    geo_root_as_division: "استخراج q من qᵏ يكون بالجذر لا بالقسمة على k: q³ = 8 تعطي q = 2 وليس 8/3.",
    sum_term_count: "عدد الحدود من uₚ إلى uₘ هو m − p + 1؛ مثلاً من u₀ إلى u₉ عشرة حدود.",
    sum_index_as_count: "دليل الحد الأخير ليس عدد الحدود إلا إذا بدأنا من u₁؛ احسب m − p + 1.",
    sum_formula: "مجموع الحسابية = عدد الحدود × (الأول + الأخير)/2، والهندسية = الأول × (1 − q^(عدد الحدود))/(1 − q).",
    geo_sum_as_arith: "دستور (الأول + الأخير)/2 خاص بالحسابية؛ للهندسية استعمل الأول × (1 − qᵏ)/(1 − q).",
    ratio_misread: "الأساس هو ما يُضاف (أو يُضرب) للانتقال من حد إلى التالي، وليس الحد الأول ولا الحد الثابت.",
    nature_unrecognized: "احسب uₙ₊₁ − uₙ: إن كان ثابتاً فهي حسابية؛ واحسب uₙ₊₁/uₙ: إن كان ثابتاً فهي هندسية.",
    nature_partial: "uₙ₊₁ = a·uₙ + b مع a ≠ 1 و b ≠ 0 ليست حسابية ولا هندسية؛ تحقق بحساب u₀ و u₁ و u₂.",
    monotonic_sign: "uₙ₊₁ − uₙ > 0 تعني أن كل حد أكبر من الذي قبله، أي المتتالية متزايدة.",
    monotonic_q_only: "uₙ₊₁ − uₙ = u₀qⁿ(q − 1): الإشارة تتعلق بإشارة u₀ وبإشارة q − 1 معاً.",
    monotonic_constant_difference: "الفرق الثابت r هو الزيادة في كل خطوة؛ المتتالية ثابتة فقط إذا كان r = 0.",
    monotonic_difference_error: "انشر uₙ₊₁ − uₙ بعناية ثم بسّط قبل دراسة الإشارة.",
    monotonic_no_study: "ادرس دائماً إشارة uₙ₊₁ − uₙ من أجل كل n قبل الحكم على اتجاه التغير.",
    monotonic_negative_q: "إذا كان q < 0 فالحدود تتناوب في الإشارة، فالمتتالية ليست رتيبة.",
    limit_q_gt1_zero: "إذا كان q > 1 فإن qⁿ يكبر بلا حدود: 2¹⁰ = 1024، فالنهاية +∞.",
    limit_power_grows: "إذا كان −1 < q < 1 فإن qⁿ يصغر نحو 0: (1/2)¹⁰ ≈ 0.001.",
    limit_negative_q: "إذا كان −1 < q < 0 فإن |qⁿ| → 0 فالنهاية 0؛ وإذا كان q ≤ −1 فليست لها نهاية.",
    limit_abs_value: "مع q ≤ −1 الحدود تتناوب في الإشارة، فلا تقترب من +∞ ولا من أي عدد: ليست لها نهاية.",
    limit_q_one: "qⁿ لا يقترب من 1 إلا إذا كان q = 1؛ إذا كان q > 1 فالنهاية +∞، وإذا كان |q| < 1 فالنهاية 0.",
    limit_cases_confusion: "احفظ الحالات: q > 1 ⟹ +∞، −1 < q < 1 ⟹ 0، q = 1 ⟹ 1، q ≤ −1 ⟹ ليست لها نهاية.",
  },
  bank: [],
  generators,
  problems: sequenceProblems,
};
