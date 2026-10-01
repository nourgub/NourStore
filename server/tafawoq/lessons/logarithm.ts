// BAC lesson "الدالة اللوغاريتمية النيبيرية" (Algerian curriculum): skill
// graph, misconceptions, remedies and parametric generators (see
// ./derivativesGenerators.ts for the pattern every generator follows).
import type { Lesson } from "../curriculum";
import { answersMatch } from "../grading";
import { expressionsEquivalent } from "../mathExpr";
import { frac, gcd, join, linear, mul, num, paren, poly, sup, type Generator, type Rng } from "../generators/core";

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

/** e^k for an integer k: "1", "e", "e²", "e⁻³". */
function eInt(k: number): string {
  if (k === 0) return "1";
  if (k === 1) return "e";
  return `e${sup(k)}`;
}

/** ln of an already formatted argument: "ln 8", "ln x", "ln(2x + 1)". */
function lnOf(argument: string): string {
  return /^(\d+|x)$/.test(argument) ? `ln ${argument}` : `ln(${argument})`;
}

/** q − x written the natural way: "3 − x", "−2 − x", "−x". */
function revLinear(q: number): string {
  return q === 0 ? "−x" : `${num(q)} − x`;
}

/**
 * (s·symbol + k)/a with the sign moved to the numerator:
 * over("e²", 1, −3, 2) → "(e² − 3)/2", over("e", 1, 4, −2) → "(−e − 4)/2".
 */
function over(symbol: string, s: 1 | -1, k: number, a: number): string {
  if (a < 0) {
    s = s === 1 ? -1 : 1;
    k = -k;
    a = -a;
  }
  const numerator = s === -1 && k > 0 ? `${num(k)} − ${symbol}` : join(s === 1 ? symbol : `−${symbol}`, num(k));
  if (a === 1) return numerator;
  return /\s/.test(numerator) ? `(${numerator})/${a}` : `${numerator}/${a}`;
}

/** base^exponent without a superscript ¹: "2³", "3". */
const pw = (base: number, exponent: number) => (exponent === 1 ? String(base) : `${base}${sup(exponent)}`);

/** Drops a step identical to the one before it (x = 3 ⟶ x = 3). */
function uniq(steps: string[]): string[] {
  return steps.filter((step, index) => step !== steps[index - 1]);
}

type Relation = ">" | "<" | "≥" | "≤";
const FLIP: Record<Relation, Relation> = { ">": "<", "<": ">", "≥": "≤", "≤": "≥" };
const isClosed = (relation: Relation) => relation === "≥" || relation === "≤";
const isGreater = (relation: Relation) => relation === ">" || relation === "≥";

/** Solution set of x ⋈ bound. */
function interval(relation: Relation, bound: string): string {
  switch (relation) {
    case ">":
      return `]${bound} ; +∞[`;
    case "≥":
      return `[${bound} ; +∞[`;
    case "<":
      return `]−∞ ; ${bound}[`;
    default:
      return `]−∞ ; ${bound}]`;
  }
}

/** Bounded interval with chosen brackets. */
function between(low: string, lowClosed: boolean, high: string, highClosed: boolean): string {
  return `${lowClosed ? "[" : "]"}${low} ; ${high}${highClosed ? "]" : "["}`;
}

/** ]−∞ ; p[ ∪ ]q ; +∞[ (closed at p and q when asked). */
function outside(p: string, q: string, closed = false): string {
  return closed ? `]−∞ ; ${p}] ∪ [${q} ; +∞[` : `]−∞ ; ${p}[ ∪ ]${q} ; +∞[`;
}

const INDETERMINATE = "حالة عدم تعيين (لا يمكن حساب النهاية)";
const set = (...values: string[]) => `S = {${values.join(" ; ")}}`;
const EMPTY = "S = ∅";

