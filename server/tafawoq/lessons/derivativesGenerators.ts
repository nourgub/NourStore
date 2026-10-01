// Parametric generators for "math-derivatives" (see ../generators/core.ts).
// This file is also the reference for how every lesson's generators are
// written: compute the answer, write the worked steps, and build each
// distractor by applying one named wrong rule.
import {
  frac,
  fracMonomial,
  join,
  linear,
  mul,
  num,
  paren,
  poly,
  sup,
  times,
  type Generator,
  type Rng,
} from "../generators/core";

/** Re-draws until `valid` holds — keeps generators free of degenerate cases. */
function draw<T>(rng: Rng, make: (rng: Rng) => T, valid: (value: T) => boolean): T {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = make(rng);
    if (valid(value)) return value;
  }
  throw new Error("generator could not find valid parameters");
}

const distinct = (...values: string[]) => new Set(values).size === values.length;

function monomial(a: number, n: number) {
  return poly([[n, a]]);
}

export const derivativeGenerators: Generator[] = [
  {
    id: "values-quadratic",
    skill: "function_values",
    difficulty: 1,
    generate: rng => {
      const a = rng.nonZero(-3, 4);
      const b = rng.int(-6, 6);
      const c = rng.int(-9, 9);
      const k = rng.nonZero(-3, 3);
      const f = poly([[2, a], [1, b], [0, c]]);
      const value = a * k * k + b * k + c;
      return {
        type: "short",
        prompt: `f(x) = ${f}. احسب f(${num(k)}).`,
        answer: num(value),
        steps: [
          `نعوّض x بـ ${num(k)} في عبارة الدالة`,
          `f(${num(k)}) = ${join(times(a, `${paren(num(k))}²`), b ? times(b, paren(num(k))) : "0", num(c))}`,
          `= ${join(num(a * k * k), num(b * k), num(c))} = ${num(value)}`,
        ],
      };
    },
  },
  {
    id: "meaning-slope",
    skill: "derivative_meaning",
    difficulty: 1,
    generate: rng => {
      const [k, value, slope] = draw(
        rng,
        r => [r.int(-4, 5), r.int(-6, 9), r.nonZero(-5, 6)] as const,
        ([k, v, m]) => distinct(num(m), num(v), num(k), num(m * k)) && m * k !== 0
      );
      return {
        type: "mcq",
        prompt: `دالة f تحقق f(${num(k)}) = ${num(value)} و f′(${num(k)}) = ${num(slope)}. ما ميل (معامل توجيه) المماس لمنحناها في النقطة ذات الفاصلة ${num(k)}؟`,
        answer: num(slope),
        distractors: [
          { option: num(value), misconception: "tangent_slope_confusion" },
          { option: num(k), misconception: "tangent_slope_confusion" },
          { option: num(slope * k), misconception: "tangent_formula_error" },
        ],
        steps: [`ميل المماس عند النقطة ذات الفاصلة ${num(k)} هو العدد المشتق f′(${num(k)})`, `إذن الميل = ${num(slope)}`],
      };
    },
  },
  {
    id: "power-basic",
    skill: "power_rule",
    difficulty: 1,
    generate: rng => {
      const a = rng.int(2, 9);
      const n = rng.int(2, 6);
      return {
        type: "mcq",
        prompt: `ما مشتقة الدالة f(x) = ${monomial(a, n)}؟`,
        answer: monomial(a * n, n - 1),
        distractors: [
          { option: monomial(a, n - 1), misconception: "power_no_coefficient" },
          { option: monomial(a * n, n), misconception: "power_no_decrement" },
          { option: fracMonomial(a, n + 1, n + 1), misconception: "derivative_primitive_confusion" },
        ],
        steps: [
          `(xⁿ)′ = n·xⁿ⁻¹، والمعامل ${a} يبقى مضروباً`,
          `f′(x) = ${a} × ${n} x${n - 1 === 1 ? "" : sup(n - 1)} = ${monomial(a * n, n - 1)}`,
        ],
      };
    },
  },
  {
    id: "power-short",
    skill: "power_rule",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-9, 9);
      const n = rng.int(3, 8);
      return {
        type: "short",
        prompt: `احسب مشتقة f(x) = ${monomial(a, n)}.`,
        answer: monomial(a * n, n - 1),
        steps: [`ننزل الأس ${n} ونضربه في ${num(a)}، ثم ننقص الأس بواحد`, `f′(x) = ${monomial(a * n, n - 1)}`],
      };
    },
  },
  {
    id: "power-negative",
    skill: "power_rule",
    difficulty: 3,
    generate: rng => {
      const a = rng.int(1, 6);
      const n = rng.int(2, 4);
      const xpow = (k: number) => (k === 1 ? "x" : `x${sup(k)}`);
      const coefficient = -a * n;
      return {
        type: "mcq",
        prompt: `f(x) = ${a}/${xpow(n)} (أي ${a === 1 ? "" : a}x${sup(-n)}). ما مشتقتها؟`,
        answer: `${num(coefficient)}/${xpow(n + 1)}`,
        distractors: [
          { option: `${num(-coefficient)}/${xpow(n + 1)}`, misconception: "power_sign_error" },
          { option: `${num(coefficient)}/${xpow(n)}`, misconception: "power_no_decrement" },
          { option: `${num(coefficient)}/${xpow(n - 1)}`, misconception: "power_sign_error" },
        ],
        steps: [
          `نكتب f(x) = ${a === 1 ? "" : a}x${sup(-n)}`,
          `f′(x) = ${a === 1 ? "" : `${a} × `}(${num(-n)}) x${sup(-n - 1)}`,
          `f′(x) = ${num(coefficient)}/${xpow(n + 1)}`,
        ],
      };
    },
  },
  {
    id: "constant-and-linear",
    skill: "linearity",
    difficulty: 1,
    generate: rng => {
      const [a, b] = draw(
        rng,
        r => [r.nonZero(-9, 9), r.nonZero(-9, 9)] as const,
        ([a, b]) => distinct(num(a), linear(a, 0), linear(a, b), num(a + b)) && a + b !== 0
      );
      return {
        type: "mcq",
        prompt: `f(x) = ${linear(a, b)}. ما هي f′(x)؟`,
        answer: num(a),
        distractors: [
          { option: num(a + b), misconception: "constant_derivative_nonzero" },
          { option: linear(a, 0), misconception: "power_no_decrement" },
          { option: linear(a, b), misconception: "no_differentiation" },
        ],
        steps: [`مشتقة ${linear(a, 0)} هي ${num(a)}`, `مشتقة الثابت ${num(b)} معدومة`, `f′(x) = ${num(a)}`],
      };
    },
  },
  {
    id: "polynomial",
    skill: "linearity",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-4, 5);
      const b = rng.int(-6, 6);
      const c = rng.int(-9, 9);
      const d = rng.int(-9, 9);
      const f = poly([[3, a], [2, b], [1, c], [0, d]]);
      const derivative = poly([[2, 3 * a], [1, 2 * b], [0, c]]);
      return {
        type: "short",
        prompt: `احسب مشتقة الدالة f(x) = ${f}.`,
        answer: derivative,
        steps: [
          "نشتق حداً بحد: مشتقة المجموع هي مجموع المشتقات ومشتقة الثابت معدومة",
          `(${monomial(a, 3)})′ = ${monomial(3 * a, 2)}${b ? ` ، (${monomial(b, 2)})′ = ${monomial(2 * b, 1)}` : ""}${c ? ` ، (${monomial(c, 1)})′ = ${num(c)}` : ""}`,
          `f′(x) = ${derivative}`,
        ],
      };
    },
  },
  {
    id: "product-linear",
    skill: "product_quotient",
    difficulty: 2,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.nonZero(-4, 4), r.nonZero(-6, 6), r.nonZero(-4, 4), r.nonZero(-6, 6)] as const,
        ([a, b, c, d]) =>
          a * d + b * c !== 0 &&
          distinct(
            linear(2 * a * c, a * d + b * c),
            num(a * c),
            linear(a * c, a * d),
            linear(a * c, b * c)
          )
      );
      const u = linear(a, b);
      const v = linear(c, d);
      const answer = linear(2 * a * c, a * d + b * c);
      return {
        type: "mcq",
        prompt: `f(x) = ${paren(u)}${paren(v)}. ما مشتقتها؟`,
        answer,
        distractors: [
          { option: num(a * c), misconception: "product_as_product_of_derivatives" },
          { option: linear(a * c, a * d), misconception: "product_forgot_term" },
          { option: linear(a * c, b * c), misconception: "product_forgot_term" },
        ],
        steps: [
          `u = ${u} و v = ${v}، إذن u′ = ${num(a)} و v′ = ${num(c)}`,
          `(u·v)′ = u′·v + u·v′ = ${join(mul(a, paren(v)), mul(c, paren(u)))}`,
          `f′(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "quotient-linear",
    skill: "product_quotient",
    difficulty: 3,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.nonZero(-4, 4), r.int(-6, 6), r.nonZero(-3, 3), r.nonZero(-6, 6)] as const,
        ([a, b, c, d]) => a * d - b * c !== 0 && frac(a, c) !== num(a * d - b * c)
      );
      const numerator = a * d - b * c;
      const v = linear(c, d);
      return {
        type: "mcq",
        prompt: `f(x) = ${paren(linear(a, b))}/${paren(v)}. ما مشتقتها؟`,
        answer: `${num(numerator)}/${paren(v)}²`,
        distractors: [
          { option: `${num(-numerator)}/${paren(v)}²`, misconception: "quotient_sign" },
          { option: `${num(numerator)}/${paren(v)}`, misconception: "quotient_denominator" },
          { option: frac(a, c), misconception: "product_as_product_of_derivatives" },
        ],
        steps: [
          `(u/v)′ = (u′·v − u·v′)/v² مع u′ = ${num(a)} و v′ = ${num(c)}`,
          `البسط: ${join(mul(a, paren(v)), mul(-c, paren(linear(a, b))))} = ${num(numerator)}`,
          `f′(x) = ${num(numerator)}/${paren(v)}²`,
        ],
      };
    },
  },
  {
    id: "chain-power",
    skill: "chain_rule",
    difficulty: 2,
    generate: rng => {
      const a = rng.int(2, 5);
      const b = rng.nonZero(-7, 7);
      const n = draw(rng, r => r.int(2, 5), value => value !== a);
      const inner = paren(linear(a, b));
      const pow = (k: number) => (k === 1 ? inner : `${inner}${sup(k)}`);
      return {
        type: "mcq",
        prompt: `f(x) = ${inner}${sup(n)}. ما مشتقتها؟`,
        answer: `${n * a}${pow(n - 1)}`,
        distractors: [
          { option: `${n}${pow(n - 1)}`, misconception: "chain_forgot_inner" },
          { option: `${n * a}${pow(n)}`, misconception: "power_no_decrement" },
          { option: `${a}${pow(n - 1)}`, misconception: "power_no_coefficient" },
        ],
        steps: [
          `الدالة الداخلية u = ${linear(a, b)} ومشتقتها u′ = ${a}`,
          `(uⁿ)′ = n·u′·uⁿ⁻¹ = ${n} × ${a} × ${pow(n - 1)}`,
          `f′(x) = ${n * a}${pow(n - 1)}`,
        ],
      };
    },
  },
  {
    id: "chain-sqrt",
    skill: "chain_rule",
    difficulty: 3,
    generate: rng => {
      const a = rng.int(2, 9);
      const b = rng.int(1, 9);
      const inner = linear(a, b);
      return {
        type: "short",
        prompt: `احسب مشتقة f(x) = √(${inner}).`,
        answer: `${a}/(2√(${inner}))`,
        steps: [`(√u)′ = u′/(2√u) مع u = ${inner} و u′ = ${a}`, `f′(x) = ${a}/(2√(${inner}))`],
      };
    },
  },
  {
    id: "tangent-short",
    skill: "tangent_line",
    difficulty: 2,
    generate: rng => {
      const [b, c, x0] = draw(
        rng,
        r => [r.int(-5, 5), r.int(-6, 6), r.nonZero(-3, 3)] as const,
        ([b, , x0]) => 2 * x0 + b !== 0
      );
      const f0 = x0 * x0 + b * x0 + c;
      const m = 2 * x0 + b;
      return {
        type: "short",
        prompt: `f(x) = ${poly([[2, 1], [1, b], [0, c]])}. اكتب معادلة المماس لمنحناها في النقطة ذات الفاصلة ${num(x0)} على الشكل y = ax + b.`,
        answer: `y = ${linear(m, f0 - m * x0)}`,
        steps: [
          `f(${num(x0)}) = ${num(f0)}`,
          `f′(x) = ${linear(2, b)} إذن f′(${num(x0)}) = ${num(m)}`,
          `y = f′(${num(x0)})(x − ${paren(num(x0))}) + f(${num(x0)}) = ${join(mul(m, `(${linear(1, -x0)})`), num(f0))}`,
          `y = ${linear(m, f0 - m * x0)}`,
        ],
      };
    },
  },
  {
    id: "tangent-mcq",
    skill: "tangent_line",
    difficulty: 3,
    generate: rng => {
      const [b, c, x0] = draw(
        rng,
        r => [r.int(-4, 4), r.int(-5, 5), r.nonZero(-3, 3)] as const,
        ([b, c, x0]) => {
          const f0 = x0 * x0 + b * x0 + c;
          const m = 2 * x0 + b;
          return (
            m !== 0 &&
            f0 !== 0 &&
            distinct(
              linear(m, f0 - m * x0),
              linear(f0, m - f0 * x0),
              linear(m, f0 + m * x0),
              linear(m, f0)
            )
          );
        }
      );
      const f0 = x0 * x0 + b * x0 + c;
      const m = 2 * x0 + b;
      return {
        type: "mcq",
        prompt: `f(x) = ${poly([[2, 1], [1, b], [0, c]])}. ما معادلة المماس لمنحناها في النقطة ذات الفاصلة ${num(x0)}؟`,
        answer: `y = ${linear(m, f0 - m * x0)}`,
        distractors: [
          { option: `y = ${linear(f0, m - f0 * x0)}`, misconception: "tangent_slope_confusion" },
          { option: `y = ${linear(m, f0 + m * x0)}`, misconception: "tangent_formula_error" },
          { option: `y = ${linear(m, f0)}`, misconception: "tangent_formula_error" },
        ],
        steps: [
          `f(${num(x0)}) = ${num(f0)} و f′(${num(x0)}) = ${num(m)}`,
          `y = ${join(mul(m, `(${linear(1, -x0)})`), num(f0))}`,
          `y = ${linear(m, f0 - m * x0)}`,
        ],
      };
    },
  },
  {
    id: "variations-quadratic",
    skill: "variations",
    difficulty: 2,
    generate: rng => {
      const h = rng.nonZero(-5, 5);
      const c = rng.int(-6, 6);
      const b = -2 * h;
      const up = rng.chance(0.5);
      const at = num(h);
      const opposite = num(-h);
      return {
        type: "mcq",
        prompt: `f(x) = ${poly([[2, 1], [1, b], [0, c]])}. على أي مجال تكون f ${up ? "متزايدة" : "متناقصة"}؟`,
        answer: up ? `[${at} ; +∞[` : `]−∞ ; ${at}]`,
        distractors: [
          { option: up ? `]−∞ ; ${at}]` : `[${at} ; +∞[`, misconception: "sign_variation_confusion" },
          { option: up ? `[${opposite} ; +∞[` : `]−∞ ; ${opposite}]`, misconception: "function_eval_error" },
          { option: "ℝ", misconception: "sign_variation_confusion" },
        ],
        steps: [
          `f′(x) = ${linear(2, b)} = 2(x ${h < 0 ? "+" : "−"} ${Math.abs(h)})`,
          `f′(x) ≥ 0 ⟺ x ≥ ${at}`,
          `f متزايدة على [${at} ; +∞[ ومتناقصة على ]−∞ ; ${at}]`,
        ],
      };
    },
  },
];
