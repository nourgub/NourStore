// BAC lesson "الدالة الأسية" (Algerian curriculum): skill graph,
// misconceptions, remedies and parametric generators (see
// ./derivativesGenerators.ts for the pattern every generator follows).
import type { Lesson } from "../curriculum";
import { answersMatch } from "../grading";
import { expressionsEquivalent } from "../mathExpr";
import { frac, join, linear, mul, num, paren, poly, signed, sup, type Generator, type Rng } from "../generators/core";

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

const SUP_EXTRA: Record<string, string> = { x: "ˣ", "+": "⁺", "−": "⁻" };

/**
 * e raised to `inner`: a superscript when the exponent is a simple linear
 * expression ("e²ˣ⁺¹", "e⁻³"), e^(…) otherwise. e⁰ = 1 and e¹ = e.
 */
function ePow(inner: string): string {
  const compact = inner.replace(/\s+/g, "");
  if (compact === "0") return "1";
  if (compact === "1") return "e";
  if (/^[0-9x+−]+$/.test(compact)) {
    return `e${Array.from(compact).map(char => SUP_EXTRA[char] ?? sup(char)).join("")}`;
  }
  return `e^(${inner})`;
}

/** e^k for an integer k. */
const eInt = (k: number) => ePow(num(k));

/** factor · e^… written as a product: "(2x + 1)eˣ", "3xe²ˣ". */
function times(factor: string, exponential: string): string {
  return /\s/.test(factor) ? `(${factor})${exponential}` : `${factor}${exponential}`;
}

type Relation = ">" | "<" | "≥" | "≤";
const FLIP: Record<Relation, Relation> = { ">": "<", "<": ">", "≥": "≤", "≤": "≥" };

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

const INDETERMINATE = "حالة عدم تعيين (لا يمكن حساب النهاية)";