const generators: Generator[] = [
  // ------------------------------------------------------------- properties
  {
    id: "properties-sum-quotient",
    skill: "ln_properties",
    difficulty: 1,
    generate: rng => {
      const sum = rng.chance(0.5);
      const [a, b] = draw(
        rng,
        r => [r.int(2, 12), r.int(2, 9)] as const,
        ([a, b]) =>
          a !== b &&
          (sum ||
            (a > b &&
              allDifferent(lnOf(frac(a, b)), lnOf(num(a - b)), `ln ${a} / ln ${b}`, lnOf(num(a * b)))))
      );
      if (sum) {
        return {
          type: "mcq",
          prompt: `أي عبارة تساوي A = ln ${a} + ln ${b}؟`,
          answer: lnOf(num(a * b)),
          distractors: [
            { option: lnOf(num(a + b)), misconception: "ln_sum_split" },
            { option: `ln ${a} × ln ${b}`, misconception: "ln_product_multiply" },
            { option: lnOf(frac(a, b)), misconception: "ln_quotient_sign" },
          ],
          steps: [
            "من أجل a > 0 و b > 0: ln a + ln b = ln(a × b)",
            `A = ln(${a} × ${b})`,
            `A = ${lnOf(num(a * b))}`,
          ],
        };
      }
      return {
        type: "mcq",
        prompt: `أي عبارة تساوي A = ln ${a} − ln ${b}؟`,
        answer: lnOf(frac(a, b)),
        distractors: [
          { option: lnOf(num(a - b)), misconception: "ln_sum_split" },
          { option: `ln ${a} / ln ${b}`, misconception: "ln_product_multiply" },
          { option: lnOf(num(a * b)), misconception: "ln_quotient_sign" },
        ],
        steps: uniq([
          "من أجل a > 0 و b > 0: ln a − ln b = ln(a/b)",
          `A = ln(${a}/${b})`,
          `A = ${lnOf(frac(a, b))}`,
        ]),
      };
    },
  },
  {
    id: "properties-e-values",
    skill: "ln_properties",
    difficulty: 1,
    generate: rng => {
      const [n, m] = draw(
        rng,
        r => [r.int(2, 9), r.int(1, 9)] as const,
        ([n, m]) => allDifferent(num(n - m), num(n - m + 1), "0", num(n + m))
      );
      return {
        type: "mcq",
        prompt: `احسب A = ln(${eInt(n)}) + ln(1/${eInt(m)})`,
        answer: num(n - m),
        distractors: [
          { option: num(n - m + 1), misconception: "ln_one_e" },
          { option: "0", misconception: "ln_power_error" },
          { option: num(n + m), misconception: "ln_quotient_sign" },
        ],
        steps: [
          `ln(eⁿ) = n·ln e = n لأن ln e = 1، إذن ln(${eInt(n)}) = ${n}`,
          `ln(1/${eInt(m)}) = ln 1 − ln(${eInt(m)}) = 0 − ${m} = −${m}`,
          `A = ${n} − ${m} = ${num(n - m)}`,
        ],
      };
    },
  },
  {
    id: "properties-one-base-short",
    skill: "ln_properties",
    difficulty: 2,
    generate: rng => {
      const base = rng.pick([2, 3, 5]);
      const maxExponent = { 2: 7, 3: 5, 5: 3 }[base] ?? 3;
      const terms = draw(
        rng,
        r => {
          const count = r.int(2, 3);
          return Array.from({ length: count }, (_, index) => ({
            sign: index === 0 || r.chance(0.5) ? 1 : -1,
            exponent: r.int(1, maxExponent),
          }));
        },
        list => {
          const k = list.reduce((total, term) => total + term.sign * term.exponent, 0);
          return k !== 0 && list.some(term => term.exponent > 1);
        }
      );
      const k = terms.reduce((total, term) => total + term.sign * term.exponent, 0);
      const lnBase = `ln ${base}`;
      const prompt = join(...terms.map(term => (term.sign === 1 ? "" : "−") + `ln ${base ** term.exponent}`));
      const decompositions = terms
        .filter(term => term.exponent > 1)
        .map(term => `ln ${base ** term.exponent} = ln(${base}${sup(term.exponent)}) = ${mul(term.exponent, lnBase)}`);
      const expanded = join(...terms.map(term => mul(term.sign * term.exponent, lnBase)));
      const answer = mul(k, lnBase);
      return {
        type: "short",
        prompt: `اكتب A = ${prompt} على الشكل k·ln ${base} حيث k عدد صحيح.`,
        answer,
        steps: [
          `نكتب كل عدد على شكل قوة لـ ${base} ونستعمل ln(aⁿ) = n·ln a`,
          decompositions.join("، "),
          `A = ${expanded}`,
          `A = ${answer}`,
        ],
      };
    },
  },
  {
    id: "properties-two-primes-short",
    skill: "ln_properties",
    difficulty: 2,
    generate: rng => {
      const [p, q] = draw(
        rng,
        r => [r.int(1, 5), r.int(1, 3)] as const,
        ([p, q]) => 2 ** p * 3 ** q <= 500 && p + q >= 3
      );
      const two = 2 ** p;
      const three = 3 ** q;
      const variant = rng.int(0, 2);
      const tP = mul(p, "ln 2");
      const tQ = mul(q, "ln 3");
      const cases = [
        {
          shown: `ln ${two * three}`,
          factor: `${two * three} = ${pw(2, p)} × ${pw(3, q)}`,
          rule: "ln(ab) = ln a + ln b و ln(aⁿ) = n·ln a",
          answer: join(tP, tQ),
        },
        {
          shown: `ln(${two}/${three})`,
          factor: `${two} = ${pw(2, p)} و ${three} = ${pw(3, q)}`,
          rule: "ln(a/b) = ln a − ln b و ln(aⁿ) = n·ln a",
          answer: join(tP, `−${tQ}`),
        },
        {
          shown: `ln(${three}/${two})`,
          factor: `${three} = ${pw(3, q)} و ${two} = ${pw(2, p)}`,
          rule: "ln(a/b) = ln a − ln b و ln(aⁿ) = n·ln a",
          answer: join(tQ, `−${tP}`),
        },
      ][variant];
      return {
        type: "short",
        prompt: `اكتب A = ${cases.shown} بدلالة ln 2 و ln 3.`,
        answer: cases.answer,
        steps: [cases.factor, cases.rule, `A = ${cases.answer}`],
      };
    },
  },
  // ----------------------------------------------------------------- domain
  {
    id: "domain-linear",
    skill: "ln_domain",
    difficulty: 1,
    generate: rng => {
      const a = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
      const b = rng.nonZero(-7, 7);
      const relation: Relation = a > 0 ? ">" : "<";
      const bound = frac(-b, a);
      const answer = interval(relation, bound);
      return {
        type: "mcq",
        prompt: `ما مجموعة تعريف الدالة f(x) = ${lnOf(linear(a, b))}؟`,
        answer,
        distractors: [
          { option: interval(relation === ">" ? "≥" : "≤", bound), misconception: "ln_zero" },
          { option: interval(FLIP[relation], bound), misconception: "ln_inequality_direction" },
          { option: interval(relation, frac(b, a)), misconception: "ln_sign_error" },
        ],
        steps: [
          "ln u معرفة إذا وفقط إذا كان u > 0 (العدد 0 مستثنى لأن ln 0 غير معرف)",
          `${linear(a, b)} > 0 أي ${mul(a, "x")} > ${num(-b)}`,
          a === 1
            ? ""
            : a > 0
              ? `نقسم على ${num(a)} وهو موجب: x > ${bound}`
              : `نقسم على ${num(a)} وهو سالب فينعكس الاتجاه: x < ${bound}`,
          `D = ${answer}`,
        ].filter(Boolean),
      };
    },
  },
  {
    id: "domain-trinomial",
    skill: "ln_domain",
    difficulty: 2,
    generate: rng => {
      const [p, q] = draw(
        rng,
        r => [r.int(-6, 6), r.int(-6, 6)] as const,
        ([p, q]) => p < q
      );
      const a = rng.pick([1, -1]);
      const u = poly([[2, a], [1, -a * (p + q)], [0, a * p * q]]);
      const P = num(p);
      const Q = num(q);
      const factored = `${a === 1 ? "" : "−"}${paren(linear(1, -p))}${paren(linear(1, -q))}`;
      const answer = a === 1 ? outside(P, Q) : between(P, false, Q, false);
      return {
        type: "mcq",
        prompt: `ما مجموعة تعريف الدالة f(x) = ln(${u})؟`,
        answer,
        distractors:
          a === 1
            ? [
                { option: between(P, false, Q, false), misconception: "ln_sign_error" },
                { option: outside(P, Q, true), misconception: "ln_zero" },
                { option: `]${Q} ; +∞[`, misconception: "ln_domain_partial" },
              ]
            : [
                { option: outside(P, Q), misconception: "ln_sign_error" },
                { option: between(P, true, Q, true), misconception: "ln_zero" },
                { option: `]${P} ; +∞[`, misconception: "ln_domain_partial" },
              ],
        steps: [
          `f معرفة ⟺ ${u} > 0`,
          `${u} = ${factored}، جذراه ${P} و ${Q}`,
          a === 1
            ? "معامل x² موجب: ثلاثي الحدود موجب تماماً خارج الجذرين"
            : "معامل x² سالب: ثلاثي الحدود موجب تماماً بين الجذرين",
          `D = ${answer}`,
        ],
      };
    },
  },
  {
    id: "domain-sum-of-logs",
    skill: "ln_domain",
    difficulty: 3,
    generate: rng => {
      const both = rng.chance(0.5);
      const [p, q] = draw(
        rng,
        r => [r.int(-6, 6), r.int(-6, 6)] as const,
        ([p, q]) => (both ? p !== q : p < q)
      );
      if (both) {
        const lo = Math.min(p, q);
        const hi = Math.max(p, q);
        const answer = `]${num(hi)} ; +∞[`;
        return {
          type: "mcq",
          prompt: `ما مجموعة تعريف الدالة f(x) = ${lnOf(linear(1, -p))} + ${lnOf(linear(1, -q))}؟`,
          answer,
          distractors: [
            { option: `]${num(lo)} ; +∞[`, misconception: "ln_domain_partial" },
            { option: outside(num(lo), num(hi)), misconception: "ln_domain_product" },
            { option: `[${num(hi)} ; +∞[`, misconception: "ln_zero" },
          ],
          steps: [
            `يجب أن يكون معاً ${linear(1, -p)} > 0 و ${linear(1, -q)} > 0`,
            `أي x > ${num(p)} و x > ${num(q)}`,
            `تقاطع الشرطين: x > ${num(hi)}`,
            `D = ${answer}`,
          ],
        };
      }
      const answer = between(num(p), false, num(q), false);
      return {
        type: "mcq",
        prompt: `ما مجموعة تعريف الدالة f(x) = ${lnOf(linear(1, -p))} + ln(${revLinear(q)})؟`,
        answer,
        distractors: [
          { option: `]${num(p)} ; +∞[`, misconception: "ln_domain_partial" },
          { option: outside(num(p), num(q)), misconception: "ln_sign_error" },
          { option: between(num(p), true, num(q), true), misconception: "ln_zero" },
        ],
        steps: [
          `يجب أن يكون معاً ${linear(1, -p)} > 0 و ${revLinear(q)} > 0`,
          `أي x > ${num(p)} و x < ${num(q)}`,
          `D = ${answer}`,
        ],
      };
    },
  },
  // -------------------------------------------------------------- equations
  {
    id: "equation-equals-zero",
    skill: "ln_equations",
    difficulty: 1,
    generate: rng => {
      const [a, b] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.nonZero(-7, 7)] as const,
        ([a, b]) => allDifferent(frac(1 - b, a), frac(-b, a), over("e", 1, -b, a), frac(1 + b, a))
      );
      const answer = frac(1 - b, a);
      return {
        type: "mcq",
        prompt: `ما حل المعادلة ${lnOf(linear(a, b))} = 0 في ℝ؟`,
        answer,
        distractors: [
          { option: frac(-b, a), misconception: "ln_zero" },
          { option: over("e", 1, -b, a), misconception: "ln_one_e" },
          { option: frac(1 + b, a), misconception: "ln_sign_error" },
        ],
        steps: uniq([
          "ln 1 = 0، إذن ln u = 0 ⟺ u = 1 (وعندها u > 0 محقق)",
          `${linear(a, b)} = 1`,
          `${mul(a, "x")} = ${num(1 - b)}`,
          `x = ${answer}`,
        ]),
      };
    },
  },
  {
    id: "equation-linear-short",
    skill: "ln_equations",
    difficulty: 2,
    generate: rng => {
      const a = rng.pick([-3, -2, -1, 1, 2, 3, 4]);
      const b = rng.int(-5, 5);
      const c = rng.pick([-2, -1, 1, 2, 3]);
      const E = eInt(c);
      const answer = over(E, 1, -b, a);
      return {
        type: "short",
        prompt: `حل في ℝ المعادلة ${lnOf(linear(a, b))} = ${num(c)}.`,
        answer,
        steps: uniq([
          `ln u = k ⟺ u = eᵏ، والشرط u > 0 محقق تلقائياً لأن ${E} > 0`,
          `${linear(a, b)} = ${E}`,
          `${mul(a, "x")} = ${join(E, num(-b))}`,
          `x = ${answer}`,
        ]),
      };
    },
  },
  {
    id: "equation-ln-equals-ln",
    skill: "ln_equations",
    difficulty: 3,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.nonZero(-4, 4), r.nonZero(-6, 6), r.nonZero(-4, 4), r.int(-6, 6)] as const,
        ([a, b, c, d]) =>
          a !== c &&
          a + c !== 0 &&
          a * d - b * c !== 0 &&
          allDifferent(frac(d - b, a - c), frac(d + b, a - c), frac(d - b, a + c))
      );
      const x0 = frac(d - b, a - c);
      const value = frac(a * d - b * c, a - c);
      const valid = (a * d - b * c) / (a - c) > 0;
      const sign = set(frac(d + b, a - c));
      const solve = set(frac(d - b, a + c));
      return {
        type: "mcq",
        prompt: `ما مجموعة حلول المعادلة ${lnOf(linear(a, b))} = ${lnOf(linear(c, d))} في ℝ؟`,
        answer: valid ? set(x0) : EMPTY,
        distractors: valid
          ? [
              { option: EMPTY, misconception: "ln_domain_check" },
              { option: sign, misconception: "ln_sign_error" },
              { option: solve, misconception: "ln_solve_error" },
            ]
          : [
              { option: set(x0), misconception: "ln_domain_forgot" },
              { option: sign, misconception: "ln_sign_error" },
              { option: solve, misconception: "ln_solve_error" },
            ],
        steps: [
          `شرط الوجود: ${linear(a, b)} > 0 و ${linear(c, d)} > 0`,
          `ln u = ln v ⟺ u = v، إذن ${linear(a, b)} = ${linear(c, d)}${a - c === 1 ? "" : ` أي ${mul(a - c, "x")} = ${num(d - b)}`} ومنه x = ${x0}`,
          valid
            ? `من أجل x = ${x0}: ${linear(a, b)} = ${value} > 0، فالحل مقبول`
            : `من أجل x = ${x0}: ${linear(a, b)} = ${value} وهو ليس موجباً تماماً، فالحل مرفوض`,
          valid ? set(x0) : EMPTY,
        ],
      };
    },
  },
  {
    id: "equation-sum-of-logs",
    skill: "ln_equations",
    difficulty: 3,
    generate: rng => {
      const [k, r0] = draw(
        rng,
        r => [r.nonZero(-5, 6), r.int(1, 7)] as const,
        ([k, r0]) => {
          if (r0 <= -k) return false;
          const N = r0 * (r0 + k);
          return N <= 60 && allDifferent(num(r0), num(-r0 - k), frac(N - k, 2));
        }
      );
      const N = r0 * (r0 + k);
      const other = -r0 - k;
      const lowBound = Math.max(0, -k);
      return {
        type: "mcq",
        prompt: `ما مجموعة حلول المعادلة ln x + ln(${linear(1, k)}) = ln ${N} في ℝ؟`,
        answer: set(num(r0)),
        distractors: [
          { option: set(num(other), num(r0)), misconception: "ln_domain_forgot" },
          { option: set(num(other)), misconception: "ln_domain_check" },
          { option: set(frac(N - k, 2)), misconception: "ln_sum_split" },
        ],
        steps: [
          `شرط الوجود: x > 0 و ${linear(1, k)} > 0، أي x > ${num(lowBound)}`,
          `ln x + ln(${linear(1, k)}) = ln(x(${linear(1, k)}))، إذن x(${linear(1, k)}) = ${N}`,
          `${poly([[2, 1], [1, k], [0, -N]])} = 0 جذراها ${num(r0)} و ${num(other)}`,
          `${num(other)} لا يحقق شرط الوجود فهو مرفوض: ${set(num(r0))}`,
        ],
      };
    },
  },
  // ----------------------------------------------------------- inequalities
  {
    id: "inequality-ln-x",
    skill: "ln_inequalities",
    difficulty: 1,
    generate: rng => {
      const relation = rng.pick<Relation>([">", "<", "≥", "≤"]);
      const c = rng.pick([-3, -2, -1, 1, 2, 3]);
      const E = eInt(c);
      const opposite = eInt(-c);
      const closed = isClosed(relation);
      if (isGreater(relation)) {
        const answer = interval(relation, E);
        return {
          type: "mcq",
          prompt: `ما مجموعة حلول المتراجحة ln x ${relation} ${num(c)}؟`,
          answer,
          distractors: [
            { option: interval(relation, num(c)), misconception: "ln_exp_inverse" },
            { option: between("0", false, E, closed), misconception: "ln_inequality_direction" },
            { option: interval(relation, opposite), misconception: "ln_sign_error" },
          ],
          steps: [
            "شرط الوجود: x > 0",
            `${num(c)} = ln(${E}) والدالة ln متزايدة تماماً، إذن x ${relation} ${E}`,
            `S = ${answer}`,
          ],
        };
      }
      const answer = between("0", false, E, closed);
      return {
        type: "mcq",
        prompt: `ما مجموعة حلول المتراجحة ln x ${relation} ${num(c)}؟`,
        answer,
        distractors: [
          { option: interval(relation, E), misconception: "ln_domain_forgot" },
          { option: interval(FLIP[relation], E), misconception: "ln_inequality_direction" },
          { option: between("0", false, opposite, closed), misconception: "ln_sign_error" },
        ],
        steps: [
          "شرط الوجود: x > 0",
          `${num(c)} = ln(${E}) والدالة ln متزايدة تماماً، إذن x ${relation} ${E}`,
          `مع شرط الوجود: S = ${answer}`,
        ],
      };
    },
  },
  {
    id: "inequality-linear-zero",
    skill: "ln_inequalities",
    difficulty: 2,
    generate: rng => {
      const relation = rng.pick<Relation>([">", "<", "≥", "≤"]);
      const a = rng.pick([-3, -2, -1, 1, 2, 3]);
      const b = rng.nonZero(-5, 5);
      const L = frac(-b, a);
      const M = frac(1 - b, a);
      const wrongBound = frac(1 + b, a);
      const final = a < 0 ? FLIP[relation] : relation;
      const closed = isClosed(relation);
      const u = linear(a, b);
      const domainStep = `شرط الوجود: ${u} > 0 أي x ${a > 0 ? ">" : "<"} ${L}`;
      const solveStep = `ln u ${relation} 0 ⟺ ln u ${relation} ln 1 ⟺ u ${relation} 1 (ln متزايدة تماماً): ${u} ${relation} 1 أي ${mul(a, "x")} ${relation} ${num(1 - b)}`;
      const divideStep =
        a === 1
          ? `x ${final} ${M}`
          : a < 0
          ? `نقسم على ${num(a)} وهو سالب فينعكس الاتجاه: x ${final} ${M}`
          : `نقسم على ${num(a)} وهو موجب: x ${final} ${M}`;
      if (isGreater(relation)) {
        const answer = interval(final, M);
        return {
          type: "mcq",
          prompt: `ما مجموعة حلول المتراجحة ${lnOf(u)} ${relation} 0؟`,
          answer,
          distractors: [
            { option: interval(final, L), misconception: "ln_zero" },
            { option: interval(FLIP[final], M), misconception: "ln_inequality_direction" },
            { option: interval(final, wrongBound), misconception: "ln_sign_error" },
          ],
          steps: [domainStep, solveStep, ...(a === 1 ? [] : [divideStep]), `هذه القيم تحقق شرط الوجود: S = ${answer}`],
        };
      }
      const answer = a > 0 ? between(L, false, M, closed) : between(M, closed, L, false);
      return {
        type: "mcq",
        prompt: `ما مجموعة حلول المتراجحة ${lnOf(u)} ${relation} 0؟`,
        answer,
        distractors: [
          { option: interval(final, M), misconception: "ln_domain_forgot" },
          { option: interval(FLIP[final], M), misconception: "ln_inequality_direction" },
          { option: interval(final, L), misconception: "ln_zero" },
        ],
        steps: [domainStep, solveStep, ...(a === 1 ? [] : [divideStep]), `نأخذ التقاطع مع شرط الوجود: S = ${answer}`],
      };
    },
  },
  {
    id: "inequality-ln-ln",
    skill: "ln_inequalities",
    difficulty: 3,
    generate: rng => {
      const relation = rng.pick<Relation>([">", "<", "≥", "≤"]);
      const [p, q] = draw(
        rng,
        r => [r.int(-5, 5), r.int(-4, 6)] as const,
        ([p, q]) => q > -p
      );
      const lo = num(-p);
      const hi = num(q);
      const m = frac(q - p, 2);
      const closed = isClosed(relation);
      const upper = between(m, closed, hi, false);
      const lower = between(lo, false, m, closed);
      const greater = isGreater(relation);
      const answer = greater ? upper : lower;
      return {
        type: "mcq",
        prompt: `ما مجموعة حلول المتراجحة ${lnOf(linear(1, p))} ${relation} ln(${revLinear(q)})؟`,
        answer,
        distractors: [
          { option: interval(relation, m), misconception: "ln_domain_forgot" },
          { option: greater ? lower : upper, misconception: "ln_inequality_direction" },
          {
            option: greater ? between(m, closed, hi, true) : between(lo, true, m, closed),
            misconception: "ln_zero",
          },
        ],
        steps: [
          `شرط الوجود: ${linear(1, p)} > 0 و ${revLinear(q)} > 0، أي x ∈ ${between(lo, false, hi, false)}`,
          `ln متزايدة تماماً: ${linear(1, p)} ${relation} ${revLinear(q)}`,
          `2x ${relation} ${num(q - p)} أي x ${relation} ${m}`,
          `نأخذ التقاطع مع شرط الوجود: S = ${answer}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------- derivative
  {
    id: "derivative-ln-linear",
    skill: "ln_derivative",
    difficulty: 1,
    generate: rng => {
      const [a, b] = draw(
        rng,
        r => [r.pick([-5, -4, -3, -2, 2, 3, 4, 5]), r.nonZero(-6, 6)] as const,
        ([a, b]) => gcd(a, b) === 1
      );
      const u = linear(a, b);
      return {
        type: "mcq",
        prompt: `ما مشتقة الدالة f(x) = ln(${u}) على مجال تكون فيه ${u} > 0؟`,
        answer: `${num(a)}/(${u})`,
        distractors: [
          { option: `1/(${u})`, misconception: "ln_derivative_inner" },
          { option: `(${u})/${paren(num(a))}`, misconception: "ln_derivative_reverse" },
          { option: num(a), misconception: "ln_derivative_no_divide" },
        ],
        steps: [
          `(ln u)′ = u′/u مع u(x) = ${u}`,
          `u′(x) = ${num(a)}`,
          `f′(x) = ${num(a)}/(${u})`,
        ],
      };
    },
  },
  {
    id: "derivative-ln-quadratic-short",
    skill: "ln_derivative",
    difficulty: 2,
    generate: rng => {
      const [a, b, c] = draw(
        rng,
        r => [r.int(1, 3), r.int(-4, 4), r.int(1, 7)] as const,
        ([a, b, c]) => b * b - 4 * a * c < 0
      );
      const u = poly([[2, a], [1, b], [0, c]]);
      const du = linear(2 * a, b);
      const answer = `${b === 0 ? du : `(${du})`}/(${u})`;
      return {
        type: "short",
        prompt: `f(x) = ln(${u}) معرفة على ℝ. احسب f′(x).`,
        answer,
        steps: [
          `(ln u)′ = u′/u مع u(x) = ${u} > 0 على ℝ (مميزه سالب ومعامل x² موجب)`,
          `u′(x) = ${du}`,
          `f′(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "derivative-product-short",
    skill: "ln_derivative",
    difficulty: 3,
    generate: rng => {
      const a = rng.nonZero(-3, 4);
      const b = rng.nonZero(-5, 5);
      const u = linear(a, b);
      const answer = join(mul(a, "ln x"), `(${u})/x`);
      return {
        type: "short",
        prompt: `احسب مشتقة الدالة f(x) = (${u})ln x على ]0 ; +∞[.`,
        answer,
        steps: [
          `f = u·v مع u(x) = ${u} و v(x) = ln x، إذن u′(x) = ${num(a)} و v′(x) = 1/x`,
          `f′(x) = u′v + uv′ = ${join(mul(a, "ln x"), `(${u})·(1/x)`)}`,
          `f′(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "derivative-quotient",
    skill: "ln_derivative",
    difficulty: 3,
    generate: rng => {
      const [a, b] = draw(
        rng,
        r => [r.pick([-4, -3, -2, -1, 1, 2, 3, 4]), r.int(-5, 5)] as const,
        ([a, b]) => {
          const right = `(${join(num(a - b), mul(-a, "ln x"))})/x²`;
          const sign = `(${join(mul(a, "ln x"), num(b - a))})/x²`;
          const noDivide = `(${join(mul(a, "x"), mul(-a, "ln x"), num(-b))})/x²`;
          return allDifferent(right, sign, `${num(a)}/x`, noDivide);
        }
      );
      const top = join(mul(a, "ln x"), num(b));
      const rightTop = a - b > 0 ? join(num(a - b), mul(-a, "ln x")) : join(mul(-a, "ln x"), num(a - b));
      const shown = b === 0 ? `${top}/x` : `(${top})/x`;
      const answer = `(${rightTop})/x²`;
      return {
        type: "mcq",
        prompt: `ما مشتقة الدالة f(x) = ${shown} على ]0 ; +∞[؟`,
        answer,
        distractors: [
          { option: `(${join(mul(a, "ln x"), num(b - a))})/x²`, misconception: "ln_sign_error" },
          { option: `${num(a)}/x`, misconception: "ln_quotient_rule" },
          { option: `(${join(mul(a, "x"), mul(-a, "ln x"), num(-b))})/x²`, misconception: "ln_derivative_no_divide" },
        ],
        steps: [
          `(u/v)′ = (u′v − uv′)/v² مع u(x) = ${top} و v(x) = x`,
          `u′(x) = ${num(a)}/x و v′(x) = 1`,
          `f′(x) = (${num(a)}/x × x − (${top}))/x² = ${answer}`,
        ],
      };
    },
  },
  // ----------------------------------------------------------------- limits
  {
    id: "limit-basic",
    skill: "ln_limits",
    difficulty: 1,
    generate: rng => {
      const a = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
      const m = rng.int(-5, 5);
      const atZero = rng.chance(0.5);
      const f = join(mul(a, "ln x"), num(m));
      // ln x → −∞ at 0⁺ and +∞ at +∞; a < 0 swaps the sign.
      const plus = atZero ? a < 0 : a > 0;
      const answer = plus ? "+∞" : "−∞";
      const other = plus ? "−∞" : "+∞";
      return {
        type: "mcq",
        prompt: `ما نهاية الدالة f(x) = ${f} عندما يؤول x إلى ${atZero ? "0⁺" : "+∞"}؟`,
        answer,
        distractors: [
          { option: other, misconception: a < 0 ? "ln_sign_error" : "ln_limit_confusion" },
          { option: num(m), misconception: atZero ? "ln_zero" : "ln_limit_bounded" },
          { option: INDETERMINATE, misconception: "ln_indeterminate" },
        ],
        steps: [
          atZero ? "نعلم أن ln x يؤول إلى −∞ عندما x → 0⁺" : "نعلم أن ln x يؤول إلى +∞ عندما x → +∞",
          a === 1
            ? `إذن ln x يؤول إلى ${answer}`
            : `نضرب في ${num(a)} وهو ${a > 0 ? "موجب فتبقى الإشارة" : "سالب فتنعكس الإشارة"}: ${mul(a, "ln x")} يؤول إلى ${answer}`,
          m === 0 ? `إذن النهاية ${answer}` : `إضافة الثابت ${num(m)} لا تغيّر النهاية: ${answer}`,
        ],
      };
    },
  },
  {
    id: "limit-growth",
    skill: "ln_limits",
    difficulty: 2,
    generate: rng => {
      const k = rng.int(1, 5);
      const n = rng.int(1, 3);
      const power = n === 1 ? "x" : `x${sup(n)}`;
      const kLn = mul(k, "ln x");
      const quotient = `${k === 1 ? kLn : `(${kLn})`}/${power}`;
      const template = rng.int(0, 3);
      const cases = [
        {
          f: quotient,
          at: "+∞",
          answer: "0",
          wrong: ["+∞", "−∞"],
          steps: [
            "حالة عدم تعيين من الشكل ∞/∞",
            `حسب التزايد المقارن: ln x/${power} يؤول إلى 0 عند +∞ (القوى تتغلب على ln)`,
            "النهاية 0",
          ],
        },
        {
          f: `${mul(k, power)} ln x`,
          at: "0⁺",
          answer: "0",
          wrong: ["−∞", "+∞"],
          steps: [
            "حالة عدم تعيين من الشكل 0 × ∞",
            `حسب التزايد المقارن: ${power} ln x يؤول إلى 0 عندما x → 0⁺`,
            "النهاية 0",
          ],
        },
        {
          f: `${power} − ${kLn}`,
          at: "+∞",
          answer: "+∞",
          wrong: ["0", "−∞"],
          steps: [
            "حالة عدم تعيين من الشكل ∞ − ∞",
            `نكتب f(x) = ${power}(1 − ${quotient}) و ${quotient} يؤول إلى 0`,
            "النهاية +∞",
          ],
        },
        {
          f: quotient,
          at: "0⁺",
          answer: "−∞",
          wrong: ["0", "+∞"],
          steps: [
            `البسط ${kLn} يؤول إلى −∞ والمقام ${power} يؤول إلى 0⁺`,
            "ليست حالة عدم تعيين: (−∞)/(0⁺) = −∞",
            "النهاية −∞",
          ],
        },
      ][template];
      return {
        type: "mcq",
        prompt: `ما نهاية الدالة f(x) = ${cases.f} عندما يؤول x إلى ${cases.at}؟`,
        answer: cases.answer,
        distractors: [
          { option: cases.wrong[0], misconception: "ln_growth" },
          { option: cases.wrong[1], misconception: template === 3 ? "ln_sign_error" : "ln_growth" },
          { option: INDETERMINATE, misconception: "ln_indeterminate" },
        ],
        steps: cases.steps,
      };
    },
  },
  {
    id: "limit-derivative-number",
    skill: "ln_limits",
    difficulty: 3,
    generate: rng => {
      const a = rng.nonZero(-6, 6);
      const b = rng.int(1, 4);
      const inner = join("1", mul(a, "x"));
      const denominator = b === 1 ? "x" : `(${b}x)`;
      const answer = frac(a, b);
      return {
        type: "short",
        prompt: `احسب نهاية ln(${inner})/${denominator} عندما يؤول x إلى 0.`,
        answer,
        steps: [
          `نضع g(x) = ln(${inner})، لدينا g(0) = ln 1 = 0`,
          `ln(${inner})/x = (g(x) − g(0))/x يؤول إلى g′(0) (العدد المشتق)`,
          `g′(x) = ${num(a)}/(${inner}) إذن g′(0) = ${num(a)}`,
          b === 1 ? `النهاية = ${answer}` : `نقسم على ${b}: النهاية = ${answer}`,
        ],
      };
    },
  },
];

export const logarithmLesson: Lesson = {
  key: "math-logarithm",
  curriculum: "dz",
  subject: "math",
  title: "الدالة اللوغاريتمية النيبيرية",
  levels: ["bac"],
  skills: [
    {
      key: "ln_properties",
      name: "الخواص الجبرية للدالة ln",
      prerequisites: [],
      explanation:
        "الدالة اللوغاريتمية النيبيرية ln معرفة على ]0 ; +∞[ وهي الدالة العكسية للدالة الأسية: ln(eˣ) = x، و ln 1 = 0 و ln e = 1. من أجل a > 0 و b > 0: ln(ab) = ln a + ln b و ln(a/b) = ln a − ln b و ln(aⁿ) = n·ln a. تحوّل ln الجداء إلى مجموع، لكن ln(a + b) لا يساوي ln a + ln b.",
      example: {
        problem: "اكتب A = ln 8 + ln 2 على الشكل k·ln 2.",
        steps: ["8 = 2³ إذن ln 8 = 3ln 2", "A = 3ln 2 + ln 2", "A = 4ln 2"],
        answer: "A = 4ln 2",
      },
    },
    {
      key: "ln_domain",
      name: "مجموعة تعريف دالة لوغاريتمية",
      prerequisites: ["ln_properties"],
      explanation:
        "العبارة ln u(x) معرفة إذا وفقط إذا كان u(x) > 0 تماماً، لأن ln 0 غير معرف. لإيجاد مجموعة التعريف نحل المتراجحة u(x) > 0، وإذا احتوت الدالة على عدة لوغاريتمات نأخذ تقاطع الشروط.",
      example: {
        problem: "عيّن مجموعة تعريف f(x) = ln(−2x + 6).",
        steps: ["−2x + 6 > 0", "−2x > −6", "نقسم على −2 فينعكس الاتجاه: x < 3"],
        answer: "D = ]−∞ ; 3[",
      },
    },
    {
      key: "ln_equations",
      name: "حل معادلات لوغاريتمية",
      prerequisites: ["ln_domain"],
      explanation:
        "نبدأ دائماً بشرط الوجود. المعادلة ln u = k تكافئ u = eᵏ، وخاصة ln u = 0 تكافئ u = 1. والمعادلة ln u = ln v تكافئ u = v مع u > 0، لذلك نتحقق في الأخير من أن كل حل يحقق شرط الوجود ونرفض الحلول الأخرى.",
      example: {
        problem: "حل في ℝ المعادلة ln(2x + 1) = 3.",
        steps: ["2x + 1 = e³ (والشرط 2x + 1 > 0 محقق)", "2x = e³ − 1", "x = (e³ − 1)/2"],
        answer: "x = (e³ − 1)/2",
      },
    },
    {
      key: "ln_inequalities",
      name: "حل متراجحات لوغاريتمية",
      prerequisites: ["ln_equations"],
      explanation:
        "الدالة ln متزايدة تماماً على ]0 ; +∞[، فالمتراجحة ln u < ln v تكافئ u < v مع u > 0 و v > 0 (يُحفظ الاتجاه). نكتب العدد k على الشكل ln(eᵏ)، ثم نحل ونأخذ تقاطع الحلول مع شرط الوجود.",
      example: {
        problem: "حل في ℝ المتراجحة ln x < 2.",
        steps: ["شرط الوجود: x > 0", "ln x < ln(e²) ⟺ x < e²", "مع شرط الوجود: 0 < x < e²"],
        answer: "S = ]0 ; e²[",
      },
    },
    {
      key: "ln_derivative",
      name: "مشتقة الدالة ln",
      prerequisites: ["ln_domain"],
      explanation:
        "الدالة ln قابلة للاشتقاق على ]0 ; +∞[ و (ln x)′ = 1/x. إذا كانت u دالة موجبة تماماً وقابلة للاشتقاق فإن (ln u)′ = u′/u، فلا ننسى مشتقة u في البسط. ونطبق قواعد الجداء والقسمة كالمعتاد.",
      example: {
        problem: "احسب مشتقة f(x) = ln(x² + 1).",
        steps: ["u(x) = x² + 1 و u′(x) = 2x", "(ln u)′ = u′/u", "f′(x) = 2x/(x² + 1)"],
        answer: "f′(x) = 2x/(x² + 1)",
      },
    },
    {
      key: "ln_limits",
      name: "نهايات الدالة ln",
      prerequisites: ["ln_derivative"],
      explanation:
        "لدينا ln x → −∞ عندما x → 0⁺ و ln x → +∞ عندما x → +∞. وفي حالات عدم التعيين نستعمل التزايد المقارن: القوى تتغلب على ln، فـ ln x/x → 0 عند +∞ و x·ln x → 0 عند 0⁺. كما أن ln(1 + x)/x يؤول إلى 1 عندما x → 0 (العدد المشتق).",
      example: {
        problem: "احسب نهاية f(x) = x − ln x عندما x → +∞.",
        steps: ["حالة عدم تعيين من الشكل ∞ − ∞", "f(x) = x(1 − ln x/x) و ln x/x → 0", "النهاية +∞"],
        answer: "النهاية +∞",
      },
    },
  ],
  misconceptions: {
    ln_sum_split: "اعتبار ln(a + b) = ln a + ln b (أو ln a − ln b = ln(a − b))",
    ln_product_multiply: "اعتبار ln(ab) = ln a × ln b (أو ln(a/b) = ln a / ln b)",
    ln_quotient_sign: "الخلط بين الجمع والطرح: ln(a/b) = ln a + ln b أو ln(1/a) = ln a",
    ln_power_error: "اعتبار ln(aⁿ) = (ln a)ⁿ بدل n·ln a",
    ln_one_e: "الخلط بين ln 1 = 0 و ln e = 1",
    ln_zero: "اعتبار ln 0 = 0 أو أن ln u معرفة من أجل u = 0",
    ln_domain_forgot: "نسيان شرط الوجود u > 0 عند الحل",
    ln_domain_partial: "الاكتفاء بجزء من شروط التعريف أو بمجال واحد من مجموعة التعريف",
    ln_domain_product: "اعتبار مجموعة تعريف ln u + ln v هي مجموعة تعريف ln(uv)",
    ln_domain_check: "خطأ في التحقق من شرط الوجود (رفض حل مقبول أو قبول حل مرفوض)",
    ln_sign_error: "خطأ في الإشارة (عند نقل الحدود أو في جدول الإشارة)",
    ln_solve_error: "خطأ في تجميع حدود x عند حل المعادلة",
    ln_exp_inverse: "نسيان تطبيق الأسية: اعتبار ln x > k تعطي x > k",
    ln_inequality_direction: "خطأ في اتجاه المتراجحة (ln متزايدة فتحفظ الاتجاه)",
    ln_derivative_inner: "اعتبار (ln u)′ = 1/u ونسيان u′",
    ln_derivative_reverse: "قلب الكسر: (ln u)′ = u/u′ بدل u′/u",
    ln_derivative_no_divide: "اعتبار (ln u)′ = u′ (نسيان القسمة على u)",
    ln_quotient_rule: "خطأ في قاعدة مشتقة حاصل القسمة (u/v)′ = (u′v − uv′)/v²",
    ln_limit_confusion: "الخلط بين نهايتي ln x عند 0⁺ (−∞) وعند +∞ (+∞)",
    ln_limit_bounded: "الاعتقاد أن ln x تؤول إلى عدد ثابت عند +∞ لأنها تتزايد ببطء",
    ln_growth: "إهمال التزايد المقارن: القوى xⁿ تتغلب على ln x",
    ln_indeterminate: "الخلط في حالات عدم التعيين (التوقف عندها أو توهّمها حيث لا توجد)",
  },
  remedies: {
    ln_sum_split: "ln تحوّل الجداء إلى مجموع، لا المجموع: ln 2 + ln 3 = ln 6 وليس ln 5.",
    ln_product_multiply: "ln(ab) = ln a + ln b بالجمع لا بالضرب: ln 6 = ln 2 + ln 3.",
    ln_quotient_sign: "ln(a/b) = ln a − ln b، وخاصة ln(1/a) = −ln a.",
    ln_power_error: "الأس ينزل معاملاً أمام ln: ln(2³) = 3ln 2 وليس (ln 2)³.",
    ln_one_e: "تذكّر: ln 1 = 0 لأن e⁰ = 1، و ln e = 1 لأن e¹ = e.",
    ln_zero: "ln 0 غير معرف: ln u تشترط u > 0 تماماً، فالحدود تُستثنى بأقواس مفتوحة.",
    ln_domain_forgot: "ابدأ كل معادلة أو متراجحة بكتابة شرط الوجود u > 0، وتحقق منه في النهاية.",
    ln_domain_partial: "كل لوغاريتم يعطي شرطاً، ومجموعة التعريف هي تقاطع كل الشروط بكل مجالاتها.",
    ln_domain_product: "ln u + ln v تشترط u > 0 و v > 0 معاً، بينما ln(uv) تشترط فقط uv > 0.",
    ln_domain_check: "عوّض الحل في u(x): إذا كان u(x) > 0 فالحل مقبول، وإلا فهو مرفوض.",
    ln_sign_error: "عند نقل حد إلى الطرف الآخر تتغير إشارته؛ راجع كل خطوة وكل إشارة.",
    ln_solve_error: "من ax + b = cx + d ننقل حدود x إلى طرف واحد: (a − c)x = d − b.",
    ln_exp_inverse: "اكتب k = ln(eᵏ): ln x > k ⟺ x > eᵏ وليس x > k.",
    ln_inequality_direction: "ln متزايدة تماماً فتحفظ الاتجاه؛ لا يتغير الاتجاه إلا عند القسمة على عدد سالب.",
    ln_derivative_inner: "(ln u)′ = u′/u: لا تنسَ مشتقة u في البسط.",
    ln_derivative_reverse: "في (ln u)′ = u′/u المشتقة u′ في البسط و u في المقام.",
    ln_derivative_no_divide: "(ln u)′ = u′/u: بعد اشتقاق u نقسم على u نفسها، فمثلاً (ln x)′ = 1/x.",
    ln_quotient_rule: "مشتقة حاصل القسمة ليست حاصل قسمة المشتقات: (u/v)′ = (u′v − uv′)/v².",
    ln_limit_confusion: "ارسم منحنى ln: ينزل إلى −∞ قرب 0⁺ ويصعد ببطء إلى +∞ جهة +∞.",
    ln_limit_bounded: "ln x تتزايد ببطء لكنها غير محدودة: ln x → +∞ عندما x → +∞.",
    ln_growth: "في التزايد المقارن xⁿ تتغلب على ln x: ln x/xⁿ → 0 عند +∞ و xⁿ ln x → 0 عند 0⁺.",
    ln_indeterminate: "تحقق أولاً هل هي فعلاً حالة عدم تعيين، ثم ارفعها بالتحليل أو بالتزايد المقارن.",
  },
  bank: [],
  generators,
};
