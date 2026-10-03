// BAC lesson "math-integrals" — الدوال الأصلية والحساب التكاملي.
// Skill graph + misconceptions + parametric generators (see
// ./derivativesGenerators.ts for the pattern every generator follows:
// compute the answer, write the worked steps, and build each distractor
// by applying one named wrong rule).
import type { Lesson } from "../curriculum";
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
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const value = make(rng);
    if (valid(value)) return value;
  }
  throw new Error("generator could not find valid parameters");
}

const distinct = (...values: string[]) => new Set(values).size === values.length;

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "-": "₋",
};

function sub(value: number): string {
  return String(value)
    .split("")
    .map(char => SUBSCRIPTS[char] ?? char)
    .join("");
}

/** ∫ₐᵇ */
function intg(a: number, b: number): string {
  return `∫${sub(a)}${sup(b)}`;
}

/** (p/q)·x^power, or "0" when p = 0 (so join() drops it). */
function term(p: number, q: number, power: number): string {
  return p === 0 ? "0" : fracMonomial(p, q, power);
}

/** Coefficient written in front of a function: "", "−", "3", "(3/2)". */
function coef(p: number, q = 1): string {
  const c = frac(p, q);
  if (c === "1") return "";
  if (c === "−1") return "−";
  return c.includes("/") ? `(${c})` : c;
}

/** "x − y" for already-formatted numbers, never writing "− 0". */
function minus(x: string, y: string): string {
  if (y === "0") return x;
  return `${x} − ${y.startsWith("−") ? `(${y})` : y}`;
}

/** Power of a parenthesised base, without a "¹" exponent. */
function pow(base: string, n: number): string {
  return n === 1 ? base : `${base}${sup(n)}`;
}