const generators: Generator[] = [
  // ---------------------------------------------------------------- algebra
  {
    id: "rules-power-product",
    skill: "exp_algebra",
    difficulty: 1,
    generate: rng => {
      const [a, n, b] = draw(
        rng,
        r => [r.int(2, 4), r.int(2, 3), r.nonZero(-5, 5)] as const,
        ([a, n, b]) =>
          n * a + b !== 0 &&
          allDifferent(eInt(n * a + b), eInt(a + n + b), eInt(n * a * b), join(eInt(n * a), eInt(b)))
      );
      const k = n * a + b;
      return {
        type: "mcq",
        prompt: `بسّط العبارة A = (${eInt(a)})${sup(n)} × ${eInt(b)}`,
        answer: eInt(k),
        distractors: [
          { option: eInt(a + n + b), misconception: "exp_power_add" },
          { option: eInt(n * a * b), misconception: "exp_product_multiply" },
          { option: join(eInt(n * a), eInt(b)), misconception: "exp_sum_split" },
        ],
        steps: [
          `(eᵃ)ⁿ = eⁿᵃ إذن (${eInt(a)})${sup(n)} = e^(${n}×${a}) = ${eInt(n * a)}`,
          `eᵃ × eᵇ = eᵃ⁺ᵇ إذن A = e^(${n * a} ${signed(b)})`,
          `A = ${eInt(k)}`,
        ],
      };
    },
  },
  {
    id: "rules-quotient",
    skill: "exp_algebra",
    difficulty: 2,
    generate: rng => {
      const [a, b, c] = draw(
        rng,
        r => [r.nonZero(-6, 7), r.nonZero(-6, 7), r.nonZero(-6, 7)] as const,
        ([a, b, c]) =>
          a + b - c !== 0 &&
          allDifferent(eInt(a + b - c), eInt(a + b + c), eInt(a * b - c), join(eInt(a + b), `−${eInt(c)}`))
      );
      const s = a + b;
      return {
        type: "mcq",
        prompt: `بسّط العبارة A = (${eInt(a)} × ${eInt(b)}) / ${eInt(c)}`,
        answer: eInt(s - c),
        distractors: [
          { option: eInt(a + b + c), misconception: "exp_quotient_error" },
          { option: eInt(a * b - c), misconception: "exp_product_multiply" },
          { option: join(eInt(s), `−${eInt(c)}`), misconception: "exp_sum_split" },
        ],
        steps: [
          `البسط: ${eInt(a)} × ${eInt(b)} = e^(${num(a)} ${signed(b)}) = ${eInt(s)}`,
          `القسمة: eᵃ / eᵇ = eᵃ⁻ᵇ إذن A = e^(${num(s)} − ${paren(num(c))})`,
          `A = ${eInt(s - c)}`,
        ],
      };
    },
  },
  {
    id: "rules-variable-short",
    skill: "exp_algebra",
    difficulty: 2,
    generate: rng => {
      const divide = rng.chance(0.5);
      const [a, b, c] = draw(
        rng,
        r => [r.nonZero(-4, 5), r.nonZero(-4, 5), r.nonZero(-5, 5)] as const,
        ([a, b]) => (divide ? a - b : a + b) !== 0 && a !== b
      );
      const k = divide ? a - b : a + b;
      const result = ePow(linear(k, c));
      const prompt = divide
        ? `اكتب A(x) = ${ePow(linear(a, c))} / ${ePow(mul(b, "x"))} على الشكل e^(αx + β).`
        : `اكتب A(x) = ${ePow(mul(a, "x"))} × ${ePow(linear(b, c))} على الشكل e^(αx + β).`;
      return {
        type: "short",
        prompt,
        answer: result,
        steps: divide
          ? [
              "eᵘ / eᵛ = eᵘ⁻ᵛ: نطرح الأسين",
              `(${linear(a, c)}) − (${mul(b, "x")}) = ${linear(k, c)}`,
              `A(x) = ${result}`,
            ]
          : [
              "eᵘ × eᵛ = eᵘ⁺ᵛ: نجمع الأسين",
              `${mul(a, "x")} + (${linear(b, c)}) = ${linear(k, c)}`,
              `A(x) = ${result}`,
            ],
      };
    },
  },
  // -------------------------------------------------------------- equations
  {
    id: "equation-same-base",
    skill: "exp_equations",
    difficulty: 1,
    generate: rng => {
      const [a, b, c] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.int(-6, 6), r.int(-6, 6)] as const,
        ([, b, c]) => b !== c
      );
      const x = frac(c - b, a);
      return {
        type: "short",
        prompt: `حل في ℝ المعادلة ${ePow(linear(a, b))} = ${eInt(c)}.`,
        answer: x,
        steps: [
          "الدالة x ↦ eˣ متزايدة تماماً على ℝ، إذن eᵘ = eᵛ ⟺ u = v",
          `${linear(a, b)} = ${num(c)}`,
          `${mul(a, "x")} = ${num(c - b)}`,
          `x = ${x}`,
        ],
      };
    },
  },
  {
    id: "equation-equals-one",
    skill: "exp_equations",
    difficulty: 2,
    generate: rng => {
      const [a, b] = draw(
        rng,
        r => [r.pick([-5, -4, -3, -2, 2, 3, 4, 5]), r.nonZero(-7, 7)] as const,
        ([a, b]) => allDifferent(frac(-b, a), frac(1 - b, a), frac(b, a), num(-b))
      );
      const x = frac(-b, a);
      return {
        type: "mcq",
        prompt: `ما حل المعادلة ${ePow(linear(a, b))} = 1 في ℝ؟`,
        answer: x,
        distractors: [
          { option: frac(1 - b, a), misconception: "exp_zero" },
          { option: frac(b, a), misconception: "exp_sign_error" },
          { option: num(-b), misconception: "exp_solve_error" },
        ],
        steps: [
          "1 = e⁰، إذن المعادلة تكتب eᵘ = e⁰ أي u = 0",
          `${linear(a, b)} = 0`,
          `${mul(a, "x")} = ${num(-b)}`,
          `x = ${x}`,
        ],
      };
    },
  },
  {
    id: "equation-with-ln",
    skill: "exp_equations",
    difficulty: 3,
    generate: rng => {
      const [a, b, k] = draw(
        rng,
        r => [r.int(2, 5), r.nonZero(-5, 5), r.pick([2, 3, 5, 6, 7, 10])] as const,
        ([a, b, k]) =>
          allDifferent(
            `(ln ${k} ${signed(-b)})/${a}`,
            frac(k - b, a),
            `(ln ${k} ${signed(b)})/${a}`,
            `(ln ${k})/${a} ${signed(-b)}`
          )
      );
      const answer = `(ln ${k} ${signed(-b)})/${a}`;
      return {
        type: "mcq",
        prompt: `ما حل المعادلة ${ePow(linear(a, b))} = ${k} في ℝ؟`,
        answer,
        distractors: [
          { option: frac(k - b, a), misconception: "exp_ln_inverse" },
          { option: `(ln ${k} ${signed(b)})/${a}`, misconception: "exp_sign_error" },
          { option: `(ln ${k})/${a} ${signed(-b)}`, misconception: "exp_solve_error" },
        ],
        steps: [
          `${k} > 0، و eᵘ = k ⟺ u = ln k`,
          `${linear(a, b)} = ln ${k}`,
          `${a}x = ln ${k} ${signed(-b)}`,
          `x = ${answer}`,
        ],
      };
    },
  },
  // ----------------------------------------------------------- inequalities
  {
    id: "inequality-same-base",
    skill: "exp_inequalities",
    difficulty: 2,
    generate: rng => {
      const relation = rng.pick<Relation>([">", "<", "≥", "≤"]);
      const [a, b, c] = draw(
        rng,
        r => [r.pick([-4, -3, -2, -1, 2, 3, 4]), r.nonZero(-5, 5), r.int(-5, 5)] as const,
        ([a, b, c]) => {
          const final = a < 0 ? FLIP[relation] : relation;
          return allDifferent(
            interval(final, frac(c - b, a)),
            interval(FLIP[final], frac(c - b, a)),
            interval(final, frac(c + b, a)),
            interval(final, frac(c - a * b, a))
          );
        }
      );
      const final = a < 0 ? FLIP[relation] : relation;
      const bound = frac(c - b, a);
      const answer = interval(final, bound);
      return {
        type: "mcq",
        prompt: `ما مجموعة حلول المتراجحة ${ePow(linear(a, b))} ${relation} ${eInt(c)} في ℝ؟`,
        answer,
        distractors: [
          { option: interval(FLIP[final], bound), misconception: "exp_inequality_direction" },
          { option: interval(final, frac(c + b, a)), misconception: "exp_sign_error" },
          { option: interval(final, frac(c - a * b, a)), misconception: "exp_solve_error" },
        ],
        steps: [
          `الدالة الأسية متزايدة تماماً على ℝ، إذن eᵘ ${relation} eᵛ ⟺ u ${relation} v`,
          `${linear(a, b)} ${relation} ${num(c)} أي ${mul(a, "x")} ${relation} ${num(c - b)}`,
          a < 0
            ? `نقسم على ${num(a)} وهو سالب فينعكس اتجاه المتراجحة: x ${final} ${bound}`
            : `نقسم على ${num(a)} وهو موجب: x ${final} ${bound}`,
          `S = ${answer}`,
        ],
      };
    },
  },
  {
    id: "inequality-positive",
    skill: "exp_inequalities",
    difficulty: 1,
    generate: rng => {
      const relation = rng.pick<Relation>([">", "<", "≥", "≤"]);
      const always = relation === ">" || relation === "≥";
      const [a, b, k] = draw(
        rng,
        r => [r.nonZero(-3, 3), r.int(-4, 4), r.int(1, 6)] as const,
        ([a, b, k]) => {
          const final = a < 0 ? FLIP[relation] : relation;
          const bound = frac(-k - b, a);
          return interval(final, bound) !== interval(FLIP[final], bound);
        }
      );
      const final = a < 0 ? FLIP[relation] : relation;
      const bound = frac(-k - b, a);
      const u = ePow(linear(a, b));
      return {
        type: "mcq",
        prompt: `ما مجموعة حلول المتراجحة ${u} ${relation} ${num(-k)} في ℝ؟`,
        answer: always ? "ℝ" : "∅",
        distractors: [
          { option: always ? "∅" : "ℝ", misconception: "exp_positive_ignored" },
          { option: interval(final, bound), misconception: "exp_ln_inverse" },
          { option: interval(FLIP[final], bound), misconception: "exp_inequality_direction" },
        ],
        steps: [
          "من أجل كل عدد حقيقي u لدينا eᵘ > 0",
          always
            ? `إذن ${u} > 0 > ${num(-k)} محققة من أجل كل x`
            : `إذن ${u} > 0 > ${num(-k)} فلا يمكن أن يكون ${u} ${relation} ${num(-k)}`,
          always ? "S = ℝ" : "S = ∅",
        ],
      };
    },
  },
  // ------------------------------------------------------------- derivative
  {
    id: "derivative-chain-linear",
    skill: "exp_derivative",
    difficulty: 1,
    generate: rng => {
      const a = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
      const b = rng.int(-5, 5);
      const u = linear(a, b);
      const e = ePow(u);
      return {
        type: "mcq",
        prompt: `ما مشتقة الدالة f(x) = ${e}؟`,
        answer: mul(a, e),
        distractors: [
          { option: e, misconception: "exp_forgot_inner" },
          { option: times(paren(u), ePow(linear(a, b - 1))), misconception: "exp_power_rule" },
          { option: eInt(a), misconception: "exp_derivative_exponent" },
        ],
        steps: [
          `(eᵘ)′ = u′·eᵘ مع u = ${u}`,
          `u′ = ${num(a)}`,
          `f′(x) = ${mul(a, e)}`,
        ],
      };
    },
  },
  {
    id: "derivative-product-short",
    skill: "exp_derivative",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-4, 5);
      const b = rng.nonZero(-6, 6);
      const u = linear(a, b);
      const answer = times(linear(a, a + b), "eˣ");
      return {
        type: "short",
        prompt: `احسب مشتقة الدالة f(x) = ${times(u, "eˣ")}.`,
        answer,
        steps: [
          `f = u·v مع u = ${u} و v = eˣ، إذن u′ = ${num(a)} و v′ = eˣ`,
          `f′(x) = u′v + uv′ = ${join(mul(a, "eˣ"), times(u, "eˣ"))}`,
          `نخرج eˣ عاملاً مشتركاً: f′(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "derivative-product-chain",
    skill: "exp_derivative",
    difficulty: 3,
    generate: rng => {
      const [a, b, k] = draw(
        rng,
        r => [r.nonZero(-3, 4), r.nonZero(-5, 5), r.pick([-3, -2, 2, 3])] as const,
        ([a, b, k]) => {
          const e = ePow(mul(k, "x"));
          return allDifferent(
            times(linear(a * k, a + b * k), e),
            mul(a * k, e),
            times(linear(a * k, b * k), e),
            times(linear(a, a + b), e)
          );
        }
      );
      const e = ePow(mul(k, "x"));
      const u = linear(a, b);
      const answer = times(linear(a * k, a + b * k), e);
      return {
        type: "mcq",
        prompt: `ما مشتقة الدالة f(x) = ${times(u, e)}؟`,
        answer,
        distractors: [
          { option: mul(a * k, e), misconception: "exp_product_rule_error" },
          { option: times(linear(a * k, b * k), e), misconception: "exp_product_rule_error" },
          { option: times(linear(a, a + b), e), misconception: "exp_forgot_inner" },
        ],
        steps: [
          `u = ${u} و v = ${e}، إذن u′ = ${num(a)} و v′ = ${mul(k, e)}`,
          `f′(x) = u′v + uv′ = ${join(mul(a, e), `${mul(k, paren(u))}${e}`)}`,
          `f′(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "derivative-chain-quadratic",
    skill: "exp_derivative",
    difficulty: 3,
    generate: rng => {
      const a = rng.nonZero(-3, 3);
      const b = rng.int(-4, 4);
      const c = rng.int(-3, 3);
      const u = poly([[2, a], [1, b], [0, c]]);
      const e = ePow(u);
      const derivativeU = linear(2 * a, b);
      const answer = times(derivativeU, e);
      return {
        type: "short",
        prompt: `احسب مشتقة الدالة f(x) = ${e}.`,
        answer,
        steps: [
          `(eᵘ)′ = u′·eᵘ مع u(x) = ${u}`,
          `u′(x) = ${derivativeU}`,
          `f′(x) = ${answer}`,
        ],
      };
    },
  },
  // ----------------------------------------------------------------- limits
  {
    id: "limit-basic",
    skill: "exp_limits",
    difficulty: 1,
    generate: rng => {
      const a = rng.nonZero(-4, 4);
      const b = rng.int(-5, 5);
      const m = rng.int(-5, 5);
      const toPlus = rng.chance(0.5);
      const grows = (a > 0) === toPlus;
      const u = linear(a, b);
      const f = join(ePow(u), num(m));
      const uLimit = grows ? "+∞" : "−∞";
      return {
        type: "mcq",
        prompt: `ما نهاية الدالة f(x) = ${f} عندما يؤول x إلى ${toPlus ? "+∞" : "−∞"}؟`,
        answer: grows ? "+∞" : num(m),
        distractors: [
          { option: grows ? num(m) : "+∞", misconception: "exp_limit_confusion" },
          { option: "−∞", misconception: "exp_negative_values" },
          { option: num(m + 1), misconception: "exp_zero" },
        ],
        steps: [
          `عندما يؤول x إلى ${toPlus ? "+∞" : "−∞"} فإن ${u} يؤول إلى ${uLimit}`,
          grows ? "ونعلم أن eᵘ يؤول إلى +∞ عندما u → +∞" : "ونعلم أن eᵘ يؤول إلى 0 عندما u → −∞",
          grows ? "إذن النهاية +∞" : m === 0 ? "إذن النهاية 0" : `إذن النهاية 0 ${signed(m)} = ${num(m)}`,
        ],
      };
    },
  },
  {
    id: "limit-growth",
    skill: "exp_limits",
    difficulty: 2,
    generate: rng => {
      const k = rng.int(1, 5);
      const n = rng.int(1, 3);
      const mono = poly([[n, k]]);
      const template = rng.int(0, 3);
      const cases = [
        {
          f: `${mono}eˣ`,
          at: "−∞",
          answer: "0",
          wrong: ["+∞", "−∞"],
          steps: [`حالة عدم تعيين من الشكل ∞ × 0`, "حسب التزايد المقارن: lim xⁿeˣ = 0 عند −∞", "النهاية 0"],
        },
        {
          f: `eˣ/${k === 1 ? mono : `(${mono})`}`,
          at: "+∞",
          answer: "+∞",
          wrong: ["0", "−∞"],
          steps: ["حالة عدم تعيين من الشكل ∞/∞", "حسب التزايد المقارن: eˣ/xⁿ يؤول إلى +∞ عند +∞", "النهاية +∞"],
        },
        {
          f: `${mono}e⁻ˣ`,
          at: "+∞",
          answer: "0",
          wrong: ["+∞", "−∞"],
          steps: ["حالة عدم تعيين من الشكل ∞ × 0", `${mono}e⁻ˣ = ${mono}/eˣ والأسية تتغلب على القوى`, "النهاية 0"],
        },
        {
          f: `eˣ − ${mono}`,
          at: "+∞",
          answer: "+∞",
          wrong: ["0", "−∞"],
          steps: [
            "حالة عدم تعيين من الشكل ∞ − ∞",
            `نكتب f(x) = eˣ(1 − ${mono}/eˣ) و ${mono}/eˣ يؤول إلى 0`,
            "النهاية +∞",
          ],
        },
      ][template];
      return {
        type: "mcq",
        prompt: `ما نهاية الدالة f(x) = ${cases.f} عندما يؤول x إلى ${cases.at}؟`,
        answer: cases.answer,
        distractors: [
          { option: cases.wrong[0], misconception: "exp_growth_comparison" },
          { option: cases.wrong[1], misconception: "exp_growth_comparison" },
          { option: INDETERMINATE, misconception: "exp_indeterminate" },
        ],
        steps: cases.steps,
      };
    },
  },
  {
    id: "limit-derivative-number",
    skill: "exp_limits",
    difficulty: 3,
    generate: rng => {
      const a = rng.nonZero(-6, 6);
      const b = rng.int(1, 4);
      const e = ePow(mul(a, "x"));
      const denominator = mul(b, "x");
      const answer = frac(a, b);
      return {
        type: "short",
        prompt: `احسب نهاية (${e} − 1)/${b === 1 ? denominator : `(${denominator})`} عندما يؤول x إلى 0.`,
        answer,
        steps: [
          `نضع g(x) = ${e}، لدينا g(0) = e⁰ = 1`,
          `(${e} − 1)/x = (g(x) − g(0))/x يؤول إلى g′(0) (العدد المشتق)`,
          `g′(x) = ${mul(a, e)} إذن g′(0) = ${num(a)}`,
          b === 1 ? `النهاية = ${answer}` : `نقسم على ${b}: النهاية = ${frac(a, b)}`,
        ],
      };
    },
  },
];

export const exponentialLesson: Lesson = {
  key: "math-exponential",
  curriculum: "dz",
  subject: "math",
  title: "الدالة الأسية",
  levels: ["bac"],
  skills: [
    {
      key: "exp_algebra",
      name: "الخواص الجبرية للدالة الأسية",
      prerequisites: [],
      explanation:
        "الدالة الأسية x ↦ eˣ معرفة على ℝ وموجبة تماماً، و e⁰ = 1. من أجل كل عددين حقيقيين a و b: eᵃ × eᵇ = eᵃ⁺ᵇ و eᵃ / eᵇ = eᵃ⁻ᵇ و (eᵃ)ⁿ = eⁿᵃ. نجمع الأسس عند الضرب ونطرحها عند القسمة ونضربها عند الرفع إلى قوة.",
      example: {
        problem: "بسّط A = (e²)³ × e⁻⁴.",
        steps: ["(e²)³ = e^(3×2) = e⁶", "A = e⁶ × e⁻⁴ = e^(6 − 4)", "A = e²"],
        answer: "A = e²",
      },
    },
    {
      key: "exp_equations",
      name: "حل معادلات أسية",
      prerequisites: ["exp_algebra"],
      explanation:
        "الدالة الأسية متزايدة تماماً على ℝ، لذلك eᵘ = eᵛ تكافئ u = v. لحل eᵘ = 1 نكتب 1 = e⁰ فنجد u = 0، ولحل eᵘ = k مع k > 0 نجد u = ln k. أما إذا كان k ≤ 0 فالمعادلة ليس لها حلول لأن eᵘ > 0 دائماً.",
      example: {
        problem: "حل في ℝ المعادلة e²ˣ⁺¹ = 5.",
        steps: ["5 > 0 إذن 2x + 1 = ln 5", "2x = ln 5 − 1", "x = (ln 5 − 1)/2"],
        answer: "x = (ln 5 − 1)/2",
      },
    },
    {
      key: "exp_inequalities",
      name: "حل متراجحات أسية",
      prerequisites: ["exp_equations"],
      explanation:
        "بما أن الدالة الأسية متزايدة تماماً فإن eᵘ < eᵛ تكافئ u < v (يُحفظ اتجاه المتراجحة). بعدها نحل متراجحة من الدرجة الأولى، وننتبه لقلب الاتجاه عند القسمة على عدد سالب. ولا ننسى أن eᵘ > 0 دائماً، فمثلاً eᵘ > −3 محققة على ℝ.",
      example: {
        problem: "حل في ℝ المتراجحة e⁻²ˣ⁺¹ ≤ e⁵.",
        steps: ["−2x + 1 ≤ 5", "−2x ≤ 4", "نقسم على −2 فينعكس الاتجاه: x ≥ −2"],
        answer: "S = [−2 ; +∞[",
      },
    },
    {
      key: "exp_derivative",
      name: "مشتقة الدالة الأسية",
      prerequisites: ["exp_algebra"],
      explanation:
        "الدالة الأسية تساوي مشتقتها: (eˣ)′ = eˣ. وإذا كانت u دالة قابلة للاشتقاق فإن (eᵘ)′ = u′·eᵘ، فلا ننسى الضرب في مشتقة الأس. ولجداء مثل (ax + b)eˣ نستعمل قاعدة الجداء (uv)′ = u′v + uv′ ثم نخرج eˣ عاملاً مشتركاً.",
      example: {
        problem: "احسب مشتقة f(x) = (2x + 1)eˣ.",
        steps: ["u = 2x + 1 و v = eˣ، إذن u′ = 2 و v′ = eˣ", "f′(x) = 2eˣ + (2x + 1)eˣ", "f′(x) = (2x + 3)eˣ"],
        answer: "f′(x) = (2x + 3)eˣ",
      },
    },
    {
      key: "exp_limits",
      name: "نهايات الدالة الأسية",
      prerequisites: ["exp_derivative"],
      explanation:
        "لدينا eˣ → +∞ عندما x → +∞ و eˣ → 0 عندما x → −∞. وفي حالات عدم التعيين نستعمل التزايد المقارن: الأسية تتغلب على القوى، فـ eˣ/xⁿ → +∞ عند +∞ و xⁿeˣ → 0 عند −∞. كما أن (eˣ − 1)/x يؤول إلى 1 عندما x → 0 (العدد المشتق للدالة الأسية عند 0).",
      example: {
        problem: "احسب نهاية f(x) = x²eˣ عندما x → −∞.",
        steps: ["حالة عدم تعيين من الشكل ∞ × 0", "حسب التزايد المقارن: x²eˣ → 0 عند −∞"],
        answer: "النهاية 0",
      },
    },
  ],
  misconceptions: {
    exp_product_multiply: "ضرب الأسس بدل جمعها: eᵃ × eᵇ = eᵃᵇ",
    exp_quotient_error: "خطأ في قسمة القوى: eᵃ / eᵇ = eᵃ⁺ᵇ بدل eᵃ⁻ᵇ",
    exp_power_add: "جمع الأسين في القوة: (eᵃ)ⁿ = eᵃ⁺ⁿ بدل eⁿᵃ",
    exp_sum_split: "اعتبار e^(a+b) = eᵃ + eᵇ (أو e^(a−b) = eᵃ − eᵇ)",
    exp_zero: "الخلط حول e⁰ = 1 (مثل اعتبار e⁰ = 0 أو أن eᵘ = 1 تعطي u = 1)",
    exp_sign_error: "خطأ في الإشارة عند نقل الحدود أثناء الحل",
    exp_solve_error: "نسيان قسمة الطرف كله على معامل x",
    exp_ln_inverse: "نسيان تطبيق ln: اعتبار eᵘ = k تعطي u = k",
    exp_inequality_direction: "خطأ في اتجاه المتراجحة (خاصة عند القسمة على عدد سالب)",
    exp_positive_ignored: "نسيان أن eᵘ > 0 من أجل كل عدد حقيقي u",
    exp_forgot_inner: "نسيان الضرب في u′ عند اشتقاق eᵘ",
    exp_power_rule: "تطبيق قاعدة القوة على eˣ: (eˣ)′ = x·eˣ⁻¹",
    exp_derivative_exponent: "اشتقاق الأس وحده: (eᵘ)′ = e^(u′)",
    exp_product_rule_error: "خطأ في قاعدة مشتقة الجداء (uv)′ = u′v + uv′",
    exp_limit_confusion: "الخلط بين نهايتي eˣ عند +∞ (تؤول إلى +∞) وعند −∞ (تؤول إلى 0)",
    exp_negative_values: "الاعتقاد أن الدالة الأسية قد تؤول إلى −∞ أو تأخذ قيماً سالبة",
    exp_growth_comparison: "إهمال التزايد المقارن: الأسية تتغلب على كل قوة لـ x",
    exp_indeterminate: "التوقف عند حالة عدم التعيين دون رفعها",
  },
  remedies: {
    exp_product_multiply: "عند ضرب قوتين لنفس الأساس نجمع الأسين: e² × e³ = e⁵ وليس e⁶.",
    exp_quotient_error: "عند القسمة نطرح أس المقام من أس البسط: e⁷ / e² = e⁵.",
    exp_power_add: "عند رفع قوة إلى قوة نضرب الأسين: (e²)³ = e⁶ وليس e⁵.",
    exp_sum_split: "الأسية تحوّل المجموع إلى جداء لا إلى مجموع: e^(a+b) = eᵃ × eᵇ.",
    exp_zero: "تذكّر أن e⁰ = 1، لذلك eᵘ = 1 تكافئ u = 0.",
    exp_sign_error: "عند نقل حد إلى الطرف الآخر تتغير إشارته؛ راجع كل خطوة نقل.",
    exp_solve_error: "عند حل ax = c نقسم الطرف الأيمن كله على a: x = c/a.",
    exp_ln_inverse: "الدالة العكسية لـ eˣ هي ln: من eᵘ = k (مع k > 0) نستنتج u = ln k.",
    exp_inequality_direction: "eˣ متزايدة فتحفظ الاتجاه، لكن القسمة على عدد سالب تقلبه.",
    exp_positive_ignored: "eᵘ موجب تماماً دائماً: eᵘ > −k محققة على ℝ و eᵘ < −k مستحيلة.",
    exp_forgot_inner: "(eᵘ)′ = u′·eᵘ: احسب مشتقة الأس واضربها في eᵘ.",
    exp_power_rule: "قاعدة (xⁿ)′ = nxⁿ⁻¹ خاصة بالقوى ذات الأس الثابت؛ أما (eˣ)′ = eˣ.",
    exp_derivative_exponent: "الأس لا يُشتق وحده: (eᵘ)′ = u′·eᵘ، فالمشتقة u′ تُضرب أمام eᵘ.",
    exp_product_rule_error: "مشتقة الجداء ليست جداء المشتقات: (uv)′ = u′v + uv′ بحدّين.",
    exp_limit_confusion: "ارسم منحنى eˣ: يقترب من 0 جهة −∞ ويصعد إلى +∞ جهة +∞.",
    exp_negative_values: "eˣ > 0 دائماً، فلا يمكن أن تؤول إلى −∞.",
    exp_growth_comparison: "في التزايد المقارن eˣ تتغلب على xⁿ: eˣ/xⁿ → +∞ و xⁿeˣ → 0 عند −∞.",
    exp_indeterminate: "حالة عدم التعيين ليست جواباً: ارفعها بالتحليل أو بالتزايد المقارن.",
  },
  bank: [],
  generators,
};

