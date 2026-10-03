// BAC-style problems for "الدالة الأسية" (see ../problems.ts for the pattern).
import { join, linear, mul, num, paren, sup, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

const INC = "متزايدة تماماً";
const DEC = "متناقصة تماماً";
const INDETERMINATE = "حالة عدم تعيين (لا يمكن حساب النهاية)";

/** e^k for an integer k: 1, e, e², e⁻³. */
function eInt(k: number): string {
  if (k === 0) return "1";
  if (k === 1) return "e";
  return `e${sup(k).replace("-", "⁻")}`;
}

/** k·e^r written as a teacher would: "3", "−2e", "2e⁻¹". */
function kE(k: number, r: number): string {
  return r === 0 ? num(k) : mul(k, eInt(r));
}

/** factor · exponential: "(2x + 1)eˣ", "xeˣ", "−xeˣ". */
function times(factor: string, exponential: string): string {
  return /\s/.test(factor) ? `(${factor})${exponential}` : `${factor}${exponential}`;
}

const E = Math.E;

export const exponentialProblems: ProblemGenerator[] = [
  {
    id: "exp-affine-study",
    title: "دراسة دالة من الشكل (ax + b)eˣ + c",
    generate(rng: Rng) {
      // f′(x) = (ax + a + b)eˣ = a(x − r)eˣ with b = −a(r + 1): the critical point r is an integer.
      const a = rng.pick([-2, -1, 1, 2]);
      const r = rng.int(-2, 2);
      const c = rng.int(-3, 3);
      const b = -a * (r + 1);
      const u = linear(a, b);
      const expression = join(times(u, "eˣ"), num(c));
      const derivativeFactor = linear(a, a + b);
      const derivative = times(derivativeFactor, "eˣ");
      const fr = c - a * E ** r; // f(r) = (ar + b)e^r + c = −a·e^r + c
      const frText = r === 0 ? num(c - a) : join(kE(-a, r), num(c));
      const frExact = r === 0 ? c - a : null;
      const plusLimit = a > 0 ? "+∞" : "−∞";
      const otherLimit = a > 0 ? "−∞" : "+∞";
      const slope = a + b;
      const tangent = linear(slope, b + c);
      const left = a > 0 ? DEC : INC;
      const right = a > 0 ? INC : DEC;
      const frZero = frExact === 0;
      let roots: number;
      if (a > 0) roots = frZero ? 1 : fr > 0 ? 0 : 1 + (c > 0 ? 1 : 0);
      else roots = frZero ? 1 : fr < 0 ? 0 : 1 + (c < 0 ? 1 : 0);
      const frApprox = frExact !== null ? num(frExact) : `${num(Number(fr.toFixed(2))).replace(".", ",")} تقريباً`;
      const kind = a > 0 ? "الحدية الصغرى" : "الحدية العظمى";
      const solutionSteps: string[] = [
        `جدول التغيرات: f ${left} على ]−∞ ; ${num(r)}] و ${right} على [${num(r)} ; +∞[`,
        `القيمة ${kind} f(${num(r)}) = ${frText} = ${frApprox}`,
      ];
      if (frZero) {
        solutionSteps.push(`f(${num(r)}) = 0 وهي القيمة ${kind}، فالمعادلة تقبل حلاً وحيداً هو ${num(r)}`);
      } else if (roots === 0) {
        solutionSteps.push(
          a > 0
            ? `القيمة الصغرى f(${num(r)}) موجبة تماماً، إذن f(x) > 0 على ℝ ولا توجد حلول`
            : `القيمة العظمى f(${num(r)}) سالبة تماماً، إذن f(x) < 0 على ℝ ولا توجد حلول`
        );
      } else {
        solutionSteps.push(
          `على [${num(r)} ; +∞[: f مستمرة و رتيبة تماماً وتأخذ قيمها بين f(${num(r)}) و ${plusLimit}، و 0 بينهما، فحسب مبرهنة القيم المتوسطة يوجد حل وحيد`,
          roots === 2
            ? `على ]−∞ ; ${num(r)}]: f تأخذ قيمها بين ${num(c)} (النهاية عند −∞) و f(${num(r)})، و 0 بينهما، فيوجد حل وحيد آخر`
            : `على ]−∞ ; ${num(r)}]: f تأخذ قيمها بين ${num(c)} (النهاية عند −∞، غير مبلوغة) و f(${num(r)})، و 0 ليس بينهما، فلا حل هنا`
        );
      }
      solutionSteps.push(`عدد الحلول: ${roots}`);
      return {
        statement: `نعتبر الدالة f المعرفة على ℝ بـ: f(x) = ${expression}\nو (C) منحناها البياني في معلم متعامد ومتجانس.`,
        parts: [
          {
            skill: "exp_limits",
            difficulty: 1,
            type: "short",
            prompt: "احسب نهاية f(x) عندما يؤول x إلى −∞.",
            answer: num(c),
            steps: [
              `f(x) = ${join(mul(a, "xeˣ"), b === 0 ? "" : mul(b, "eˣ"), num(c))}`,
              "حسب التزايد المقارن xeˣ يؤول إلى 0 عند −∞، و eˣ يؤول إلى 0",
              `إذن النهاية = ${num(c)}، والمستقيم ذو المعادلة y = ${num(c)} مقارب أفقي لـ (C) عند −∞`,
            ],
          },
          {
            skill: "exp_limits",
            difficulty: 1,
            type: "mcq",
            prompt: "نهاية f(x) عندما يؤول x إلى +∞ هي:",
            answer: plusLimit,
            distractors: [
              { option: otherLimit, misconception: "exp_sign_error" },
              { option: num(c), misconception: "exp_limit_confusion" },
              { option: INDETERMINATE, misconception: "exp_indeterminate" },
            ],
            steps: [
              `عندما x → +∞: ${u} يؤول إلى ${plusLimit} و eˣ يؤول إلى +∞`,
              `بالجداء: (${u})eˣ يؤول إلى ${plusLimit}`,
              `إذن النهاية ${plusLimit}`,
            ],
          },
          {
            skill: "exp_derivative",
            difficulty: 2,
            type: "short",
            prompt: "احسب f′(x).",
            answer: derivative,
            steps: [
              `نشتق الجداء (uv)′ = u′v + uv′ مع u = ${u} و v = eˣ، أي u′ = ${num(a)} و v′ = eˣ`,
              `f′(x) = ${join(mul(a, "eˣ"), times(u, "eˣ"))}`,
              `نخرج eˣ عاملاً مشتركاً: f′(x) = ${derivative}`,
            ],
          },
          {
            skill: "exp_derivative",
            difficulty: 2,
            type: "short",
            prompt: `حلّ المعادلة f′(x) = 0، ثم احسب القيمة الحدية للدالة f (اكتب القيمة المضبوطة).`,
            answer: frText,
            steps: [
              `eˣ > 0 إذن إشارة f′(x) هي إشارة ${derivativeFactor}`,
              derivativeFactor === "x" ? "f′(x) = 0 يعني x = 0" : `${derivativeFactor} = 0 يعني x = ${num(r)}`,
              `عند x = ${num(r)}: ${u} = ${num(-a)}`,
              `f(${num(r)}) = ${join(`${paren(num(-a))} × ${eInt(r)}`, num(c))}`,
              `f(${num(r)}) = ${frText}`,
            ],
          },
          {
            skill: "exp_derivative",
            difficulty: 2,
            type: "short",
            prompt: "اكتب معادلة المماس (T) للمنحنى (C) في النقطة ذات الفاصلة 0 (اكتب ما يلي y =).",
            answer: tangent,
            accept: [`y = ${tangent}`, `y=${tangent}`],
            steps: [
              "y = f′(0)·x + f(0) (المماس عند الفاصلة 0)",
              `f′(0) = ${num(slope)} × e⁰ = ${num(slope)} و f(0) = ${join(`${num(b)} × e⁰`, num(c))} = ${num(b + c)}`,
              `(T): y = ${tangent}`,
            ],
          },
          {
            skill: "exp_equations",
            difficulty: 3,
            type: "short",
            prompt: "استعن بجدول تغيرات f لتحديد عدد حلول المعادلة f(x) = 0 في ℝ.",
            answer: String(roots),
            steps: solutionSteps,
          },
        ],
      };
    },
  },
  {
    id: "exp-auxiliary-study",
    title: "دالة مساعدة g ثم دراسة الدالة f",
    generate(rng: Rng) {
      // g(x) = eˣ − x + k (k ≥ 0) has minimum g(0) = 1 + k > 0;
      // f(x) = x + p + (x + q)e⁻ˣ with q = 1 − k gives f′(x) = e⁻ˣ·g(x).
      const k = rng.pick([0, 2, 3, 4]);
      const q = 1 - k;
      const p = rng.int(-4, 4);
      const g = join("eˣ", "−x", num(k));
      const factor = linear(1, q);
      const f = join("x", num(p), times(factor, "e⁻ˣ"));
      const derivative = join("1", times(linear(-1, k), "e⁻ˣ"));
      const asymptote = linear(1, p);
      const above = `]${num(-q)} ; +∞[`;
      return {
        statement: [
          `I) نعتبر الدالة g المعرفة على ℝ بـ: g(x) = ${g}`,
          `II) نعتبر الدالة f المعرفة على ℝ بـ: f(x) = ${f}`,
          "و (C) منحناها البياني في معلم متعامد ومتجانس.",
        ].join("\n"),
        parts: [
          {
            skill: "exp_derivative",
            difficulty: 1,
            type: "short",
            prompt: "I) 1) ادرس اتجاه تغير الدالة g، ثم احسب قيمتها الحدية الصغرى.",
            answer: num(1 + k),
            steps: [
              "g′(x) = eˣ − 1",
              "g′(x) = 0 يعني eˣ = 1 أي x = 0؛ g′(x) < 0 على ]−∞ ; 0[ و g′(x) > 0 على ]0 ; +∞[",
              `g متناقصة تماماً ثم متزايدة تماماً، وقيمتها الحدية الصغرى g(0) = ${join("e⁰", num(k))} = ${num(1 + k)}`,
              `بما أن ${num(1 + k)} > 0 فإن g(x) > 0 من أجل كل x من ℝ`,
            ],
          },
          {
            skill: "exp_limits",
            difficulty: 2,
            type: "mcq",
            prompt: "I) 2) نهاية g(x) عندما يؤول x إلى +∞ هي:",
            answer: "+∞",
            distractors: [
              { option: "0", misconception: "exp_growth_comparison" },
              { option: "−∞", misconception: "exp_growth_comparison" },
              { option: INDETERMINATE, misconception: "exp_indeterminate" },
            ],
            steps: [
              "eˣ − x حالة عدم تعيين من الشكل ∞ − ∞",
              `نكتب g(x) = ${join("eˣ(1 − x/eˣ)", num(k))} و x/eˣ يؤول إلى 0 (التزايد المقارن)`,
              "إذن النهاية +∞",
            ],
          },
          {
            skill: "exp_derivative",
            difficulty: 2,
            type: "short",
            prompt: "II) 1) احسب f′(x).",
            answer: derivative,
            accept: [times(g, "e⁻ˣ")],
            steps: [
              `(${times(factor, "e⁻ˣ")})′ = 1 × e⁻ˣ + (${factor})(−e⁻ˣ) = ${times(linear(-1, k), "e⁻ˣ")}`,
              `f′(x) = ${derivative}`,
              `نُخرج e⁻ˣ عاملاً مشتركاً (1 = eˣ·e⁻ˣ): f′(x) = e⁻ˣ(${g}) = e⁻ˣ·g(x)`,
            ],
          },
          {
            skill: "exp_derivative",
            difficulty: 2,
            type: "mcq",
            prompt: "II) 2) اعتماداً على إشارة g(x)، اتجاه تغير الدالة f على ℝ هو:",
            answer: `${INC} على ℝ`,
            distractors: [
              { option: `${DEC} على ℝ`, misconception: "exp_negative_values" },
              { option: `${DEC} على ]−∞ ; 0] و ${INC} على [0 ; +∞[`, misconception: "exp_aux_confusion" },
              { option: `${INC} على ]−∞ ; 0] و ${DEC} على [0 ; +∞[`, misconception: "exp_aux_confusion" },
            ],
            steps: [
              "f′(x) = e⁻ˣ·g(x)",
              "e⁻ˣ > 0 و g(x) > 0 من أجل كل x (السؤال I)",
              `إذن f′(x) > 0 و f ${INC} على ℝ`,
            ],
          },
          {
            skill: "exp_limits",
            difficulty: 2,
            type: "short",
            prompt: "II) 3) بيّن أن (C) يقبل مستقيماً مقارباً مائلاً (Δ) عند +∞، واكتب معادلته (اكتب ما يلي y =).",
            answer: asymptote,
            accept: [`y = ${asymptote}`, `y=${asymptote}`],
            steps: [
              `f(x) − ${p === 0 ? "x" : `(${asymptote})`} = ${times(factor, "e⁻ˣ")} = x/eˣ ${q < 0 ? "−" : "+"} ${num(Math.abs(q))}e⁻ˣ`,
              "x/eˣ يؤول إلى 0 و e⁻ˣ يؤول إلى 0 عندما x → +∞",
              `إذن (Δ): y = ${asymptote} مستقيم مقارب مائل لـ (C) عند +∞`,
            ],
          },
          {
            skill: "exp_inequalities",
            difficulty: 3,
            type: "mcq",
            prompt: "II) 4) المجال الذي يكون فيه (C) فوق المستقيم المقارب (Δ) هو:",
            answer: above,
            distractors: [
              { option: `]−∞ ; ${num(-q)}[`, misconception: "exp_inequality_direction" },
              { option: `]${num(q)} ; +∞[`, misconception: "exp_sign_error" },
              { option: "ℝ", misconception: "exp_positive_ignored" },
            ],
            steps: [
              `ندرس إشارة الفرق f(x) − ${p === 0 ? "x" : `(${asymptote})`} = ${times(factor, "e⁻ˣ")}`,
              `e⁻ˣ > 0 دائماً، فإشارة الفرق هي إشارة ${factor}`,
              `${factor} > 0 يعني x > ${num(-q)}`,
              `إذن (C) فوق (Δ) على ${above}، وتحته على ]−∞ ; ${num(-q)}[، ويقطعه في النقطة ذات الفاصلة ${num(-q)}`,
            ],
          },
        ],
      };
    },
  },
];
