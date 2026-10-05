// BAC-style problems for "النهايات والاستمرارية" (see ../problems.ts for the
// pattern): limits at the bounds of the domain, then the asymptotes and the
// relative position of the curve and its oblique asymptote.
import { linear, num, paren, poly, signed, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

const inf = (sign: number) => (sign > 0 ? "+∞" : "−∞");
const ABOVE = "(C) فوق (Δ)";
const BELOW = "(C) تحت (Δ)";

export const limitsProblems: ProblemGenerator[] = [
  {
    id: "rational-oblique-asymptote",
    title: "نهايات دالة ناطقة ومستقيماتها المقاربة",
    generate(rng: Rng) {
      // f(x) = ax + m + k/(x − c), written as one fraction.
      const a = rng.pick([1, 2, -1]);
      const c = rng.nonZero(-3, 3);
      const m = rng.int(-4, 4);
      const k = rng.nonZero(-6, 6);
      const numerator = poly([[2, a], [1, m - a * c], [0, k - m * c]]);
      const den = linear(1, -c);
      const slant = linear(a, m);
      const remainder = `${num(k)}/(${den})`;
      const left = k > 0 ? BELOW : ABOVE;
      return {
        statement:
          `نعتبر الدالة f المعرفة على ℝ − {${num(c)}} بـ: f(x) = (${numerator})/(${den})\n` +
          "و (C) منحناها البياني في معلم متعامد ومتجانس.",
        parts: [
          {
            skill: "rational_limits_infinity",
            difficulty: 1,
            type: "mcq",
            prompt: "احسب lim (x → +∞) f(x).",
            answer: inf(a),
            distractors: [
              { option: inf(-a), misconception: "leading_sign_error" },
              { option: num(a), misconception: "degree_comparison_error" },
              { option: "0", misconception: "degree_comparison_error" },
            ],
            steps: [
              "بالتعويض نجد حالة عدم تعيين من الشكل ∞/∞",
              `عند +∞ نهاية الدالة الناطقة هي نهاية حاصل قسمة الحدين الأعليين درجة: ${poly([[2, a]])}/x = ${poly([[1, a]])}`,
              `lim (x → +∞) ${poly([[1, a]])} = ${inf(a)}`,
            ],
          },
          {
            skill: "limits_at_point",
            difficulty: 2,
            type: "mcq",
            prompt: `احسب lim f(x) لما x → ${num(c)} و x > ${num(c)}.`,
            answer: inf(k),
            distractors: [
              { option: inf(-k), misconception: "denominator_sign_forgotten" },
              { option: "0", misconception: "number_over_zero_zero" },
              { option: num(k), misconception: "ignore_zero_denominator" },
            ],
            steps: [
              `نهاية البسط لما x → ${num(c)}: نعوّض فنجد ${num(k)}`,
              `لما x > ${num(c)} يكون ${den} > 0، فالمقام يؤول إلى 0⁺`,
              `${num(k)} على 0⁺ يعطي ${inf(k)}`,
            ],
          },
          {
            skill: "asymptotes",
            difficulty: 1,
            type: "short",
            prompt: "استنتج معادلة المستقيم المقارب العمودي للمنحنى (C).",
            answer: `x = ${num(c)}`,
            steps: [
              `نهاية f لما x يؤول إلى ${num(c)} لانهائية`,
              `إذن المستقيم ذو المعادلة x = ${num(c)} مقارب عمودي للمنحنى (C)`,
            ],
          },
          {
            skill: "asymptotes",
            difficulty: 2,
            type: "short",
            prompt: `عيّن الأعداد الحقيقية α و β و γ بحيث من أجل كل x ≠ ${num(c)}: f(x) = αx + β + γ/(${den})، ثم أعط قيمة γ.`,
            answer: num(k),
            steps: [
              `نقسم البسط على ${den} (أو نوحّد المقامات ونطابق): ${numerator} = ${paren(slant)}(${den}) ${signed(k)}`,
              `إذن f(x) = ${slant} ${signed(k)}/(${den})`,
              `α = ${num(a)} و β = ${num(m)} و γ = ${num(k)}`,
            ],
          },
          {
            skill: "asymptotes",
            difficulty: 2,
            type: "short",
            prompt: "احسب lim (x → ±∞) [f(x) − (αx + β)]، ثم استنتج معادلة المستقيم المقارب المائل (Δ) (اكتب y = …).",
            answer: `y = ${slant}`,
            accept: [slant],
            steps: [
              `f(x) − (${slant}) = ${remainder}`,
              `lim (x → ±∞) ${remainder} = 0 لأن المقام يؤول إلى ±∞`,
              `إذن المستقيم (Δ): y = ${slant} مقارب مائل للمنحنى (C) عند +∞ وعند −∞`,
            ],
          },
          {
            skill: "asymptotes",
            difficulty: 3,
            type: "mcq",
            prompt: `الوضع النسبي للمنحنى (C) والمستقيم (Δ) على المجال ]−∞ ; ${num(c)}[ هو:`,
            answer: left,
            distractors: [
              { option: left === BELOW ? ABOVE : BELOW, misconception: "denominator_sign_forgotten" },
              { option: "(C) يقطع (Δ) في نقطة وحيدة", misconception: "asymptote_type_confusion" },
              { option: "(C) ينطبق على (Δ)", misconception: "oblique_constant_forgotten" },
            ],
            steps: [
              `ندرس إشارة الفرق: f(x) − (${slant}) = ${remainder}`,
              `على ]−∞ ; ${num(c)}[ يكون ${den} < 0`,
              `البسط ${num(k)} ${k > 0 ? "موجب" : "سالب"}، فالفرق ${k > 0 ? "سالب" : "موجب"}`,
              `إذن ${left} على ]−∞ ; ${num(c)}[`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "radical-asymptotes",
    title: "دالة بجذر تربيعي: المرافق والمستقيمات المقاربة",
    generate(rng: Rng) {
      // f(x) = sx + q + √(x² + p); f → +∞ on the side A, → q on the side B.
      const s = rng.pick([1, -1]);
      const q = rng.int(-5, 5);
      const p = rng.int(1, 9);
      const root = `√(x² + ${p})`;
      const f = `${linear(s, q)} + ${root}`;
      const A = inf(s);
      const B = inf(-s);
      const sx = s > 0 ? "x" : "−x";
      // √(x² + p) − sx and √(x² + p) + sx, written without "− −".
      const rootMinus = s > 0 ? `${root} − x` : `${root} + x`;
      const rootPlus = s > 0 ? `${root} + x` : `${root} − x`;
      const slant = linear(2 * s, 0);
      const delta = linear(2 * s, q);
      const shifted = s > 0 ? "f(x) − 2x" : "f(x) + 2x";
      return {
        statement:
          `نعتبر الدالة f المعرفة على ℝ بـ: f(x) = ${f}\n` +
          "و (C) منحناها البياني في معلم متعامد ومتجانس.",
        parts: [
          {
            skill: "poly_limits_infinity",
            difficulty: 1,
            type: "mcq",
            prompt: `احسب lim (x → ${A}) f(x).`,
            answer: "+∞",
            distractors: [
              { option: "−∞", misconception: "leading_sign_error" },
              { option: "0", misconception: "inf_minus_inf_zero" },
              q === 0
                ? { option: "1", misconception: "inf_over_inf_one" }
                : { option: num(q), misconception: "constant_term_instead_of_leading" },
            ],
            steps: [
              `lim (x → ${A}) (${linear(s, q)}) = +∞ و lim (x → ${A}) ${root} = +∞`,
              `مجموع نهايتين +∞ هو +∞، إذن lim (x → ${A}) f(x) = +∞`,
            ],
          },
          {
            skill: "indeterminate_forms",
            difficulty: 2,
            type: "short",
            prompt: `احسب lim (x → ${B}) f(x).`,
            answer: num(q),
            steps: [
              `عند ${B}: ${sx} → −∞ و ${root} → +∞، فنجد حالة عدم تعيين من الشكل ∞ − ∞`,
              `نضرب في المرافق: ${sx} + ${root} = ((${root})² − x²)/(${rootMinus}) = ${p}/(${rootMinus})`,
              `المقام ${rootMinus} يؤول إلى +∞ عند ${B}، إذن ${p}/(${rootMinus}) → 0`,
              `lim (x → ${B}) f(x) = ${num(q)}`,
            ],
          },
          {
            skill: "asymptotes",
            difficulty: 1,
            type: "short",
            prompt: `استنتج معادلة المستقيم المقارب الأفقي للمنحنى (C) عند ${B}.`,
            answer: `y = ${num(q)}`,
            steps: [
              `lim (x → ${B}) f(x) = ${num(q)} عدد حقيقي`,
              `إذن المستقيم ذو المعادلة y = ${num(q)} مقارب أفقي للمنحنى (C) عند ${B}`,
            ],
          },
          {
            skill: "indeterminate_forms",
            difficulty: 2,
            type: "short",
            prompt: `احسب lim (x → ${A}) [${shifted}].`,
            answer: num(q),
            steps: [
              `${shifted} = ${num(q)} + ${rootMinus}`,
              `عند ${A} نجد ∞ − ∞، فنضرب في المرافق: ${rootMinus} = ${p}/(${rootPlus})`,
              `المقام ${rootPlus} يؤول إلى +∞ عند ${A}، إذن ${rootMinus} → 0`,
              `lim (x → ${A}) [${shifted}] = ${num(q)}`,
            ],
          },
          {
            skill: "asymptotes",
            difficulty: 2,
            type: "short",
            prompt: `استنتج معادلة المستقيم المقارب المائل (Δ) للمنحنى (C) عند ${A} (اكتب y = …).`,
            answer: `y = ${delta}`,
            accept: [delta],
            steps: [
              `وجدنا lim (x → ${A}) [f(x) − (${slant})] = ${num(q)}`,
              `إذن lim (x → ${A}) [f(x) − (${delta})] = 0`,
              `المستقيم (Δ): y = ${delta} مقارب مائل للمنحنى (C) عند ${A}`,
            ],
          },
          {
            skill: "asymptotes",
            difficulty: 3,
            type: "mcq",
            prompt: "الوضع النسبي للمنحنى (C) والمستقيم (Δ) هو:",
            answer: `${ABOVE} على ℝ`,
            distractors: [
              { option: `${BELOW} على ℝ`, misconception: "conjugate_error" },
              { option: "(C) فوق (Δ) على ]0 ; +∞[ وتحته على ]−∞ ; 0[", misconception: "denominator_sign_forgotten" },
              { option: "(C) يقطع (Δ) في النقطة ذات الفاصلة 0", misconception: "asymptote_type_confusion" },
            ],
            steps: [
              `f(x) − (${delta}) = ${rootMinus} = ${p}/(${rootPlus})`,
              `من أجل كل x: ${root} > √(x²) = |x|، إذن ${rootPlus} > 0`,
              `البسط ${p} موجب، فالفرق موجب تماماً على ℝ`,
              `إذن ${ABOVE} على ℝ`,
            ],
          },
        ],
      };
    },
  },
];
