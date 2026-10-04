// BAC lesson "المعادلات التفاضلية" (Algerian curriculum, sciences / math /
// techmath): skill graph, misconceptions, remedies and parametric generators
// (see ./derivativesGenerators.ts for the pattern every generator follows).
// General solutions are typed with the constant C ("Ce²ˣ − 3"), exact times
// with ln ("10ln 2"); second-order solutions use A cos(ωx) + B sin(ωx).
import type { Lesson } from "../curriculum";
import { answersMatch } from "../grading";
import { expressionsEquivalent } from "../mathExpr";
import { differentialEquationsProblems } from "./differentialEquationsProblems";
import { frac, join, linear, mul, num, paren, signed, sup, type Generator, type Rng } from "../generators/core";

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
/** e^(a·x): "e²ˣ", "e⁻ˣ". */
const eX = (a: number) => ePow(mul(a, "x"));
/** e^(−k·t) for a decimal k: "e^(−0.1t)". */
const eT = (k: number) => `e^(−${num(k)}t)`;
/** c · e… written as a teacher would: "3e²ˣ", "−e²ˣ", "e²ˣ". */
const coef = (c: number, body: string) => (c === 1 ? body : c === -1 ? `−${body}` : `${num(c)}${body}`);
/** p/q · body with a fractional coefficient in parentheses: "(2/3)sin(3x)". */
function fracCoef(p: number, q: number, body: string): string {
  const c = frac(p, q);
  if (c === "1") return body;
  if (c === "−1") return `−${body}`;
  return c.includes("/") ? `(${c})${body}` : `${c}${body}`;
}
/** y′ = ay + b as typed in the BAC: "y′ = 2y − 6". */
const affineEq = (a: number, b: number) => `y′ = ${join(mul(a, "y"), num(b))}`;
/** Time ln r / k for k = 1/N or an integer k: "10ln 2", "(ln 2)/3". */
function lnOverK(r: number, k: number): string {
  if (Number.isInteger(k)) return k === 1 ? `ln ${r}` : `(ln ${r})/${k}`;
  const N = Math.round(1 / k);
  return N === 1 ? `ln ${r}` : `${N}ln ${r}`;
}
/** A cos(ωx) + B sin(ωx) with the letters kept. */
const trigGeneral = (w: number) => `A cos(${mul(w, "x")}) + B sin(${mul(w, "x")})`;

