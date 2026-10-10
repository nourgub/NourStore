// BAC-style problems for "الدالة اللوغاريتمية النيبيرية" (see ../problems.ts for the pattern).
import { join, linear, mul, num, sup, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

/** e^k for an integer k: "1", "e", "e²", "e⁻³". */
const eInt = (k: number) => (k === 0 ? "1" : k === 1 ? "e" : `e${sup(k)}`);

const COUNT_OPTIONS = ["0", "1", "2", "3"];

export const logarithmProblems: ProblemGenerator[] = [
  {
    id: "ln-function-study",
    title: "دراسة دالة لوغاريتمية",
    generate(rng: Rng) {
      // f(x) = ax + b + c·ln x with c = −a·x0 < 0: a minimum at x0.
      const a = rng.int(1, 3);
      const x0 = rng.int(1, 3);
      const b = rng.int(-5, 5);
      const c = -a * x0;
      const expression = join(mul(a, "x"), num(b), mul(c, "ln x"));
      const derivative = `(${linear(a, c)})/x`;
      const K = a * x0 + b;
      const minText = x0 === 1 ? num(K) : join(num(K), mul(c, `ln ${x0}`));
      const minValue = K + c * Math.log(x0);
      const roots = Math.abs(minValue) < 1e-9 ? 1 : minValue < 0 ? 2 : 0;
      const slope = a + c;
      const tangent = linear(slope, b - c);
      return {
        statement: `نعتبر الدالة f المعرفة على ]0 ; +∞[ بـ: f(x) = ${expression}\nو (C_f) منحناها البياني في معلم متعامد ومتجانس.`,
        parts: [
          {
            skill: "ln_limits",
            difficulty: 1,
            type: "mcq",
            prompt: "نهاية f(x) عندما يؤول x إلى 0 بقيم أكبر (x → 0⁺) هي:",
            answer: "+∞",
            distractors: [
              { option: "−∞", misconception: "ln_limit_confusion" },
              { option: "0", misconception: "ln_zero" },
              { option: "حالة عدم تعيين", misconception: "ln_indeterminate" },
            ],
            steps: [
              `${mul(a, "x")} ${b === 0 ? "" : `${b < 0 ? "−" : "+"} ${num(Math.abs(b))} `}يؤول إلى ${num(b)}`.replace(/\s+/g, " "),
              `ln x → −∞ عند 0⁺، و ${num(c)} < 0 إذن ${mul(c, "ln x")} → +∞`,
              "لا توجد حالة عدم تعيين: lim f(x) = +∞ عند 0⁺ (محور التراتيب مقارب عمودي)",
            ],
          },
          {
            skill: "ln_limits",
            difficulty: 2,
            type: "mcq",
            prompt: "نهاية f(x) عندما يؤول x إلى +∞ هي:",
            answer: "+∞",
            distractors: [
              { option: "−∞", misconception: "ln_growth" },
              { option: "0", misconception: "ln_limit_bounded" },
              { option: "حالة عدم تعيين", misconception: "ln_indeterminate" },
            ],
            steps: [
              `${mul(a, "x")} → +∞ و ${mul(c, "ln x")} → −∞: حالة عدم تعيين من الشكل ∞ − ∞`,
              `نكتب f(x) = x(${join(num(a), b === 0 ? "0" : `${num(b)}/x`, mul(c, "ln x/x"))})`,
              `ln x/x → 0 (التزايد المقارن)، فما بين القوسين يؤول إلى ${num(a)} > 0`,
              "إذن lim f(x) = +∞ عند +∞",
            ],
          },
          {
            skill: "ln_derivative",
            difficulty: 1,
            type: "short",
            prompt: "احسب f′(x) من أجل x > 0، واكتبها على شكل كسر واحد.",
            answer: derivative,
            accept: [`${num(a)} − ${num(-c)}/x`],
            steps: [
              `(${mul(a, "x")})′ = ${num(a)}${b === 0 ? "" : ` و (${num(b)})′ = 0`} و (${mul(c, "ln x")})′ = ${num(c)}/x`,
              `f′(x) = ${num(a)} − ${num(-c)}/x`,
              `نوحد المقامات: f′(x) = ${derivative}`,
            ],
          },
          {
            skill: "ln_derivative",
            difficulty: 2,
            type: "short",
            prompt: "ادرس إشارة f′(x)، ثم استنتج القيمة الحدية الصغرى للدالة f.",
            answer: minText,
            steps: [
              `x > 0 فإشارة f′(x) هي إشارة ${linear(a, c)}، وهي تنعدم عند x = ${num(x0)}`,
              `f′(x) < 0 على ]0 ; ${num(x0)}[ و f′(x) > 0 على ]${num(x0)} ; +∞[`,
              `f متناقصة تماماً ثم متزايدة تماماً: تقبل قيمة حدية صغرى عند x = ${num(x0)}`,
              x0 === 1
                ? `f(1) = ${join(num(a), num(b), `${num(c)}×ln 1`)} = ${minText}`
                : `f(${num(x0)}) = ${join(num(a * x0), num(b), mul(c, `ln ${x0}`))} = ${minText}`,
            ],
          },
          {
            skill: "ln_derivative",
            difficulty: 2,
            type: "short",
            prompt: "اكتب معادلة المماس (T) للمنحنى (C_f) في النقطة ذات الفاصلة 1 (اكتب ما يلي y =).",
            answer: tangent,
            accept: [`y = ${tangent}`, `y=${tangent}`],
            steps: [
              "y = f′(1)(x − 1) + f(1)",
              `f(1) = ${num(a + b)} (لأن ln 1 = 0) و f′(1) = ${num(a)} − ${num(-c)} = ${num(slope)}`,
              `(T): y = ${tangent}`,
            ],
          },
          {
            skill: "ln_limits",
            difficulty: 3,
            type: "mcq",
            prompt: "عدد حلول المعادلة f(x) = 0 في ]0 ; +∞[ هو:",
            answer: String(roots),
            distractors: COUNT_OPTIONS.filter(option => option !== String(roots)).map(option => ({
              option,
              misconception: option === "3" ? "ln_limit_confusion" : "ln_sign_error",
            })),
            steps: [
              `القيمة الحدية الصغرى f(${num(x0)}) = ${minText}${x0 === 1 ? "" : ` ≈ ${num(Number(minValue.toFixed(2)))}`}`,
              "و lim f = +∞ عند 0⁺ وعند +∞",
              roots === 2
                ? "القيمة الصغرى سالبة: f مستمرة ورتيبة تماماً على كل مجال، فحسب مبرهنة القيم المتوسطة يقطع (C_f) محور الفواصل مرة على ]0 ; " +
                  `${num(x0)}[ ومرة على ]${num(x0)} ; +∞[`
                : roots === 1
                  ? "القيمة الصغرى معدومة: المنحنى يمس محور الفواصل في نقطة واحدة"
                  : "القيمة الصغرى موجبة: f(x) > 0 دائماً، فالمنحنى لا يقطع محور الفواصل",
              `عدد الحلول: ${roots}`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "ln-squared-chain",
    title: "معادلات ومتراجحات لوغاريتمية متسلسلة",
    generate(rng: Rng) {
      // f(x) = (ln x)² − s·ln x + p with roots r1 < r2 of t² − st + p, s even.
      let r1 = 0;
      let r2 = 0;
      do {
        r1 = rng.int(-4, 3);
        r2 = rng.int(r1 + 1, 4);
      } while ((r2 - r1) % 2 !== 0);
      const s = r1 + r2;
      const p = r1 * r2;
      const expression = join("(ln x)²", s === 0 ? "0" : mul(-s, "ln x"), num(p));
      const polynomial = join("t²", s === 0 ? "0" : mul(-s, "t"), num(p));
      const atInvE = 1 + s + p;
      const derivative = `(${join("2ln x", num(-s))})/x`;
      const half = s / 2;
      const minValue = p - half * half;
      const e1 = eInt(r1);
      const e2 = eInt(r2);
      const strict = rng.chance(0.5);
      const inequality = strict
        ? {
            sign: ">",
            answer: `]0 ; ${e1}[ ∪ ]${e2} ; +∞[`,
            distractors: [
              { option: `]−∞ ; ${num(r1)}[ ∪ ]${num(r2)} ; +∞[`, misconception: "ln_exp_inverse" },
              { option: `]${e1} ; ${e2}[`, misconception: "ln_inequality_direction" },
              { option: `]−∞ ; ${e1}[ ∪ ]${e2} ; +∞[`, misconception: "ln_domain_forgot" },
            ],
            tSet: `t < ${num(r1)} أو t > ${num(r2)}`,
            xSet: `0 < x < ${e1} أو x > ${e2}`,
          }
        : {
            sign: "≤",
            answer: `[${e1} ; ${e2}]`,
            distractors: [
              { option: `[${num(r1)} ; ${num(r2)}]`, misconception: "ln_exp_inverse" },
              { option: `]0 ; ${e1}] ∪ [${e2} ; +∞[`, misconception: "ln_inequality_direction" },
              { option: `]−∞ ; ${e1}] ∪ [${e2} ; +∞[`, misconception: "ln_domain_forgot" },
            ],
            tSet: `${num(r1)} ≤ t ≤ ${num(r2)}`,
            xSet: `${e1} ≤ x ≤ ${e2}`,
          };
      return {
        statement: `نعتبر الدالة f المعرفة على ]0 ; +∞[ بـ: f(x) = ${expression}\nونضع t = ln x.`,
        parts: [
          {
            skill: "ln_properties",
            difficulty: 1,
            type: "short",
            prompt: "احسب f(1/e).",
            answer: num(atInvE),
            steps: [
              "ln(1/e) = −ln e = −1",
              `f(1/e) = (−1)² ${s === 0 ? "" : `${-s < 0 ? "−" : "+"} ${num(Math.abs(s))}×(−1) `}${p === 0 ? "" : `${p < 0 ? "−" : "+"} ${num(Math.abs(p))} `}= ${num(atInvE)}`.replace(/\s+/g, " "),
            ],
          },
          {
            skill: "ln_equations",
            difficulty: 1,
            type: "short",
            prompt: `حلّ في ℝ المعادلة ${polynomial} = 0، ثم اكتب الحل الأكبر.`,
            answer: num(r2),
            steps: [
              `المميز Δ = ${num(s * s - 4 * p)} = ${num(r2 - r1)}²`,
              `الحلان: t = ${num(r1)} و t = ${num(r2)}`,
              `الحل الأكبر هو ${num(r2)}`,
            ],
          },
          {
            skill: "ln_equations",
            difficulty: 2,
            type: "short",
            prompt: "استنتج حلول المعادلة f(x) = 0 في ]0 ; +∞[، ثم اكتب الحل الأكبر.",
            answer: e2,
            steps: [
              `f(x) = 0 تكافئ ${polynomial} = 0 مع t = ln x`,
              `إذن ln x = ${num(r1)} أو ln x = ${num(r2)}`,
              `أي x = ${e1} أو x = ${e2} (كلاهما موجب تماماً)`,
              `الحل الأكبر هو ${e2}`,
            ],
          },
          {
            skill: "ln_inequalities",
            difficulty: 2,
            type: "mcq",
            prompt: `مجموعة حلول المتراجحة f(x) ${inequality.sign} 0 في ]0 ; +∞[ هي:`,
            answer: inequality.answer,
            distractors: inequality.distractors,
            steps: [
              `إشارة ${polynomial} موجبة خارج الجذرين وسالبة بينهما`,
              `f(x) ${inequality.sign} 0 تكافئ ${inequality.tSet} مع t = ln x`,
              `ln متزايدة تماماً: ${inequality.xSet} (مع شرط الوجود x > 0)`,
              `S = ${inequality.answer}`,
            ],
          },
          {
            skill: "ln_derivative",
            difficulty: 2,
            type: "short",
            prompt: "احسب f′(x) من أجل x > 0.",
            answer: derivative,
            steps: [
              "((ln x)²)′ = 2·(ln x)′·ln x = 2ln x/x",
              ...(s === 0 ? [] : [`(${mul(-s, "ln x")})′ = ${num(-s)}/x`]),
              `f′(x) = ${derivative}`,
            ],
          },
          {
            skill: "ln_derivative",
            difficulty: 3,
            type: "short",
            prompt: "ادرس اتجاه تغير f، ثم استنتج قيمتها الحدية الصغرى.",
            answer: num(minValue),
            steps: [
              `x > 0 فإشارة f′(x) هي إشارة ${join("2ln x", num(-s))}`,
              `${join("2ln x", num(-s))} = 0 تكافئ ln x = ${num(half)} أي x = ${eInt(half)}`,
              `f متناقصة تماماً على ]0 ; ${eInt(half)}] ومتزايدة تماماً على [${eInt(half)} ; +∞[`,
              `القيمة الصغرى: f(${eInt(half)}) = ${paren(half)}² ${s === 0 ? "" : `− ${paren(s)}×${paren(half)} `}${p === 0 ? "" : `${p < 0 ? "−" : "+"} ${num(Math.abs(p))} `}= ${num(minValue)}`.replace(/\s+/g, " "),
            ],
          },
        ],
      };
    },
  },
];

/** (−2) for negatives, 3 for positives — for written arithmetic. */
function paren(value: number): string {
  return value < 0 ? `(${num(value)})` : num(value);
}