const generators: Generator[] = [
  // --- primitive_polynomial -------------------------------------------------
  {
    id: "primitive-power",
    skill: "primitive_polynomial",
    difficulty: 1,
    generate: rng => {
      const a = rng.int(2, 9);
      const n = rng.int(2, 6);
      const answer = fracMonomial(a, n + 1, n + 1);
      return {
        type: "mcq",
        prompt: `ما هي دالة أصلية للدالة f(x) = ${poly([[n, a]])} على ℝ؟`,
        answer,
        distractors: [
          { option: poly([[n + 1, a]]), misconception: "primitive_no_divide" },
          { option: poly([[n - 1, a * n]]), misconception: "integrate_differentiate" },
          { option: fracMonomial(a, n + 1, n), misconception: "primitive_no_increment" },
        ],
        steps: [
          "أصلية xⁿ هي xⁿ⁺¹/(n + 1): نرفع الأس بواحد ثم نقسم على الأس الجديد",
          `F(x) = ${a} × x${sup(n + 1)}/${n + 1} = ${answer}`,
          `تحقق: F′(x) = ${poly([[n, a]])} = f(x)`,
        ],
      };
    },
  },
  {
    id: "primitive-polynomial",
    skill: "primitive_polynomial",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-3, 3);
      const b = rng.int(-4, 4);
      const c = rng.nonZero(-6, 6);
      const f = poly([[2, 3 * a], [1, 2 * b], [0, c]]);
      const answer = poly([[3, a], [2, b], [1, c]]);
      return {
        type: "mcq",
        prompt: `ما هي دالة أصلية للدالة f(x) = ${f} على ℝ؟`,
        answer,
        distractors: [
          { option: poly([[1, 6 * a], [0, 2 * b]]), misconception: "integrate_differentiate" },
          { option: poly([[3, 3 * a], [2, 2 * b], [1, c]]), misconception: "primitive_no_divide" },
          { option: poly([[3, a], [2, b], [0, c]]), misconception: "constant_primitive_error" },
        ],
        steps: [
          "نبحث عن أصلية كل حد: أصلية k·xⁿ هي k·xⁿ⁺¹/(n + 1) وأصلية الثابت k هي kx",
          `أصلية ${poly([[2, 3 * a]])} هي ${poly([[3, a]])}${b ? ` ، أصلية ${poly([[1, 2 * b]])} هي ${poly([[2, b]])}` : ""} ، أصلية ${num(c)} هي ${poly([[1, c]])}`,
          `F(x) = ${answer}`,
        ],
      };
    },
  },

  // --- primitive_condition --------------------------------------------------
  {
    id: "primitive-condition-mcq",
    skill: "primitive_condition",
    difficulty: 1,
    generate: rng => {
      const [a, c, x0, y0] = draw(
        rng,
        r => [r.nonZero(-3, 3), r.int(-5, 5), r.int(1, 3), r.nonZero(-6, 6)] as const,
        ([a, c, x0, y0]) => {
          const F0 = a * x0 * x0 + c * x0;
          return F0 !== 0 && y0 - F0 !== 0 && y0 + F0 !== 0;
        }
      );
      const F0x0 = a * x0 * x0 + c * x0;
      const C = y0 - F0x0;
      const base = (k: number) => poly([[2, a], [1, c], [0, k]]);
      return {
        type: "mcq",
        prompt: `f(x) = ${linear(2 * a, c)}. ما هي الدالة الأصلية F للدالة f على ℝ التي تحقق F(${x0}) = ${num(y0)}؟`,
        answer: base(C),
        distractors: [
          { option: base(0), misconception: "forgot_constant_condition" },
          { option: base(y0), misconception: "constant_condition_error" },
          { option: base(y0 + F0x0), misconception: "constant_condition_error" },
        ],
        steps: [
          `الدوال الأصلية لـ f على ℝ هي F(x) = ${join(poly([[2, a], [1, c]]), "C")} حيث C ثابت حقيقي`,
          `F(${x0}) = ${join(num(F0x0), "C")} = ${num(y0)}`,
          `إذن C = ${minus(num(y0), num(F0x0))} = ${num(C)}`,
          `F(x) = ${base(C)}`,
        ],
      };
    },
  },
  {
    id: "primitive-condition-short",
    skill: "primitive_condition",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-3, 3);
      const b = rng.int(-4, 4);
      const c = rng.int(-6, 6);
      const x0 = rng.int(-2, 2);
      const y0 = rng.int(-8, 8);
      const F0x0 = a * x0 ** 3 + b * x0 ** 2 + c * x0;
      const C = y0 - F0x0;
      const f = poly([[2, 3 * a], [1, 2 * b], [0, c]]);
      const F0 = poly([[3, a], [2, b], [1, c]]);
      const answer = poly([[3, a], [2, b], [1, c], [0, C]]);
      return {
        type: "short",
        prompt: `f(x) = ${f}. عيّن الدالة الأصلية F للدالة f على ℝ التي تحقق F(${num(x0)}) = ${num(y0)}.`,
        answer,
        steps: [
          `الدوال الأصلية لـ f على ℝ هي F(x) = ${join(F0, "C")} حيث C ثابت حقيقي`,
          `F(${num(x0)}) = ${join(num(F0x0), "C")} = ${num(y0)}`,
          `إذن C = ${minus(num(y0), num(F0x0))} = ${num(C)}`,
          `F(x) = ${answer}`,
        ],
      };
    },
  },

  // --- primitive_composite --------------------------------------------------
  {
    id: "composite-linear-power",
    skill: "primitive_composite",
    difficulty: 2,
    generate: rng => {
      const [a, b, n] = draw(
        rng,
        r => [r.int(2, 4), r.nonZero(-5, 5), r.int(2, 4)] as const,
        ([a, , n]) => a !== n + 1
      );
      const inner = paren(linear(a, b));
      const answer = `${pow(inner, n + 1)}/${a * (n + 1)}`;
      return {
        type: "mcq",
        prompt: `ما هي دالة أصلية للدالة f(x) = ${pow(inner, n)} على ℝ؟`,
        answer,
        distractors: [
          { option: `${pow(inner, n + 1)}/${n + 1}`, misconception: "forgot_u_prime_factor" },
          { option: `${a * n}${pow(inner, n - 1)}`, misconception: "integrate_differentiate" },
          { option: `${pow(inner, n + 1)}/${a}`, misconception: "primitive_no_divide" },
        ],
        steps: [
          `نضع u(x) = ${linear(a, b)} إذن u′(x) = ${a}، ومنه f = (1/${a})·u′·u${sup(n)}`,
          `أصلية u′·uⁿ هي uⁿ⁺¹/(n + 1)، إذن F(x) = (1/${a}) × ${pow(inner, n + 1)}/${n + 1}`,
          `F(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "composite-uprime-un",
    skill: "primitive_composite",
    difficulty: 3,
    generate: rng => {
      const m = rng.int(1, 3);
      const b = rng.int(1, 6);
      const n = rng.int(2, 4);
      const inner = `(x² + ${b})`;
      const answer = `${coef(m, n + 1)}${pow(inner, n + 1)}`;
      return {
        type: "mcq",
        prompt: `ما هي دالة أصلية للدالة f(x) = ${mul(2 * m, "x")}${pow(inner, n)} على ℝ؟`,
        answer,
        distractors: [
          { option: `${coef(2 * m, n + 1)}${pow(inner, n + 1)}`, misconception: "forgot_u_prime_factor" },
          { option: `${coef(m)}${pow(inner, n + 1)}`, misconception: "primitive_no_divide" },
          { option: `${coef(m, n + 1)}x²${pow(inner, n + 1)}`, misconception: "primitive_of_product" },
        ],
        steps: [
          `نضع u(x) = x² + ${b} إذن u′(x) = 2x، ومنه f = ${m === 1 ? "" : `${m}·`}u′·u${sup(n)}`,
          `أصلية u′·uⁿ هي uⁿ⁺¹/(n + 1)`,
          `F(x) = ${m === 1 ? "" : `${m} × `}${pow(inner, n + 1)}/${n + 1} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "composite-exp",
    skill: "primitive_composite",
    difficulty: 2,
    generate: rng => {
      const a = rng.pick([-3, -2, 2, 3, 4]);
      const b = rng.int(-4, 4);
      const k = rng.nonZero(-6, 6);
      const e = `e^(${linear(a, b)})`;
      const answer = `${coef(k, a)}${e}`;
      return {
        type: "mcq",
        prompt: `ما هي دالة أصلية للدالة f(x) = ${coef(k)}${e} على ℝ؟`,
        answer,
        distractors: [
          { option: `${coef(k)}${e}`, misconception: "forgot_u_prime_factor" },
          { option: `${coef(k * a)}${e}`, misconception: "integrate_differentiate" },
          {
            option: `${coef(k)}e^(${linear(a, b + 1)})/(${linear(a, b + 1)})`,
            misconception: "exp_as_power",
          },
        ],
        steps: [
          `نضع u(x) = ${linear(a, b)} إذن u′(x) = ${num(a)}، وأصلية u′·e^u هي e^u`,
          `f(x) = ${coef(k, a)}·u′(x)·e^(u(x)) لأن ${frac(k, a)} × ${paren(num(a))} = ${num(k)}`,
          `F(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "composite-log-negative",
    skill: "primitive_composite",
    difficulty: 3,
    generate: rng => {
      const a = rng.int(2, 4);
      const r = rng.nonZero(-4, 5);
      const k = rng.nonZero(-6, 6);
      const b = -a * r;
      const u = linear(a, b);
      const minusU = join(num(-b), mul(-a, "x"));
      const answer = `${coef(k, a)}ln(${minusU})`;
      return {
        type: "mcq",
        prompt: `f(x) = ${num(k)}/(${u}) على المجال ]−∞ ; ${num(r)}[. ما هي دالة أصلية لـ f على هذا المجال؟`,
        answer,
        distractors: [
          { option: `${coef(k, a)}ln(${u})`, misconception: "ln_no_abs" },
          { option: `${coef(k)}ln(${minusU})`, misconception: "forgot_u_prime_factor" },
          { option: `${num(-k * a)}/(${u})²`, misconception: "integrate_differentiate" },
        ],
        steps: [
          `نضع u(x) = ${u} إذن u′(x) = ${a}، ومنه f = ${frac(k, a)} × u′/u`,
          `أصلية u′/u هي ln|u|، وعلى المجال ]−∞ ; ${num(r)}[ لدينا u(x) < 0 إذن |u(x)| = ${minusU}`,
          `F(x) = ${answer}`,
        ],
      };
    },
  },

  // --- definite_integral ----------------------------------------------------
  {
    id: "definite-linear-mcq",
    skill: "definite_integral",
    difficulty: 1,
    generate: rng => {
      const [p, c, a, b] = draw(
        rng,
        r => {
          const a = r.int(-2, 2);
          return [r.nonZero(-3, 3), r.int(-5, 5), a, a + r.int(1, 3)] as const;
        },
        ([p, c, a, b]) => {
          const F = (x: number) => p * x * x + c * x;
          const I = F(b) - F(a);
          return I !== 0 && F(a) !== 0 && distinct(num(I), num(-I), num(F(b)), num(2 * p * (b - a)));
        }
      );
      const F = (x: number) => p * x * x + c * x;
      const I = F(b) - F(a);
      return {
        type: "mcq",
        prompt: `احسب التكامل ${intg(a, b)} (${linear(2 * p, c)}) dx.`,
        answer: num(I),
        distractors: [
          { option: num(-I), misconception: "bounds_reversed" },
          { option: num(F(b)), misconception: "lower_bound_ignored" },
          { option: num(2 * p * (b - a)), misconception: "integrate_differentiate" },
        ],
        steps: [
          `دالة أصلية لـ f هي F(x) = ${poly([[2, p], [1, c]])}`,
          `${intg(a, b)} f(x) dx = F(${num(b)}) − F(${num(a)})`,
          `= ${minus(num(F(b)), num(F(a)))} = ${num(I)}`,
        ],
      };
    },
  },
  {
    id: "definite-quadratic-short",
    skill: "definite_integral",
    difficulty: 2,
    generate: rng => {
      const [p, q, r, a, b] = draw(
        rng,
        g => {
          const a = g.int(-2, 1);
          return [g.int(-3, 3), g.int(-4, 4), g.int(-5, 5), a, a + g.int(1, 3)] as const;
        },
        ([p, q]) => p !== 0 || q !== 0
      );
      const F6 = (x: number) => 2 * p * x ** 3 + 3 * q * x ** 2 + 6 * r * x;
      const I = frac(F6(b) - F6(a), 6);
      const Fstr = join(term(p, 3, 3), term(q, 2, 2), term(r, 1, 1));
      return {
        type: "short",
        prompt: `احسب التكامل ${intg(a, b)} (${poly([[2, p], [1, q], [0, r]])}) dx.`,
        answer: I,
        steps: [
          `دالة أصلية لـ f هي F(x) = ${Fstr}`,
          `${intg(a, b)} f(x) dx = F(${num(b)}) − F(${num(a)})`,
          `= ${minus(frac(F6(b), 6), frac(F6(a), 6))} = ${I}`,
        ],
      };
    },
  },
  {
    id: "linearity-short",
    skill: "definite_integral",
    difficulty: 1,
    generate: rng => {
      const a = rng.int(-2, 2);
      const b = a + rng.int(1, 4);
      const A = rng.nonZero(-9, 9);
      const B = rng.nonZero(-9, 9);
      const alpha = rng.nonZero(-4, 4);
      const beta = rng.nonZero(-4, 4);
      const answer = num(alpha * A + beta * B);
      return {
        type: "short",
        prompt: `f و g دالتان مستمرتان على [${num(a)} ; ${num(b)}] حيث ${intg(a, b)} f(x) dx = ${num(A)} و ${intg(a, b)} g(x) dx = ${num(B)}. احسب ${intg(a, b)} (${join(mul(alpha, "f(x)"), mul(beta, "g(x)"))}) dx.`,
        answer,
        steps: [
          `حسب خاصية الخطية: ${intg(a, b)} (${join(mul(alpha, "f(x)"), mul(beta, "g(x)"))}) dx = ${join(mul(alpha, `${intg(a, b)} f(x) dx`), mul(beta, `${intg(a, b)} g(x) dx`))}`,
          `= ${join(times(alpha, paren(num(A))), times(beta, paren(num(B))))}`,
          `= ${answer}`,
        ],
      };
    },
  },
  {
    id: "chasles-mcq",
    skill: "definite_integral",
    difficulty: 2,
    generate: rng => {
      const [a, b, c, A, C] = draw(
        rng,
        r => {
          const a = r.int(-2, 1);
          const b = a + r.int(1, 2);
          return [a, b, b + r.int(1, 2), r.nonZero(-8, 8), r.nonZero(-8, 8)] as const;
        },
        ([, , , A, C]) => distinct(num(C - A), num(C + A), num(A - C), num(C))
      );
      return {
        type: "mcq",
        prompt: `f دالة مستمرة على [${num(a)} ; ${num(c)}] حيث ${intg(a, b)} f(x) dx = ${num(A)} و ${intg(a, c)} f(x) dx = ${num(C)}. ما قيمة ${intg(b, c)} f(x) dx؟`,
        answer: num(C - A),
        distractors: [
          { option: num(C + A), misconception: "chasles_error" },
          { option: num(A - C), misconception: "bounds_reversed" },
          { option: num(C), misconception: "chasles_error" },
        ],
        steps: [
          `حسب علاقة شال: ${intg(a, c)} f(x) dx = ${intg(a, b)} f(x) dx + ${intg(b, c)} f(x) dx`,
          `إذن ${intg(b, c)} f(x) dx = ${intg(a, c)} f(x) dx − ${intg(a, b)} f(x) dx`,
          `= ${minus(num(C), num(A))} = ${num(C - A)}`,
        ],
      };
    },
  },

  // --- area -------------------------------------------------------------------
  {
    id: "area-linear-short",
    skill: "area",
    difficulty: 1,
    generate: rng => {
      const p = rng.int(-2, 2);
      const q = p + rng.int(1, 4);
      const m = rng.nonZero(-3, 3);
      const n = Math.max(-m * p, -m * q) + rng.int(0, 4);
      const f = (x: number) => m * x + n;
      const F2 = (x: number) => m * x * x + 2 * n * x;
      const area = frac(F2(q) - F2(p), 2);
      return {
        type: "short",
        prompt: `f(x) = ${linear(m, n)}. احسب بوحدة المساحة مساحة الحيز المستوي المحدد بمنحنى f ومحور الفواصل والمستقيمين اللذين معادلتاهما x = ${num(p)} و x = ${num(q)}.`,
        answer: area,
        steps: [
          `f دالة تآلفية و f(${num(p)}) = ${num(f(p))} ، f(${num(q)}) = ${num(f(q))}، إذن f(x) ≥ 0 على [${num(p)} ; ${num(q)}]`,
          `المساحة A = ${intg(p, q)} f(x) dx ودالة أصلية لـ f هي F(x) = ${join(term(m, 2, 2), term(n, 1, 1))}`,
          `A = F(${num(q)}) − F(${num(p)}) = ${minus(frac(F2(q), 2), frac(F2(p), 2))} = ${area} u.a`,
        ],
      };
    },
  },
  {
    id: "area-quadratic-short",
    skill: "area",
    difficulty: 2,
    generate: rng => {
      const p = rng.int(1, 3);
      const r = rng.int(0, 5);
      const a = rng.int(-2, 1);
      const b = a + rng.int(1, 3);
      const F3 = (x: number) => p * x ** 3 + 3 * r * x;
      const area = frac(F3(b) - F3(a), 3);
      return {
        type: "short",
        prompt: `f(x) = ${poly([[2, p], [0, r]])}. احسب بوحدة المساحة مساحة الحيز المستوي المحدد بمنحنى f ومحور الفواصل والمستقيمين اللذين معادلتاهما x = ${num(a)} و x = ${num(b)}.`,
        answer: area,
        steps: [
          `f(x) ≥ 0 على ℝ لأن ${poly([[2, p]])} ≥ 0${r ? ` و ${r} > 0` : ""}، إذن A = ${intg(a, b)} f(x) dx`,
          `دالة أصلية لـ f هي F(x) = ${join(term(p, 3, 3), term(r, 1, 1))}`,
          `A = F(${num(b)}) − F(${num(a)}) = ${minus(frac(F3(b), 3), frac(F3(a), 3))} = ${area} u.a`,
        ],
      };
    },
  },
  {
    id: "area-negative-mcq",
    skill: "area",
    difficulty: 2,
    generate: rng => {
      const [p, r, a, b] = draw(
        rng,
        g => {
          const a = g.int(-2, 1);
          return [g.int(1, 3), g.int(0, 4), a, a + g.int(1, 3)] as const;
        },
        ([p, r, a, b]) => {
          const P = frac(p * (b ** 3 - a ** 3) + 3 * r * (b - a), 3);
          const raw = num(p * (b ** 3 - a ** 3) + r * (b - a));
          return distinct(P, P.startsWith("−") ? P : `−${P}`, raw, num(-2 * p * (b - a)));
        }
      );
      const G3 = (x: number) => p * x ** 3 + 3 * r * x;
      const area = frac(G3(b) - G3(a), 3);
      return {
        type: "mcq",
        prompt: `f(x) = ${poly([[2, -p], [0, -r]])}. ما مساحة الحيز المستوي المحدد بمنحنى f ومحور الفواصل والمستقيمين x = ${num(a)} و x = ${num(b)}؟`,
        answer: `${area} u.a`,
        distractors: [
          { option: `−${area} u.a`, misconception: "negative_area" },
          { option: `${num(p * (b ** 3 - a ** 3) + r * (b - a))} u.a`, misconception: "primitive_no_divide" },
          { option: `${num(-2 * p * (b - a))} u.a`, misconception: "integrate_differentiate" },
        ],
        steps: [
          `f(x) = −(${poly([[2, p], [0, r]])}) ≤ 0 على [${num(a)} ; ${num(b)}]، إذن المساحة A = −${intg(a, b)} f(x) dx`,
          `A = ${intg(a, b)} (${poly([[2, p], [0, r]])}) dx ودالة أصلية للدالة ${poly([[2, p], [0, r]])} هي ${join(term(p, 3, 3), term(r, 1, 1))}`,
          `A = ${minus(frac(G3(b), 3), frac(G3(a), 3))} = ${area} u.a (المساحة موجبة دائماً)`,
        ],
      };
    },
  },

  // --- mean_value -------------------------------------------------------------
  {
    id: "mean-value-short",
    skill: "mean_value",
    difficulty: 2,
    generate: rng => {
      const p = rng.nonZero(-2, 3);
      const q = rng.int(-4, 4);
      const r = rng.int(-5, 5);
      const a = rng.int(-1, 2);
      const b = a + rng.int(1, 3);
      const F6 = (x: number) => 2 * p * x ** 3 + 3 * q * x ** 2 + 6 * r * x;
      const I6 = F6(b) - F6(a);
      const answer = frac(I6, 6 * (b - a));
      return {
        type: "short",
        prompt: `f(x) = ${poly([[2, p], [1, q], [0, r]])}. احسب القيمة المتوسطة μ للدالة f على المجال [${num(a)} ; ${num(b)}].`,
        answer,
        steps: [
          `μ = (1/(b − a)) × ${intg(a, b)} f(x) dx مع b − a = ${b - a}`,
          `دالة أصلية لـ f هي F(x) = ${join(term(p, 3, 3), term(q, 2, 2), term(r, 1, 1))}، و ${intg(a, b)} f(x) dx = ${minus(frac(F6(b), 6), frac(F6(a), 6))} = ${frac(I6, 6)}`,
          `μ = ${paren(frac(I6, 6))} ÷ ${b - a} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "mean-value-mcq",
    skill: "mean_value",
    difficulty: 3,
    generate: rng => {
      const [p, r, a, b] = draw(
        rng,
        g => {
          const a = g.int(1, 3);
          return [g.nonZero(-3, 3), g.int(-5, 5), a, a + g.int(2, 3)] as const;
        },
        ([p, r, a, b]) => {
          const I3 = p * (b ** 3 - a ** 3) + 3 * r * (b - a);
          return distinct(
            frac(I3, 3 * (b - a)),
            frac(I3, 3),
            frac(p * (a * a + b * b) + 2 * r, 2),
            frac(I3, 3 * (a + b))
          );
        }
      );
      const I3 = p * (b ** 3 - a ** 3) + 3 * r * (b - a);
      const answer = frac(I3, 3 * (b - a));
      const f = (x: number) => p * x * x + r;
      return {
        type: "mcq",
        prompt: `f(x) = ${poly([[2, p], [0, r]])}. ما القيمة المتوسطة للدالة f على المجال [${num(a)} ; ${num(b)}]؟`,
        answer,
        distractors: [
          { option: frac(I3, 3), misconception: "mean_forgot_divide" },
          { option: frac(p * (a * a + b * b) + 2 * r, 2), misconception: "mean_average_endpoints" },
          { option: frac(I3, 3 * (a + b)), misconception: "mean_wrong_length" },
        ],
        steps: [
          `دالة أصلية لـ f هي F(x) = ${join(term(p, 3, 3), term(r, 1, 1))}`,
          `${intg(a, b)} f(x) dx = F(${b}) − F(${a}) = ${frac(I3, 3)}`,
          `μ = (1/(${b} − ${a})) × ${paren(frac(I3, 3))} = ${answer}`,
          `لاحظ أن μ ≠ (f(${a}) + f(${b}))/2 = ${frac(f(a) + f(b), 2)} لأن f ليست تآلفية`,
        ],
      };
    },
  },
];

export const integralsLesson: Lesson = {
  key: "math-integrals",
  curriculum: "dz",
  subject: "math",
  title: "الدوال الأصلية والحساب التكاملي",
  levels: ["bac"],
  skills: [
    {
      key: "primitive_polynomial",
      name: "الدوال الأصلية لكثيرات الحدود",
      prerequisites: [],
      explanation:
        "نقول إن F دالة أصلية للدالة f على مجال I إذا كانت F′(x) = f(x) من أجل كل x من I. أصلية xⁿ هي xⁿ⁺¹/(n + 1): نرفع الأس بواحد ثم نقسم على الأس الجديد، وأصلية الثابت k هي kx. لكثير الحدود نبحث عن أصلية كل حد على حدة.",
      example: {
        problem: "عيّن دالة أصلية للدالة f(x) = 6x² − 4x + 3 على ℝ.",
        steps: ["أصلية 6x² هي 6 × x³/3 = 2x³", "أصلية −4x هي −4 × x²/2 = −2x²", "أصلية 3 هي 3x"],
        answer: "F(x) = 2x³ − 2x² + 3x",
      },
    },
    {
      key: "primitive_condition",
      name: "الدالة الأصلية التي تحقق شرطاً",
      prerequisites: ["primitive_polynomial"],
      explanation:
        "إذا كانت F دالة أصلية لـ f فإن كل الدوال الأصلية لـ f هي F(x) + C حيث C ثابت حقيقي. توجد دالة أصلية وحيدة تحقق شرطاً من الشكل F(x₀) = y₀: نعوّض x بـ x₀ ثم نستخرج قيمة C.",
      example: {
        problem: "عيّن الدالة الأصلية F للدالة f(x) = 2x + 1 التي تحقق F(1) = 5.",
        steps: ["F(x) = x² + x + C", "F(1) = 1 + 1 + C = 2 + C = 5", "إذن C = 3"],
        answer: "F(x) = x² + x + 3",
      },
    },
    {
      key: "primitive_composite",
      name: "أصليات الدوال المركبة: u′uⁿ و u′/u و u′eᵘ",
      prerequisites: ["primitive_polynomial"],
      explanation:
        "نتعرف على الشكل u′·g(u) ونتأكد من وجود u′ كاملة: أصلية u′·uⁿ هي uⁿ⁺¹/(n + 1)، وأصلية u′/u هي ln|u|، وأصلية u′·eᵘ هي eᵘ. إذا نقص معامل نعدّل بضرب وقسمة، مثلاً (2x + 1)³ = (1/2)·2·(2x + 1)³.",
      example: {
        problem: "عيّن دالة أصلية للدالة f(x) = e^(3x − 1) على ℝ.",
        steps: ["u(x) = 3x − 1 و u′(x) = 3", "f(x) = (1/3)·u′(x)·e^(u(x))", "أصلية u′eᵘ هي eᵘ"],
        answer: "F(x) = (1/3)e^(3x − 1)",
      },
    },
    {
      key: "definite_integral",
      name: "حساب التكامل وخواصه",
      prerequisites: ["primitive_polynomial"],
      explanation:
        "إذا كانت F دالة أصلية لـ f على [a ; b] فإن ∫ₐᵇ f(x) dx = F(b) − F(a): الحد العلوي أولاً ثم نطرح قيمة الحد السفلي. التكامل خطي: ∫(αf + βg) = α∫f + β∫g، ويحقق علاقة شال: ∫ₐᶜ f = ∫ₐᵇ f + ∫ᵦᶜ f.",
      example: {
        problem: "احسب ∫₁³ (2x + 1) dx.",
        steps: ["دالة أصلية: F(x) = x² + x", "F(3) = 12 و F(1) = 2", "12 − 2 = 10"],
        answer: "10",
      },
    },
    {
      key: "area",
      name: "حساب المساحات",
      prerequisites: ["definite_integral"],
      explanation:
        "إذا كانت f مستمرة وموجبة على [a ; b] فإن مساحة الحيز المحدد بمنحناها ومحور الفواصل والمستقيمين x = a و x = b هي ∫ₐᵇ f(x) dx بوحدة المساحة. وإذا كانت f ≤ 0 فالمساحة هي −∫ₐᵇ f(x) dx، لأن المساحة عدد موجب دائماً. لذا ندرس إشارة f أولاً.",
      example: {
        problem: "احسب مساحة الحيز المحدد بمنحنى f(x) = x² ومحور الفواصل والمستقيمين x = 0 و x = 3.",
        steps: ["f(x) = x² ≥ 0 على [0 ; 3]", "A = ∫₀³ x² dx = [x³/3]₀³", "= 27/3 = 9"],
        answer: "A = 9 u.a",
      },
    },
    {
      key: "mean_value",
      name: "القيمة المتوسطة لدالة",
      prerequisites: ["definite_integral"],
      explanation:
        "القيمة المتوسطة للدالة f على المجال [a ; b] (حيث a < b) هي μ = (1/(b − a)) × ∫ₐᵇ f(x) dx. نحسب التكامل أولاً ثم نقسم على طول المجال b − a، ولا نكتفي بمتوسط f(a) و f(b).",
      example: {
        problem: "احسب القيمة المتوسطة للدالة f(x) = x² على [0 ; 3].",
        steps: ["∫₀³ x² dx = 9", "b − a = 3", "μ = 9 ÷ 3"],
        answer: "μ = 3",
      },
    },
  ],
  misconceptions: {
    integrate_differentiate: "الاشتقاق بدل البحث عن دالة أصلية",
    primitive_no_divide: "نسيان القسمة على n + 1 عند حساب أصلية xⁿ",
    primitive_no_increment: "نسيان رفع الأس بواحد عند حساب أصلية xⁿ",
    constant_primitive_error: "اعتبار أصلية الثابت k هي k بدل kx",
    forgot_constant_condition: "إهمال الثابت C وعدم استعمال الشرط F(x₀) = y₀",
    constant_condition_error: "خطأ في استخراج الثابت C من الشرط F(x₀) = y₀",
    forgot_u_prime_factor: "خطأ في معامل u′ عند حساب أصلية دالة مركبة",
    primitive_of_product: "حساب أصلية جداء كجداء أصليتين",
    exp_as_power: "معاملة eᵘ كأنها قوة (رفع الأس والقسمة عليه)",
    ln_no_abs: "كتابة ln u بدل ln|u| دون مراعاة إشارة u",
    bounds_reversed: "حساب F(a) − F(b) بدل F(b) − F(a)",
    lower_bound_ignored: "حساب F(b) فقط ونسيان طرح F(a)",
    chasles_error: "خطأ في تطبيق علاقة شال (جمع بدل طرح أو العكس)",
    negative_area: "إعطاء مساحة سالبة عندما تكون f ≤ 0",
    mean_forgot_divide: "نسيان القسمة على b − a في حساب القيمة المتوسطة",
    mean_average_endpoints: "حساب القيمة المتوسطة كمتوسط f(a) و f(b)",
    mean_wrong_length: "القسمة على a + b بدل طول المجال b − a",
  },
  remedies: {
    integrate_differentiate:
      "الدالة الأصلية هي عكس الاشتقاق: نبحث عن F بحيث F′ = f، أي نرفع الأس بدل أن ننقصه. تحقق دائماً باشتقاق جوابك.",
    primitive_no_divide: "بعد رفع الأس إلى n + 1 اقسم على n + 1، لأن (xⁿ⁺¹)′ = (n + 1)xⁿ. تحقق باشتقاق النتيجة.",
    primitive_no_increment: "أصلية xⁿ هي xⁿ⁺¹/(n + 1): الأس يزيد بواحد، ولا يبقى كما هو.",
    constant_primitive_error: "أصلية الثابت k هي kx وليست k، لأن (kx)′ = k بينما (k)′ = 0.",
    forgot_constant_condition:
      "الدوال الأصلية كثيرة وتختلف بثابت C؛ الشرط F(x₀) = y₀ هو الذي يحدد C، فعوّض ثم استخرجه.",
    constant_condition_error:
      "عوّض x بـ x₀ في F(x) + C كاملة، ثم حل المعادلة: C = y₀ − F(x₀)، ولا تكتفِ بإضافة y₀.",
    forgot_u_prime_factor:
      "قبل تطبيق القاعدة تأكد أن u′ موجودة كاملة: إذا نقص معامل مثل a في (ax + b) اقسم عليه، وإذا كانت u′ موجودة فلا تضفها مرة أخرى.",
    primitive_of_product:
      "أصلية الجداء ليست جداء الأصليات. تعرّف على الشكل u′·uⁿ: هنا 2x هي u′ ولا نبحث عن أصليتها منفصلة.",
    exp_as_power: "eᵘ ليست قوة للمتغير: (eᵘ)′ = u′eᵘ، إذن أصلية u′eᵘ هي eᵘ نفسها بلا رفع للأس.",
    ln_no_abs:
      "أصلية u′/u هي ln|u|. إذا كانت u < 0 على المجال فإن |u| = −u، و ln u غير معرّفة هناك.",
    bounds_reversed: "∫ₐᵇ f(x) dx = F(b) − F(a): نعوّض بالحد العلوي أولاً ثم نطرح قيمة الحد السفلي.",
    lower_bound_ignored: "لا تنسَ طرح F(a) حتى لو بدا الحد السفلي بسيطاً؛ التكامل هو الفرق F(b) − F(a).",
    chasles_error:
      "علاقة شال: ∫ₐᶜ = ∫ₐᵇ + ∫ᵦᶜ. اكتبها أولاً ثم استخرج المجهول منها بدل الجمع أو الطرح عشوائياً.",
    negative_area:
      "المساحة موجبة دائماً: إذا كانت f ≤ 0 على [a ; b] فالمساحة هي −∫ₐᵇ f(x) dx. ادرس إشارة f قبل الحساب.",
    mean_forgot_divide: "القيمة المتوسطة هي التكامل مقسوماً على طول المجال: μ = (1/(b − a))∫ₐᵇ f(x) dx.",
    mean_average_endpoints:
      "متوسط f(a) و f(b) لا يساوي القيمة المتوسطة إلا للدوال التآلفية؛ استعمل دستور التكامل μ = (1/(b − a))∫ₐᵇ f.",
    mean_wrong_length: "طول المجال [a ; b] هو b − a وليس a + b.",
  },
  bank: [],
  generators,
};
