// BAC-style problems for "الاشتقاق" (see ../problems.ts for the pattern).
import { frac, fracMonomial, join, linear, mul, num, poly, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

const INC = "متزايدة تماماً";
const DEC = "متناقصة تماماً";

/** (x − r) written as a teacher would: x, (x − 2), (x + 3). */
const factor = (r: number) => (r === 0 ? "x" : `(${linear(1, -r)})`);
const interval = (a: number, b: number) => `]${num(Math.min(a, b))} ; ${num(Math.max(a, b))}[`;

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
  {
    // "إيجاد الثوابت": the classic BAC opening — find a function's
    // parameters from what its curve does.
    id: "find-constants",
    title: "تعيين الثوابت انطلاقاً من معطيات المنحنى",
    generate(rng: Rng) {
      const x1 = rng.pick([-2, -1, 1, 2]);
      const a = rng.pick([-4, -2, 2, 4]);
      const b = (-3 * a * x1) / 2;
      const c = rng.int(-5, 5);
      const f = (x: number) => a * x ** 3 + b * x ** 2 + c;
      const y1 = f(x1);
      const between = a > 0 ? DEC : INC;
      return {
        statement: [
          "f دالة معرفة على ℝ بـ: f(x) = ax³ + bx² + c حيث a و b و c أعداد حقيقية،",
          "و (C) تمثيلها البياني. نعلم أن:",
          `• (C) يشمل النقطة A(0 ; ${num(c)})،`,
          `• (C) يقبل في النقطة B(${num(x1)} ; ${num(y1)}) مماساً موازياً لمحور الفواصل.`,
        ].join("\n"),
        parts: [
          {
            skill: "function_values",
            difficulty: 1,
            type: "short",
            prompt: "استعمل النقطة A لتعيين قيمة c.",
            answer: num(c),
            steps: ["A ∈ (C) يعني f(0) = " + num(c), `f(0) = a×0 + b×0 + c = c، إذن c = ${num(c)}`],
          },
          {
            skill: "derivative_meaning",
            difficulty: 2,
            type: "mcq",
            prompt: `الشرط «(C) يقبل مماساً موازياً لمحور الفواصل في النقطة ذات الفاصلة ${num(x1)}» يُترجم بـ:`,
            answer: `ميل المماس معدوم: f′(${num(x1)}) = 0`,
            distractors: [
              { option: "المنحنى يقطع محور الفواصل في النقطة B", misconception: "tangent_slope_confusion" },
              { option: "ميل المماس يساوي ترتيب النقطة B", misconception: "tangent_slope_confusion" },
              { option: "المماس يشمل مبدأ المعلم O", misconception: "tangent_formula_error" },
            ],
            steps: [
              "المماس الموازي لمحور الفواصل ميله (معامل توجيهه) معدوم",
              `والميل في النقطة ذات الفاصلة ${num(x1)} هو f′(${num(x1)})، إذن f′(${num(x1)}) = 0`,
            ],
          },
          {
            skill: "power_rule",
            difficulty: 2,
            type: "mcq",
            prompt: `f′(x) = 3ax² + 2bx. الشرط f′(${num(x1)}) = 0 يعطي:`,
            answer: `b = ${fracMonomial(-3 * x1, 2, 1, "a")}`,
            distractors: [
              { option: `b = ${fracMonomial(3 * x1, 2, 1, "a")}`, misconception: "function_eval_error" },
              { option: `b = ${fracMonomial(-x1, 1, 1, "a")}`, misconception: "power_no_coefficient" },
              { option: `a = ${fracMonomial(-3 * x1, 2, 1, "b")}`, misconception: "function_eval_error" },
            ],
            steps: [
              `f′(${num(x1)}) = 3a×(${num(x1)})² + 2b×(${num(x1)}) = ${num(3 * x1 * x1)}a ${2 * x1 < 0 ? "−" : "+"} ${num(Math.abs(2 * x1))}b`,
              `f′(${num(x1)}) = 0 يعطي b = ${fracMonomial(-3 * x1, 2, 1, "a")}`,
            ],
          },
          {
            skill: "linearity",
            difficulty: 3,
            type: "short",
            prompt: `استعمل أيضاً f(${num(x1)}) = ${num(y1)}، ثم احسب a.`,
            answer: num(a),
            steps: [
              `من العلاقة السابقة: b = ${fracMonomial(-3 * x1, 2, 1, "a")}`,
              `f(${num(x1)}) = ${num(y1)} يعطي ${join(mul(x1 ** 3, "a"), mul(x1 * x1, "b"), num(c))} = ${num(y1)}`,
              `نعوّض b: ${join(mul(x1 ** 3, "a"), fracMonomial(-3 * x1 ** 3, 2, 1, "a"))} = ${num(y1 - c)}، أي ${fracMonomial(-(x1 ** 3), 2, 1, "a")} = ${num(y1 - c)}`,
              `a = ${num(a)} ثم b = ${num(b)}`,
            ],
          },
          {
            skill: "linearity",
            difficulty: 2,
            type: "short",
            prompt: "استنتج قيمة b.",
            answer: num(b),
            steps: [`b = ${frac(-3 * x1, 2)} × ${num(a)} = ${num(b)}`],
          },
          {
            skill: "variations",
            difficulty: 3,
            type: "mcq",
            prompt: `اتجاه تغير f على المجال ${interval(0, x1)} هو:`,
            answer: between,
            distractors: [
              { option: between === INC ? DEC : INC, misconception: "sign_variation_confusion" },
              { option: "ثابتة", misconception: "sign_variation_confusion" },
              { option: "متزايدة ثم متناقصة", misconception: "sign_variation_confusion" },
            ],
            steps: [
              `f′(x) = ${poly([[2, 3 * a], [1, 2 * b]])} = ${num(3 * a)}x${factor(x1)}`,
              `بين 0 و ${num(x1)} يكون x${factor(x1)} < 0، فإشارة f′(x) عكس إشارة ${num(3 * a)}`,
              `إذن f ${between} على ${interval(0, x1)}`,
            ],
          },
        ],
      };
    },
  },
  {
    // Homographic function: quotient rule, tangent, centre of symmetry.
    id: "homographic-study",
    title: "دراسة دالة تناظرية (كسرية)",
    generate(rng: Rng) {
      let a = 0;
      let b = 0;
      let c = 0;
      do {
        a = rng.nonZero(-4, 4);
        b = rng.int(-6, 6);
        c = rng.nonZero(-4, 4);
      } while (a * c - b === 0);
      const n = a * c - b;
      const denominator = `(${linear(1, c)})`;
      const f0 = frac(b, c);
      const slope0 = frac(n, c * c);
      const tangent = join(fracMonomial(n, c * c, 1), f0);
      const each = n > 0 ? "متزايدة تماماً على كل مجال من مجالي تعريفها" : "متناقصة تماماً على كل مجال من مجالي تعريفها";
      const other = n > 0 ? "متناقصة تماماً على كل مجال من مجالي تعريفها" : "متزايدة تماماً على كل مجال من مجالي تعريفها";
      return {
        statement: `نعتبر الدالة f المعرفة بـ: f(x) = (${linear(a, b)})/${denominator}\nو (C) تمثيلها البياني في معلم متعامد ومتجانس.`,
        parts: [
          {
            skill: "function_values",
            difficulty: 1,
            type: "short",
            prompt: "ما هي القيمة التي ينعدم عندها المقام (f غير معرفة عندها)؟",
            answer: num(-c),
            steps: [`${linear(1, c)} = 0 يعني x = ${num(-c)}، إذن f معرفة على ℝ − {${num(-c)}}`],
          },
          {
            skill: "product_quotient",
            difficulty: 2,
            type: "mcq",
            prompt: "مشتقة الدالة f هي:",
            answer: `${num(n)}/${denominator}²`,
            distractors: [
              { option: `${num(-n)}/${denominator}²`, misconception: "quotient_sign" },
              { option: `${num(n)}/${denominator}`, misconception: "quotient_denominator" },
              { option: `${num(a)}`, misconception: "product_as_product_of_derivatives" },
            ],
            steps: [
              "(u/v)′ = (u′v − uv′)/v² مع u = " + linear(a, b) + " و v = " + linear(1, c),
              `u′v − uv′ = ${mul(a, denominator)} − (${linear(a, b)}) = ${num(n)}`,
              `f′(x) = ${num(n)}/${denominator}²`,
            ],
          },
          {
            skill: "product_quotient",
            difficulty: 2,
            type: "short",
            prompt: "احسب f′(0).",
            answer: slope0,
            steps: [`f′(0) = ${num(n)}/(${num(c)})² = ${slope0}`],
          },
          {
            skill: "variations",
            difficulty: 2,
            type: "mcq",
            prompt: "اتجاه تغير الدالة f:",
            answer: each,
            distractors: [
              { option: other, misconception: "sign_variation_confusion" },
              { option: "متزايدة ثم متناقصة", misconception: "sign_variation_confusion" },
              { option: "ثابتة على ℝ", misconception: "sign_variation_confusion" },
            ],
            steps: [`المقام مربع موجب، فإشارة f′(x) هي إشارة ${num(n)}`, `إذن f ${each}`],
          },
          {
            skill: "tangent_line",
            difficulty: 3,
            type: "short",
            prompt: "اكتب معادلة المماس (T) للمنحنى (C) في النقطة ذات الفاصلة 0 (اكتب ما يلي y =).",
            answer: tangent,
            accept: [`y = ${tangent}`, `y=${tangent}`],
            steps: [`y = f′(0)·x + f(0) مع f′(0) = ${slope0} و f(0) = ${f0}`, `(T): y = ${tangent}`],
          },
          {
            skill: "function_values",
            difficulty: 3,
            type: "short",
            prompt: "المنحنى (C) يقبل مركز تناظر ω(α ; β). احسب β.",
            answer: num(a),
            steps: [
              `نكتب f(x) = ${join(num(a), `${num(b - a * c)}/${denominator}`)} (بالقسمة)`,
              `إذن (C) هو صورة منحنى الدالة x ↦ ${num(b - a * c)}/x بالانسحاب، ومركز تناظره ω(${num(-c)} ; ${num(a)})`,
              `β = ${num(a)}`,
            ],
          },
        ],
      };
    },
  },
];
