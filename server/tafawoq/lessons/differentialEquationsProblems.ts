// BAC-style problems for "المعادلات التفاضلية" (see ../problems.ts for the pattern).
import { frac, mul, num, paren, signed, sup, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

const SUP_EXTRA: Record<string, string> = { x: "ˣ", "+": "⁺", "−": "⁻" };

/** e^(k·x) for an integer k: "e⁻²ˣ", "eˣ", "e⁻ˣ". */
function eX(k: number): string {
  const inner = k === 1 ? "x" : k === -1 ? "−x" : `${num(k)}x`;
  return `e${Array.from(inner).map(char => SUP_EXTRA[char] ?? sup(char)).join("")}`;
}
/** e^(−k·t) for a decimal k: "e^(−0.1t)". */
const eT = (k: number) => `e^(−${num(k)}t)`;
/** c · e… written as a teacher would: "3e²ˣ", "−e²ˣ", "e²ˣ". */
const coefE = (c: number, e: string) => (c === 1 ? e : c === -1 ? `−${e}` : `${num(c)}${e}`);
/** ln r divided by a positive integer: "ln 2", "(ln 3)/2". */
const lnOver = (r: number, d: number) => (d === 1 ? `ln ${r}` : `(ln ${r})/${d}`);

const INC = "متزايدة تماماً على ℝ";
const DEC = "متناقصة تماماً على ℝ";
const CONST = "ثابتة على ℝ";
const NOT_MONO = "ليست رتيبة على ℝ";

export const differentialEquationsProblems: ProblemGenerator[] = [
  {
    id: "affine-ode-function-study",
    title: "معادلة تفاضلية y′ = ay + b ودراسة حلها",
    generate(rng: Rng) {
      const a = rng.pick([-1, -2, -3, -4]);
      const m = rng.nonZero(-5, 6);
      const b = -a * m;
      const C = rng.nonZero(-6, 6);
      const y0 = m + C;
      const r = rng.pick([2, 3, 4, 5]);
      const target = frac(C + m * r, r);
      const A = -a;
      const eq = `y′ = ${mul(a, "y")} ${signed(b)}`;
      const general = `C${eX(a)} ${signed(m)}`;
      const f = `${coefE(C, eX(a))} ${signed(m)}`;
      const derivative = coefE(a * C, eX(a));
      const direction = C < 0 ? INC : DEC;
      const time = lnOver(r, A);
      return {
        statement: [
          `نعتبر المعادلة التفاضلية (E): ${eq}، حيث y دالة للمتغير الحقيقي x قابلة للاشتقاق على ℝ.`,
          `ولتكن f حل المعادلة (E) الذي يحقق الشرط f(0) = ${num(y0)}.`,
        ].join("\n"),
        parts: [
          {
            skill: "affine_ode",
            difficulty: 1,
            type: "short",
            prompt: "عيّن الحل الثابت للمعادلة (E). اكتب قيمته.",
            answer: num(m),
            accept: [`y = ${num(m)}`],
            steps: [
              "الحل الثابت y = k يحقق y′ = 0",
              `0 = ${mul(a, "k")} ${signed(b)} ومنه k = ${num(-b)}/${paren(num(a))}`,
              `k = ${num(m)}`,
            ],
          },
          {
            skill: "affine_ode",
            difficulty: 1,
            type: "short",
            prompt: "اكتب الحل العام للمعادلة (E) مستعملاً ثابتاً حقيقياً C.",
            answer: general,
            accept: [`y = ${general}`],
            steps: [
              `حلول y′ = ${mul(a, "y")} هي y = C${eX(a)}`,
              `نضيف الحل الثابت ${num(m)}`,
              `y = ${general} حيث C ∈ ℝ`,
            ],
          },
          {
            skill: "initial_condition",
            difficulty: 2,
            type: "short",
            prompt: `عيّن الحل f الذي يحقق f(0) = ${num(y0)}، واكتب عبارة f(x).`,
            answer: f,
            accept: [`f(x) = ${f}`],
            steps: [
              `f(0) = C·e⁰ ${signed(m)} = C ${signed(m)}`,
              `C ${signed(m)} = ${num(y0)} ومنه C = ${num(C)}`,
              `f(x) = ${f}`,
            ],
          },
          {
            skill: "affine_ode",
            difficulty: 2,
            type: "short",
            prompt: "احسب نهاية f(x) لما x يؤول إلى +∞، ثم استنتج معادلة المستقيم المقارب الأفقي. اكتب قيمة النهاية.",
            answer: num(m),
            accept: [`y = ${num(m)}`],
            steps: [
              `${num(a)} < 0 إذن ${eX(a)} يؤول إلى 0 لما x يؤول إلى +∞`,
              `lim f(x) = 0 ${signed(m)} = ${num(m)}`,
              `المستقيم ذو المعادلة y = ${num(m)} مقارب أفقي لمنحنى f بجوار +∞`,
            ],
          },
          {
            skill: "affine_ode",
            difficulty: 2,
            type: "mcq",
            prompt: "ادرس اتجاه تغير الدالة f على ℝ.",
            answer: direction,
            distractors: [
              { option: C < 0 ? DEC : INC, misconception: "monotony_sign" },
              { option: CONST, misconception: "constant_solution_confusion" },
              { option: NOT_MONO, misconception: "monotony_sign" },
            ],
            steps: [
              `f′(x) = ${derivative}`,
              `${eX(a)} > 0، وإشارة f′(x) هي إشارة الجداء ${paren(num(a))} × ${paren(num(C))} = ${num(a * C)}`,
              `f′(x) ${a * C > 0 ? ">" : "<"} 0 إذن f ${direction}`,
            ],
          },
          {
            skill: "applications",
            difficulty: 3,
            type: "short",
            prompt: `عيّن القيمة الحقيقية x التي من أجلها f(x) = ${target}. أعط القيمة المضبوطة.`,
            answer: time,
            steps: [
              `${coefE(C, eX(a))} ${signed(m)} = ${target} ⟺ ${coefE(C, eX(a))} = ${frac(C, r)}`,
              `${eX(a)} = 1/${r} ⟺ ${mul(a, "x")} = ln(1/${r}) = −ln ${r}`,
              `x = ${time}`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "newton-cooling",
    title: "تبريد سائل: قانون نيوتن",
    generate(rng: Rng) {
      const liquid = rng.pick(["كوب قهوة", "كوب شاي", "جسم معدني", "إناء ماء"]);
      const N = rng.pick([2, 4, 5, 10, 20]);
      const k = 1 / N;
      const T = rng.pick([15, 18, 20, 22, 25]);
      const r = rng.pick([3, 4, 5, 8]);
      const step = r % 2 === 0 ? r : 2 * r;
      const maxJ = Math.floor((100 - T) / step);
      const D = step * rng.int(Math.max(2, Math.ceil(40 / step)), maxJ);
      const theta0 = T + D;
      const theta1 = T + D / r;
      const half = T + D / 2;
      const eq = `θ′ = −${num(k)}θ + ${num(k * T)}`;
      const general = `Ce^(−${num(k)}t) + ${T}`;
      const theta = `${D}${eT(k)} + ${T}`;
      const time = `${N}ln ${r}`;
      return {
        statement: [
          `نضع ${liquid} درجة حرارته ${theta0}°C في غرفة درجة حرارتها ثابتة. نرمز بـ θ(t) لدرجة حرارته بالدرجة المئوية بعد t دقيقة.`,
          `نقبل أن الدالة θ حل للمعادلة التفاضلية (E): ${eq}، وأن θ(0) = ${theta0}.`,
        ].join("\n"),
        parts: [
          {
            skill: "affine_ode",
            difficulty: 1,
            type: "short",
            prompt: "عيّن الحل الثابت للمعادلة (E). ماذا يمثل فيزيائياً؟ اكتب قيمته.",
            answer: num(T),
            steps: [
              "الحل الثابت يحقق θ′ = 0",
              `${num(k)}θ = ${num(k * T)} ومنه θ = ${num(k * T)}/${num(k)} = ${T}`,
              `إنه درجة حرارة الغرفة: ${T}°C`,
            ],
          },
          {
            skill: "affine_ode",
            difficulty: 2,
            type: "short",
            prompt: "اكتب الحل العام للمعادلة (E) بدلالة t مستعملاً ثابتاً حقيقياً C.",
            answer: general,
            accept: [`θ(t) = ${general}`],
            steps: [
              `(E) من الشكل y′ = ay + b مع a = −${num(k)}`,
              `حلول θ′ = −${num(k)}θ هي Ce^(−${num(k)}t)، والحل الثابت ${T}`,
              `θ(t) = ${general}`,
            ],
          },
          {
            skill: "initial_condition",
            difficulty: 2,
            type: "short",
            prompt: `باستعمال θ(0) = ${theta0}، اكتب عبارة θ(t) بدلالة t.`,
            answer: theta,
            accept: [`θ(t) = ${theta}`],
            steps: [`θ(0) = C + ${T} = ${theta0}`, `C = ${theta0} − ${T} = ${D}`, `θ(t) = ${theta}`],
          },
          {
            skill: "applications",
            difficulty: 2,
            type: "short",
            prompt: `احسب درجة الحرارة بعد ${N}ln 2 دقيقة.`,
            answer: num(half),
            steps: [
              `e^(−${num(k)} × ${N}ln 2) = e^(−ln 2) = 1/2`,
              `θ(${N}ln 2) = ${D} × 1/2 + ${T}`,
              `θ(${N}ln 2) = ${num(half)}°C`,
            ],
          },
          {
            skill: "applications",
            difficulty: 3,
            type: "short",
            prompt: `بعد كم دقيقة تصبح درجة الحرارة ${num(theta1)}°C؟ أعط القيمة المضبوطة.`,
            answer: time,
            steps: [
              `${D}${eT(k)} + ${T} = ${num(theta1)} ⟺ ${eT(k)} = ${num(D / r)}/${D} = 1/${r}`,
              `−${num(k)}t = ln(1/${r}) = −ln ${r}`,
              `t = ln ${r}/${num(k)} = ${time} دقيقة`,
            ],
          },
        ],
      };
    },
  },
];