const generators: Generator[] = [
  // ---------------------------------------------------- checking a solution
  {
    id: "check-find-constant",
    skill: "check_solution",
    difficulty: 1,
    generate: rng => {
      const a = rng.nonZero(-4, 4);
      const m = rng.nonZero(-6, 6);
      const k = rng.nonZero(-5, 5);
      const b = -a * m;
      return {
        type: "short",
        prompt: `f الدالة المعرفة على ℝ بـ f(x) = ${coef(k, eX(a))} + m حيث m عدد حقيقي. عيّن m حتى تكون f حلاً للمعادلة التفاضلية ${affineEq(a, b)}.`,
        answer: num(m),
        accept: [`m = ${num(m)}`],
        steps: [
          `f′(x) = ${coef(a * k, eX(a))}`,
          `${mul(a, "f(x)")} ${signed(b)} = ${join(coef(a * k, eX(a)), mul(a, "m"), num(b))}`,
          `f′(x) = ${mul(a, "f(x)")} ${signed(b)} ⟺ ${mul(a, "m")} ${signed(b)} = 0`,
          `m = ${num(m)}`,
        ],
      };
    },
  },
  {
    id: "check-which-solution",
    skill: "check_solution",
    difficulty: 1,
    generate: rng => {
      const [a, k] = draw(
        rng,
        g => [g.nonZero(-4, 4), g.nonZero(-5, 5)] as const,
        ([a, k]) => allDifferent(coef(k, eX(a)), coef(k, eX(-a)), `${eX(a)} ${signed(k)}`, linear(a, k))
      );
      const answer = coef(k, eX(a));
      return {
        type: "mcq",
        prompt: `أي من الدوال التالية حل للمعادلة التفاضلية ${rng.chance(0.5) ? `y′ = ${mul(a, "y")}` : `y′ ${a > 0 ? "−" : "+"} ${mul(Math.abs(a), "y")} = 0`}؟`,
        answer,
        distractors: [
          { option: coef(k, eX(-a)), misconception: "sign_exponent" },
          { option: `${eX(a)} ${signed(k)}`, misconception: "constant_added" },
          { option: linear(a, k), misconception: "primitive_confusion" },
        ],
        steps: [
          `من أجل f(x) = ${answer}: f′(x) = ${coef(a * k, eX(a))}`,
          `${mul(a, "f(x)")} = ${coef(a * k, eX(a))} إذن f′(x) = ${mul(a, "f(x)")}`,
          "الدوال الأخرى لا تحقق المساواة من أجل كل x",
        ],
      };
    },
  },
  {
    id: "check-affine-particular",
    skill: "check_solution",
    difficulty: 3,
    generate: rng => {
      const a = rng.nonZero(-3, 3);
      const alpha = rng.nonZero(-4, 4);
      const beta = rng.int(-5, 5);
      const c = -a * alpha;
      const d = alpha - a * beta;
      const answer = linear(alpha, beta);
      return {
        type: "short",
        prompt: `عيّن العددين الحقيقيين α و β حتى تكون الدالة g المعرفة على ℝ بـ g(x) = αx + β حلاً للمعادلة y′ = ${join(mul(a, "y"), mul(c, "x"), num(d))}، ثم اكتب عبارة g(x).`,
        answer,
        accept: [`g(x) = ${answer}`],
        steps: [
          "g′(x) = α",
          `${join(mul(a, "(αx + β)"), mul(c, "x"), num(d))} = ${join(`(${join(mul(a, "α"), num(c))})x`, `(${join(mul(a, "β"), num(d))})`)}`,
          `بالمطابقة: ${join(mul(a, "α"), num(c))} = 0 و α = ${join(mul(a, "β"), num(d))}`,
          `α = ${num(alpha)} و β = ${num(beta)}`,
          `g(x) = ${answer}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------ y′ = ay
  {
    id: "homog-general",
    skill: "homogeneous_ode",
    difficulty: 1,
    generate: rng => {
      const a = rng.nonZero(-6, 6);
      const name = rng.pick(["y", "f"]);
      const answer = `C${eX(a)}`;
      return {
        type: "short",
        prompt: `حل في ℝ المعادلة التفاضلية ${name}′ = ${mul(a, name)}. اكتب الحل العام مستعملاً ثابتاً حقيقياً C.`,
        answer,
        accept: [`y = ${answer}`, `k${eX(a)}`],
        steps: [
          "حلول y′ = ay هي الدوال x ↦ Ce^(ax) حيث C ∈ ℝ",
          `هنا a = ${num(a)}`,
          `${name}(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "homog-rewrite",
    skill: "homogeneous_ode",
    difficulty: 2,
    generate: rng => {
      const [a, p] = draw(
        rng,
        g => [g.nonZero(-4, 4), g.pick([2, 3, 4])] as const,
        ([a, p]) => allDifferent(`C${eX(a)}`, `C${eX(-a)}`, `C${eX(a * p)}`, `${eX(a)} + C`)
      );
      const q = -a * p;
      const answer = `C${eX(a)}`;
      return {
        type: "mcq",
        prompt: `ما الحل العام للمعادلة التفاضلية ${p}y′ ${signed(q)}y = 0؟`,
        answer,
        distractors: [
          { option: `C${eX(-a)}`, misconception: "sign_exponent" },
          { option: `C${eX(a * p)}`, misconception: "standard_form" },
          { option: `${eX(a)} + C`, misconception: "constant_added" },
        ],
        steps: [
          `${p}y′ = ${mul(-q, "y")}`,
          `y′ = (${num(-q)}/${p})y أي y′ = ${mul(a, "y")}`,
          `y = ${answer} حيث C ∈ ℝ`,
        ],
      };
    },
  },
  // -------------------------------------------------------- y′ = ay + b
  {
    id: "affine-constant",
    skill: "affine_ode",
    difficulty: 1,
    generate: rng => {
      const a = rng.nonZero(-5, 5);
      const b = rng.nonZero(-12, 12);
      const answer = frac(-b, a);
      return {
        type: "short",
        prompt: `عيّن الحل الثابت للمعادلة التفاضلية ${affineEq(a, b)}.`,
        answer,
        accept: [`y = ${answer}`],
        steps: [
          "الحل الثابت y = k مشتقته معدومة",
          `0 = ${mul(a, "k")} ${signed(b)}`,
          `k = ${num(-b)}/${paren(num(a))} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "affine-general",
    skill: "affine_ode",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-4, 4);
      const b = rng.nonZero(-10, 10);
      const m = frac(-b, a);
      const answer = join(`C${eX(a)}`, m);
      const rewritten = rng.chance(0.5);
      const equation = rewritten ? `y′ ${-a > 0 ? "+" : "−"} ${mul(Math.abs(a), "y")} = ${num(b)}` : affineEq(a, b);
      return {
        type: "short",
        prompt: `حل في ℝ المعادلة التفاضلية ${equation}. اكتب الحل العام مستعملاً ثابتاً حقيقياً C.`,
        answer,
        accept: [`y = ${answer}`],
        steps: [
          ...(rewritten ? [`نكتب المعادلة على الشكل ${affineEq(a, b)}`] : []),
          `الحل الثابت: −b/a = ${num(-b)}/${paren(num(a))} = ${m}`,
          `حلول y′ = ${mul(a, "y")} هي C${eX(a)}`,
          `y = ${answer} حيث C ∈ ℝ`,
        ],
      };
    },
  },
  {
    id: "affine-general-mcq",
    skill: "affine_ode",
    difficulty: 2,
    generate: rng => {
      const [a, b] = draw(
        rng,
        g => [g.nonZero(-4, 4), g.nonZero(-9, 9)] as const,
        ([a, b]) =>
          allDifferent(
            join(`C${eX(a)}`, frac(-b, a)),
            join(`C${eX(a)}`, frac(b, a)),
            join(`C${eX(a)}`, num(b)),
            `C${eX(a)}`
          )
      );
      const m = frac(-b, a);
      return {
        type: "mcq",
        prompt: `ما الحل العام للمعادلة التفاضلية ${affineEq(a, b)}؟`,
        answer: join(`C${eX(a)}`, m),
        distractors: [
          { option: join(`C${eX(a)}`, frac(b, a)), misconception: "particular_sign" },
          { option: join(`C${eX(a)}`, num(b)), misconception: "particular_is_b" },
          { option: `C${eX(a)}`, misconception: "particular_forgotten" },
        ],
        steps: [
          `a = ${num(a)} و b = ${num(b)}`,
          `الحل الثابت −b/a = ${m}`,
          `y = ${join(`C${eX(a)}`, m)} حيث C ∈ ℝ`,
        ],
      };
    },
  },
  // ---------------------------------------------------- initial condition
  {
    id: "init-find-c",
    skill: "initial_condition",
    difficulty: 2,
    generate: rng => {
      const [a, b, y0] = draw(
        rng,
        g => [g.nonZero(-4, 4), g.nonZero(-9, 9), g.int(-6, 8)] as const,
        ([a, b, y0]) =>
          y0 * a + b !== 0 &&
          allDifferent(frac(y0 * a + b, a), num(y0), frac(y0 * a - b, a), num(y0 - b))
      );
      const m = frac(-b, a);
      const C = frac(y0 * a + b, a);
      return {
        type: "mcq",
        prompt: `الحل العام للمعادلة ${affineEq(a, b)} هو y = ${join(`C${eX(a)}`, m)}. ما قيمة C التي تجعل y(0) = ${num(y0)}؟`,
        answer: C,
        distractors: [
          { option: num(y0), misconception: "c_equals_y0" },
          { option: frac(y0 * a - b, a), misconception: "particular_sign" },
          { option: num(y0 - b), misconception: "particular_is_b" },
        ],
        steps: [
          `y(0) = ${join("C·e⁰", m)} = ${join("C", m)}`,
          `C = ${num(y0)} − ${paren(m)}`,
          `C = ${C}`,
        ],
      };
    },
  },
  {
    id: "init-solution",
    skill: "initial_condition",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-4, 4);
      const m = rng.int(-6, 6);
      const C = rng.nonZero(-6, 6);
      const b = -a * m;
      const y0 = m + C;
      const answer = join(coef(C, eX(a)), num(m));
      return {
        type: "short",
        prompt: `عيّن الدالة f حل المعادلة التفاضلية ${affineEq(a, b)} التي تحقق f(0) = ${num(y0)}.`,
        answer,
        accept: [`f(x) = ${answer}`],
        steps: [
          `الحل العام: f(x) = ${join(`C${eX(a)}`, num(m))}`,
          `f(0) = ${join("C", num(m))} = ${num(y0)}`,
          `C = ${num(C)}`,
          `f(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "init-x0",
    skill: "initial_condition",
    difficulty: 3,
    generate: rng => {
      const a = rng.nonZero(-3, 3);
      const x0 = rng.pick([-2, -1, 1, 2]);
      const y0 = rng.nonZero(-5, 5);
      const answer = coef(y0, ePow(linear(a, -a * x0)));
      return {
        type: "short",
        prompt: `عيّن الدالة f حل المعادلة التفاضلية y′ = ${mul(a, "y")} التي تحقق f(${num(x0)}) = ${num(y0)}.`,
        answer,
        accept: [`f(x) = ${answer}`],
        steps: [
          `f(x) = C${eX(a)}`,
          `f(${num(x0)}) = C${ePow(num(a * x0))} = ${num(y0)}`,
          `C = ${coef(y0, ePow(num(-a * x0)))}`,
          `f(x) = ${coef(y0, ePow(num(-a * x0)))} × ${eX(a)} = ${answer}`,
        ],
      };
    },
  },
  // -------------------------------------------------- y″ + ω²y = 0
  {
    id: "second-general",
    skill: "second_order",
    difficulty: 1,
    generate: rng => {
      const w = rng.int(2, 6);
      const p = rng.pick([1, 2, 3]);
      const form = rng.pick(["sum", "equal"] as const);
      const equation =
        form === "sum" ? `${p === 1 ? "" : p}y″ + ${p * w * w}y = 0` : `${p === 1 ? "" : p}y″ = −${p * w * w}y`;
      const answer = trigGeneral(w);
      return {
        type: "mcq",
        prompt: `ما الحل العام للمعادلة التفاضلية ${equation}؟`,
        answer,
        distractors: [
          { option: trigGeneral(w * w), misconception: "omega_square" },
          { option: `A${eX(w)} + B${eX(-w)}`, misconception: "second_order_form" },
          { option: `C${eX(-w * w)}`, misconception: "second_order_form" },
        ],
        steps: [
          `نكتب المعادلة على الشكل y″ + ${w * w}y = 0`,
          `ω² = ${w * w} ومنه ω = ${w}`,
          `y = ${answer} حيث A و B عددان حقيقيان`,
        ],
      };
    },
  },
  {
    id: "second-conditions",
    skill: "second_order",
    difficulty: 2,
    generate: rng => {
      const w = rng.int(2, 5);
      const A = rng.nonZero(-4, 4);
      const B = rng.nonZero(-4, 4);
      const v = B * w;
      const cos = `cos(${w}x)`;
      const sin = `sin(${w}x)`;
      const answer = join(coef(A, cos), coef(B, sin));
      return {
        type: "short",
        prompt: `عيّن الحل f للمعادلة التفاضلية y″ + ${w * w}y = 0 الذي يحقق f(0) = ${num(A)} و f′(0) = ${num(v)}.`,
        answer,
        accept: [`f(x) = ${answer}`],
        steps: [
          `f(x) = A ${cos} + B ${sin} و f′(x) = −${w}A ${sin} + ${w}B ${cos}`,
          `f(0) = A = ${num(A)}`,
          `f′(0) = ${w}B = ${num(v)} ومنه B = ${num(B)}`,
          `f(x) = ${answer}`,
        ],
      };
    },
  },
  {
    id: "second-find-b",
    skill: "second_order",
    difficulty: 3,
    generate: rng => {
      const [w, p, q] = draw(
        rng,
        g => [g.int(2, 5), g.nonZero(-5, 5), g.nonZero(-9, 9)] as const,
        ([w, p, q]) => allDifferent(frac(q, w), num(q), num(p), frac(q, w * w))
      );
      const answer = frac(q, w);
      return {
        type: "mcq",
        prompt: `f حل للمعادلة y″ + ${w * w}y = 0 أي f(x) = A cos(${w}x) + B sin(${w}x)، ويحقق f(0) = ${num(p)} و f′(0) = ${num(q)}. ما قيمة B؟`,
        answer,
        distractors: [
          { option: num(q), misconception: "derivative_omega" },
          { option: num(p), misconception: "c_equals_y0" },
          { option: frac(q, w * w), misconception: "omega_square" },
        ],
        steps: [
          `f′(x) = −${w}A sin(${w}x) + ${w}B cos(${w}x)`,
          `f′(0) = ${w}B = ${num(q)}`,
          `B = ${answer}`,
        ],
      };
    },
  },
  // ------------------------------------------------------- applications
  {
    id: "half-life",
    skill: "applications",
    difficulty: 2,
    generate: rng => {
      const k = rng.pick([0.1, 0.2, 0.5, 0.05, 0.25, 2, 3, 4]);
      const growth = rng.chance(0.5);
      const start = rng.pick([100, 200, 500, 1000, 5000]);
      const answer = lnOverK(2, k);
      const kText = num(k);
      const negative = Number.isInteger(k) ? `−(ln 2)/${k}` : `−${answer}`;
      const kLn = `${kText}ln 2`;
      const naive = Number.isInteger(k) ? frac(1, 2 * k) : num(1 / (2 * k));
      const prompt = growth
        ? `عدد بكتيريا N(t) بعد t ساعة يحقق N′ = ${kText}N و N(0) = ${start}. بعد كم ساعة يتضاعف عددها؟`
        : `عدد أنوية عينة مشعة N(t) بعد t سنة يحقق N′ = −${kText}N و N(0) = ${start}. ما نصف العمر، أي الزمن الذي يصبح فيه N(t) = ${start / 2}؟`;
      return {
        type: "mcq",
        prompt,
        answer,
        distractors: [
          { option: negative, misconception: "ln_solve" },
          { option: kLn, misconception: "ln_solve" },
          { option: naive, misconception: "primitive_confusion" },
        ],
        steps: growth
          ? [
              `N(t) = ${start}e^(${kText}t)`,
              `N(t) = ${start * 2} ⟺ e^(${kText}t) = 2 ⟺ ${kText}t = ln 2`,
              `t = ${answer}`,
            ]
          : [
              `N(t) = ${start}${eT(k)}`,
              `N(t) = ${start / 2} ⟺ ${eT(k)} = 1/2 ⟺ −${kText}t = −ln 2`,
              `t = ${answer}`,
            ],
      };
    },
  },
  {
    id: "cooling-time",
    skill: "applications",
    difficulty: 3,
    generate: rng => {
      const N = rng.pick([2, 4, 5, 10, 20]);
      const k = 1 / N;
      const T = rng.pick([15, 20, 25]);
      const r = rng.pick([2, 3, 4, 5]);
      const D = r * rng.int(Math.ceil(30 / r), Math.floor(75 / r));
      const target = T + D / r;
      const answer = lnOverK(r, k);
      return {
        type: "short",
        prompt: `درجة حرارة سائل بعد t دقيقة هي θ(t) = ${D}${eT(k)} + ${T}. بعد كم دقيقة تصبح ${target}°C؟ أعط القيمة المضبوطة.`,
        answer,
        steps: [
          `${D}${eT(k)} + ${T} = ${target} ⟺ ${eT(k)} = ${D / r}/${D} = 1/${r}`,
          `−${num(k)}t = ln(1/${r}) = −ln ${r}`,
          `t = ln ${r}/${num(k)} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "cooling-limit",
    skill: "applications",
    difficulty: 1,
    generate: rng => {
      const N = rng.pick([2, 4, 5, 10, 20]);
      const k = 1 / N;
      const T = rng.pick([12, 15, 18, 20, 22, 25]);
      const theta0 = rng.pick([60, 70, 80, 90, 100]);
      return {
        type: "short",
        prompt: `درجة حرارة θ(t) لسائل بعد t دقيقة تحقق θ′ = −${num(k)}θ + ${num(k * T)} و θ(0) = ${theta0}. إلى أي قيمة تؤول θ(t) لما t يؤول إلى +∞؟`,
        answer: num(T),
        steps: [
          `الحل الثابت: ${num(k * T)}/${num(k)} = ${T}`,
          `θ(t) = ${theta0 - T}${eT(k)} + ${T}`,
          `${eT(k)} يؤول إلى 0، إذن θ(t) يؤول إلى ${T}: درجة حرارة الوسط`,
        ],
      };
    },
  },
];

export const differentialEquationsLesson: Lesson = {
  key: "math-differential-equations",
  curriculum: "dz",
  subject: "math",
  title: "المعادلات التفاضلية",
  levels: ["bac"],
  skills: [
    {
      key: "check_solution",
      name: "التحقق من أن دالة حل لمعادلة تفاضلية",
      prerequisites: [],
      explanation:
        "المعادلة التفاضلية علاقة بين دالة مجهولة y ومشتقتها، مثل y′ = 2y − 6. القول إن الدالة f حل لها يعني أنه إذا عوّضنا y بـ f(x) و y′ بـ f′(x) تتحقق المساواة من أجل كل x. للتحقق: نحسب f′(x)، ثم نحسب الطرف الآخر، ونقارن.",
      example: {
        problem: "بيّن أن f(x) = 5e²ˣ + 3 حل للمعادلة y′ = 2y − 6.",
        steps: ["f′(x) = 10e²ˣ", "2f(x) − 6 = 10e²ˣ + 6 − 6 = 10e²ˣ", "f′(x) = 2f(x) − 6 من أجل كل x"],
        answer: "f حل للمعادلة",
      },
      dialogue: {
        opening: "نريد أن نعرف هل الدالة f(x) = 3e²ˣ حل للمعادلة y′ = 2y. معنى «حل»: إذا عوّضنا y بـ f و y′ بـ f′ تتحقق المساواة من أجل كل x.",
        steps: [
          {
            ask: "احسب f′(x).",
            answer: "6e^(2x)",
            accept: ["6e²ˣ"],
            hint: "مشتقة الأسية eᵘ هي مشتقة الأس مضروبة في الأسية نفسها.",
          },
          {
            ask: "احسب الآن 2f(x).",
            answer: "6e^(2x)",
            accept: ["6e²ˣ"],
            hint: "اضرب عبارة الدالة كلها في المعامل الموجود أمام y.",
            then: "f′(x) = 2f(x) من أجل كل x: إذن f حل للمعادلة.",
          },
          {
            ask: "خذ g(x) = e²ˣ + 1. احسب g′(x) − 2g(x).",
            answer: "−2",
            hint: "مشتقة الثابت معدومة، لكن الثابت يُضرب أيضاً عند حساب ضعف g.",
            then: "النتيجة ليست صفراً: g ليست حلاً، فالثابت المضاف أفسد المساواة.",
          },
          {
            ask: "ما قيمة العدد m التي تجعل h(x) = e²ˣ + m حلاً للمعادلة y′ = 2y − 6؟",
            answer: "3",
            hint: "عوّض ثم قارن الطرفين: حدود الأسية تختفي، فيبقى شرط على m وحده.",
          },
        ],
        rule: "لنتحقق أن f حل لـ y′ = ay + b: نحسب f′(x) ثم af(x) + b، ونتحقق أنهما متساويان من أجل كل x.",
      },
    },
    {
      key: "homogeneous_ode",
      name: "حل المعادلة y′ = ay",
      prerequisites: ["check_solution"],
      explanation:
        "حلول المعادلة التفاضلية y′ = ay (a عدد حقيقي) هي الدوال x ↦ Ce^(ax) حيث C ثابت حقيقي كيفي. قبل التطبيق نكتب المعادلة على الشكل y′ = ay: مثلاً 2y′ + 6y = 0 تصبح y′ = −3y، فحلولها Ce⁻³ˣ.",
      example: {
        problem: "حل المعادلة التفاضلية 2y′ − 8y = 0.",
        steps: ["2y′ = 8y", "y′ = 4y", "y = Ce⁴ˣ حيث C ∈ ℝ"],
        answer: "y = Ce⁴ˣ",
      },
      dialogue: {
        opening: "المعادلة y′ = 3y تقول: مشتقة الدالة تساوي ثلاث مرات الدالة نفسها. أي دالة تعرفها مشتقتها مضاعف لها؟",
        steps: [
          {
            ask: "احسب مشتقة e³ˣ.",
            answer: "3e^(3x)",
            accept: ["3e³ˣ"],
            hint: "مشتقة eᵘ هي u′ مضروبة في eᵘ.",
            then: "مشتقتها تساوي ثلاث مرات الدالة: e³ˣ حل.",
          },
          {
            ask: "وهل 5e³ˣ حل أيضاً؟ احسب مشتقتها.",
            answer: "15e^(3x)",
            accept: ["15e³ˣ"],
            hint: "العدد الثابت المضروب يبقى كما هو عند الاشتقاق.",
            then: "15e³ˣ = 3 × 5e³ˣ: كل دالة من الشكل Ce³ˣ حل.",
          },
          {
            ask: "حل المعادلة y′ = 3y الذي يأخذ القيمة 7 عند الصفر هو Ce³ˣ. ما قيمة C؟",
            answer: "7",
            hint: "عوّض x بالصفر، وتذكّر قيمة e مرفوعاً للأس صفر.",
          },
          {
            ask: "طبّق نفس الفكرة: اكتب الحل العام للمعادلة y′ = −2y مستعملاً الثابت C.",
            answer: "Ce^(-2x)",
            accept: ["Ce⁻²ˣ", "ke^(-2x)"],
            hint: "المعامل الموجود أمام y ينتقل إلى الأس بإشارته.",
          },
        ],
        rule: "حلول y′ = ay هي الدوال x ↦ Ce^(ax) حيث C ثابت حقيقي كيفي.",
      },
    },
    {
      key: "affine_ode",
      name: "حل المعادلة y′ = ay + b",
      prerequisites: ["homogeneous_ode"],
      explanation:
        "من أجل a ≠ 0، للمعادلة y′ = ay + b حل ثابت وحيد y = −b/a (نجده بوضع y′ = 0). حلولها هي y = Ce^(ax) − b/a حيث C ∈ ℝ: حلول y′ = ay مضافاً إليها الحل الثابت. إذا كان a < 0 فإن كل الحلول تؤول إلى −b/a عند +∞.",
      example: {
        problem: "حل المعادلة التفاضلية y′ = −2y + 6.",
        steps: ["الحل الثابت: 0 = −2k + 6 ومنه k = 3", "حلول y′ = −2y هي Ce⁻²ˣ", "y = Ce⁻²ˣ + 3 حيث C ∈ ℝ"],
        answer: "y = Ce⁻²ˣ + 3",
      },
      dialogue: {
        opening: "نعتبر (E): y′ = 2y − 6. نبحث أولاً عن حل ثابت، أي دالة لا تتغير أبداً.",
        steps: [
          {
            ask: "دالة ثابتة y = k: كم تساوي مشتقتها؟",
            answer: "0",
            hint: "الدالة الثابتة لا تزيد ولا تنقص.",
          },
          {
            ask: "عوّض في (E): 0 = 2k − 6. ما قيمة k؟",
            answer: "3",
            hint: "انقل العدد الثابت إلى الطرف الآخر ثم اقسم على المعامل.",
            then: "الحل الثابت هو y = 3، أي −b/a.",
          },
          {
            ask: "ضع z = y − 3. بما أن z′ = y′ = 2y − 6 = 2(y − 3)، فإن z′ = 2z. اكتب z بدلالة x مستعملاً الثابت C.",
            answer: "Ce^(2x)",
            accept: ["Ce²ˣ"],
            hint: "هذه معادلة من الشكل الذي حللناه في المهارة السابقة.",
          },
          {
            ask: "بما أن y = z + 3، اكتب الحل العام لـ (E).",
            answer: "Ce^(2x) + 3",
            accept: ["Ce²ˣ + 3"],
            hint: "أضف الحل الثابت إلى ما وجدته.",
          },
          {
            ask: "طبّق مباشرة: ما الحل الثابت للمعادلة y′ = −4y + 8؟",
            answer: "2",
            hint: "ابحث عن العدد الذي يعدم الطرف الأيمن.",
          },
        ],
        rule: "من أجل a ≠ 0، حلول y′ = ay + b هي y = Ce^(ax) − b/a: حلول y′ = ay مضافاً إليها الحل الثابت −b/a.",
      },
    },
    {
      key: "initial_condition",
      name: "الحل الذي يحقق شرطاً ابتدائياً",
      prerequisites: ["affine_ode"],
      explanation:
        "للمعادلة y′ = ay + b عدد لا نهائي من الحلول، لكن يوجد حل وحيد يحقق شرطاً ابتدائياً y(x₀) = y₀. نعوّض x بـ x₀ في الحل العام فنحصل على معادلة مجهولها C. مع x₀ = 0 تكون e⁰ = 1 فيصبح C = y₀ + b/a.",
      example: {
        problem: "عيّن حل المعادلة y′ = −y + 4 الذي يحقق f(0) = 10.",
        steps: ["f(x) = Ce⁻ˣ + 4", "f(0) = C + 4 = 10", "C = 6", "f(x) = 6e⁻ˣ + 4"],
        answer: "f(x) = 6e⁻ˣ + 4",
      },
      dialogue: {
        opening: "حلول y′ = −y + 4 هي f(x) = Ce⁻ˣ + 4. هناك عدد لا نهائي من الحلول؛ الشرط الابتدائي يختار واحداً منها.",
        steps: [
          {
            ask: "كم يساوي e⁰؟",
            answer: "1",
            hint: "كل عدد غير معدوم مرفوع للأس صفر يعطي نفس النتيجة.",
          },
          {
            ask: "اكتب f(0) بدلالة C.",
            answer: "C + 4",
            accept: ["4 + C"],
            hint: "عوّض x بالصفر في عبارة f.",
          },
          {
            ask: "نريد f(0) = 10. ما قيمة C؟",
            answer: "6",
            hint: "حل المعادلة التي حصلت عليها في السؤال السابق.",
          },
          {
            ask: "اكتب إذن عبارة الحل f(x).",
            answer: "6e^(-x) + 4",
            accept: ["6e⁻ˣ + 4"],
            hint: "ضع قيمة الثابت في الحل العام.",
          },
          {
            ask: "ولو كان الشرط f(0) = 1، ما قيمة C؟",
            answer: "−3",
            hint: "نفس الطريقة: القيمة الابتدائية مطروحاً منها الحل الثابت.",
          },
        ],
        rule: "الشرط الابتدائي y(x₀) = y₀ يعيّن ثابتاً C وحيداً، فللمعادلة حل وحيد يحققه. مع x₀ = 0: C = y₀ − (الحل الثابت).",
      },
    },
    {
      key: "second_order",
      name: "المعادلة y″ + ω²y = 0",
      prerequisites: ["check_solution", "initial_condition"],
      explanation:
        "حلول المعادلة التفاضلية y″ + ω²y = 0 (ω عدد حقيقي موجب) هي الدوال y = A cos(ωx) + B sin(ωx) حيث A و B عددان حقيقيان. نستخرج ω من المعامل: y″ + 9y = 0 تعطي ω = 3 (جذر المعامل وليس المعامل). الشرطان y(0) و y′(0) يعيّنان A و B: y(0) = A و y′(0) = ωB.",
      example: {
        problem: "عيّن حل y″ + 4y = 0 الذي يحقق y(0) = 1 و y′(0) = 6.",
        steps: ["ω = 2 إذن y = A cos(2x) + B sin(2x)", "y(0) = A = 1", "y′(x) = −2A sin(2x) + 2B cos(2x) ومنه y′(0) = 2B = 6", "B = 3"],
        answer: "y = cos(2x) + 3sin(2x)",
      },
      dialogue: {
        opening: "نعتبر y″ + 9y = 0، أي y″ = −9y: المشتقة الثانية تساوي −9 مرة الدالة. نعرف دالتين تعودان إلى نفسيهما بإشارة معاكسة بعد اشتقاقين: cos و sin.",
        steps: [
          {
            ask: "المشتقة الثانية لـ cos(3x) من الشكل k·cos(3x). ما قيمة k؟",
            answer: "−9",
            hint: "اشتق مرتين، وفي كل مرة يخرج معامل x كعامل.",
          },
          {
            ask: "وماذا عن sin(3x)؟ مشتقتها الثانية من الشكل k·sin(3x). ما قيمة k؟",
            answer: "−9",
            hint: "مشتقة الجيب هي جيب التمام، ومشتقة جيب التمام هي معاكس الجيب.",
            then: "الدالتان حلان، وكذلك كل تركيب A cos(3x) + B sin(3x).",
          },
          {
            ask: "إذا كان الحل cos(ωx) فإن مشتقته الثانية −ω²cos(ωx). ما قيمة ω الموجبة التي تعطي ω² = 9؟",
            answer: "3",
            hint: "ابحث عن العدد الموجب الذي مربعه هو المعامل.",
          },
          {
            ask: "الحل العام y = A cos(3x) + B sin(3x). إذا كان y(0) = 2، ما قيمة A؟",
            answer: "2",
            hint: "عند الصفر: جيب التمام يساوي واحداً والجيب ينعدم.",
          },
          {
            ask: "و y′(0) = 6. علماً أن y′(x) = −3A sin(3x) + 3B cos(3x)، ما قيمة B؟",
            answer: "2",
            hint: "عوّض x بالصفر: يبقى حد واحد فقط، فيه معامل يجب القسمة عليه.",
          },
        ],
        rule: "حلول y″ + ω²y = 0 هي y = A cos(ωx) + B sin(ωx)، حيث A و B ثابتان حقيقيان يعيّنهما شرطان: y(0) = A و y′(0) = ωB.",
      },
    },
    {
      key: "applications",
      name: "تطبيقات: التبريد والنمو والتفكك",
      prerequisites: ["initial_condition"],
      explanation:
        "كثير من الظواهر تحقق y′ = ay + b: تبريد جسم (قانون نيوتن θ′ = −k(θ − T) حيث T درجة حرارة الوسط)، نمو مجتمع بكتيري N′ = kN، تفكك مادة مشعة N′ = −kN. نجد الحل بالشرط الابتدائي، ثم لإيجاد زمن نحل معادلة من الشكل e^(−kt) = 1/r بأخذ ln: t = ln r / k. نصف العمر (y = y₀/2) هو t = ln 2 / k.",
      example: {
        problem: "θ(t) = 60e^(−0.1t) + 20. بعد كم دقيقة تصبح θ = 35؟",
        steps: ["60e^(−0.1t) = 15", "e^(−0.1t) = 1/4", "−0.1t = −ln 4", "t = 10ln 4 = 20ln 2"],
        answer: "t = 10ln 4",
      },
      dialogue: {
        opening: "عينة مشعة فيها 1000 نواة، وعدد الأنوية N(t) بعد t سنة يحقق N′ = −0.2N. نريد نصف العمر: الزمن الذي يصبح فيه العدد نصف ما كان.",
        steps: [
          {
            ask: "اكتب N(t) بدلالة t.",
            answer: "1000e^(-0.2t)",
            hint: "معادلة من الشكل y′ = ay، والثابت هو العدد الابتدائي.",
          },
          {
            ask: "نريد N(t) = 500. كم يجب أن يساوي e^(−0.2t)؟",
            answer: "1/2",
            accept: ["0.5"],
            hint: "اقسم الطرفين على العدد الابتدائي.",
          },
          {
            ask: "نأخذ ln للطرفين: −0.2t = ln(1/2). اكتب ln(1/2) بدلالة ln 2.",
            answer: "−ln 2",
            hint: "لوغاريتم مقلوب عدد هو معاكس لوغاريتمه.",
          },
          {
            ask: "استنتج t.",
            answer: "5ln 2",
            accept: ["ln 2 / 0.2"],
            hint: "اقسم الطرفين على المعامل السالب، فتختفي الإشارتان.",
            then: "لاحظ أن العدد 1000 اختفى: نصف العمر لا يتعلق بالكمية الابتدائية.",
          },
        ],
        rule: "إذا كان y′ = −ky (k > 0) فإن y = y₀e^(−kt)، ونصف العمر (y = y₀/2) هو t = ln 2 / k. وعموماً e^(−kt) = 1/r تعطي t = ln r / k.",
      },
    },
  ],
  misconceptions: {
    sign_exponent: "خطأ في إشارة الأس: Ce^(−ax) بدل Ce^(ax)",
    constant_added: "جمع الثابت بدل ضربه: e^(ax) + C بدل Ce^(ax)",
    primitive_confusion: "معاملة المعادلة التفاضلية كحساب دالة أصلية أو كتغير خطي: y = ax + C",
    standard_form: "خطأ عند كتابة المعادلة على الشكل y′ = ay: نسيان القسمة على معامل y′",
    particular_sign: "خطأ في إشارة الحل الثابت: b/a بدل −b/a",
    particular_is_b: "اعتبار b هو الحل الثابت بدل −b/a",
    particular_forgotten: "نسيان الحل الثابت: y = Ce^(ax) فقط لمعادلة y′ = ay + b",
    c_equals_y0: "اعتبار الثابت مساوياً للقيمة الابتدائية مباشرة دون تعويض",
    omega_square: "أخذ ω² مكان ω: A cos(ω²x) + B sin(ω²x)",
    second_order_form: "خطأ في شكل حلول y″ + ω²y = 0: حلول أسية (كما في y″ − ω²y = 0 أو في الرتبة الأولى) بدل cos و sin",
    derivative_omega: "نسيان العامل ω عند اشتقاق sin(ωx): B = y′(0)",
    ln_solve: "خطأ في عزل t من e^(kt) = r: إشارة ln خاطئة أو الضرب في k بدل القسمة",
    monotony_sign: "الحكم على اتجاه تغير Ce^(ax) + m من إشارة a أو C وحدها بدل إشارة الجداء aC",
    constant_solution_confusion: "الخلط بين الحل f والحل الثابت للمعادلة (اعتبار f ثابتة)",
  },
  remedies: {
    sign_exponent: "الأس يحمل معامل y بإشارته: y′ = −3y تعطي Ce⁻³ˣ، وتحقق بالاشتقاق: (Ce⁻³ˣ)′ = −3Ce⁻³ˣ.",
    constant_added: "اشتق e^(ax) + C: تجد ae^(ax) وليس a(e^(ax) + C). الثابت يُضرب: Ce^(ax).",
    primitive_confusion: "y′ = ay لا تعني أن المشتقة ثابتة؛ المشتقة متناسبة مع الدالة نفسها، فالحل أسي Ce^(ax).",
    standard_form: "اقسم أولاً على معامل y′ وانقل الحد الآخر بإشارته: 2y′ + 6y = 0 ⟺ y′ = −3y.",
    particular_sign: "الحل الثابت يحقق 0 = ak + b، أي k = −b/a: مثلاً y′ = 2y − 6 حلها الثابت 3.",
    particular_is_b: "b ليس الحل الثابت؛ حل 0 = ak + b لتجد k = −b/a.",
    particular_forgotten: "حلول y′ = ay + b هي حلول y′ = ay مضافاً إليها الحل الثابت: Ce^(ax) − b/a.",
    c_equals_y0: "عوّض في الحل العام: y(0) = C + (الحل الثابت)، و y(x₀) = Ce^(ax₀)؛ C لا يساوي y₀ إلا في حالات خاصة.",
    omega_square: "المعامل أمام y هو ω²: y″ + 9y = 0 تعطي ω = 3، فالحل A cos(3x) + B sin(3x).",
    second_order_form: "y″ = −ω²y: الدالة تعود إلى معاكسها بعد اشتقاقين، وهذا شأن cos و sin لا الأسية. الحل يحتاج ثابتين: A cos(ωx) + B sin(ωx).",
    derivative_omega: "(sin(ωx))′ = ω cos(ωx)، فـ y′(0) = ωB ومنه B = y′(0)/ω.",
    ln_solve: "من e^(−kt) = 1/r نأخذ ln: −kt = −ln r، ثم نقسم على −k: t = ln r / k (موجب).",
    monotony_sign: "اشتق: (Ce^(ax) + m)′ = aCe^(ax)، و e^(ax) > 0، فالإشارة هي إشارة aC.",
    constant_solution_confusion: "f تساوي الحل الثابت فقط إذا كان C = 0؛ وإلا فـ f′(x) = aCe^(ax) لا تنعدم.",
  },
  bank: [],
  generators,
  problems: differentialEquationsProblems,
};
