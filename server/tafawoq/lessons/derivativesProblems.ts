// BAC-style problems for "الاشتقاق" (see ../problems.ts for the pattern).
import { linear, num, poly, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

const INC = "متزايدة تماماً";
const DEC = "متناقصة تماماً";

/** (x − r) written as a teacher would: x, (x − 2), (x + 3). */
const factor = (r: number) => (r === 0 ? "x" : `(${linear(1, -r)})`);

export const derivativeProblems: ProblemGenerator[] = [
  {
    id: "cubic-study",
    title: "دراسة دالة كثير حدود من الدرجة الثالثة",
    generate(rng: Rng) {
      let r1 = 0;
      let r2 = 0;
      do {
        r1 = rng.int(-4, 3);
        r2 = rng.int(r1 + 1, 4);
      } while ((r1 + r2) % 2 !== 0);
      const k = rng.pick([1, -1]);
      const c = rng.int(-6, 6);
      const a = (-3 * (r1 + r2)) / 2;
      const b = 3 * r1 * r2;
      const f = (x: number) => k * (x ** 3 + a * x ** 2 + b * x) + c;
      const fp = (x: number) => k * (3 * x ** 2 + 2 * a * x + b);
      const expression = poly([[3, k], [2, k * a], [1, k * b], [0, c]]);
      const derivative = poly([[2, 3 * k], [1, 2 * k * a], [0, k * b]]);
      const factored = `${num(3 * k)}${factor(r1)}${factor(r2)}`;
      const x0 = rng.pick([-1, 1, 2].filter(value => value !== r1 && value !== r2));
      const slope = fp(x0);
      const tangent = linear(slope, f(x0) - slope * x0);
      const between = k > 0 ? DEC : INC;
      const max = k > 0 ? f(r1) : f(r2);
      const min = k > 0 ? f(r2) : f(r1);
      const roots = max > 0 && min < 0 ? 3 : max === 0 || min === 0 ? 2 : 1;
      return {
        statement: `نعتبر الدالة f المعرفة على ℝ بـ: f(x) = ${expression}\nو (C) منحناها البياني في معلم متعامد ومتجانس.`,
        parts: [
          {
            skill: "linearity",
            difficulty: 1,
            type: "short",
            prompt: "احسب f′(x).",
            answer: derivative,
            steps: [`نشتق حداً بحد: f′(x) = ${derivative}`],
          },
          {
            skill: "variations",
            difficulty: 2,
            type: "short",
            prompt: "حلّ المعادلة f′(x) = 0، ثم اكتب الحل الأكبر.",
            answer: num(r2),
            steps: [
              `f′(x) = ${derivative} = ${factored}`,
              `f′(x) = 0 يعني x = ${num(r1)} أو x = ${num(r2)}`,
              `الحل الأكبر هو ${num(r2)}`,
            ],
          },
          {
            skill: "variations",
            difficulty: 2,
            type: "mcq",
            prompt: `اتجاه تغير الدالة f على المجال ]${num(r1)} ; ${num(r2)}[ هو:`,
            answer: between,
            distractors: [
              { option: between === INC ? DEC : INC, misconception: "sign_variation_confusion" },
              { option: "ثابتة", misconception: "sign_variation_confusion" },
              { option: "متزايدة ثم متناقصة", misconception: "sign_variation_confusion" },
            ],
            steps: [
              `بين الجذرين ${num(r1)} و ${num(r2)} إشارة ${factored} عكس إشارة معامل x² (${num(3 * k)})`,
              `إذن f′(x) ${k > 0 ? "<" : ">"} 0 على ]${num(r1)} ; ${num(r2)}[، و f ${between} عليه`,
            ],
          },
          {
            skill: "function_values",
            difficulty: 2,
            type: "short",
            prompt: `احسب القيمة المحلية f(${num(r1)}).`,
            answer: num(f(r1)),
            steps: [`نعوّض x بـ ${num(r1)} في عبارة f(x)`, `f(${num(r1)}) = ${num(f(r1))}`],
          },
          {
            skill: "tangent_line",
            difficulty: 3,
            type: "short",
            prompt: `اكتب معادلة المماس (T) للمنحنى (C) في النقطة ذات الفاصلة ${num(x0)} (اكتب ما يلي y =).`,
            answer: tangent,
            accept: [`y = ${tangent}`, `y=${tangent}`],
            steps: [
              `y = f′(${num(x0)})(x − x₀) + f(${num(x0)}) مع x₀ = ${num(x0)}`,
              `f′(${num(x0)}) = ${num(slope)} و f(${num(x0)}) = ${num(f(x0))}`,
              `(T): y = ${tangent}`,
            ],
          },
          {
            skill: "variations",
            difficulty: 3,
            type: "mcq",
            prompt: "عدد حلول المعادلة f(x) = 0 في ℝ هو:",
            answer: String(roots),
            distractors: ["0", "1", "2", "3"]
              .filter(option => option !== String(roots))
              .map(option => ({ option, misconception: "sign_variation_confusion" })),
            steps: [
              `القيمة الحدية العظمى المحلية ${num(max)} والصغرى المحلية ${num(min)}`,
              roots === 3
                ? "العظمى موجبة والصغرى سالبة، فالمنحنى يقطع محور الفواصل ثلاث مرات"
                : roots === 2
                  ? "إحدى القيمتين الحديتين معدومة: المنحنى يمس محور الفواصل في نقطة ويقطعه في أخرى"
                  : "للقيمتين الحديتين نفس الإشارة، فالمنحنى يقطع محور الفواصل مرة واحدة فقط",
              `عدد الحلول: ${roots}`,
            ],
          },
        ],
      };
    },
  },
];
