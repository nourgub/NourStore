// BAC-style problems for "الدوال الأصلية والحساب التكاملي" (see ../problems.ts
// for the pattern): a primitive, an integral, an area, a mean value, and a
// last "السؤال المميز" where the sign of f changes inside the interval.
import { fracMonomial, frac, join, linear, mul, num, poly, sup, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "-": "₋",
};

/** ∫ₐᵇ */
const intg = (a: number, b: number) =>
  `∫${String(a).split("").map(char => SUBSCRIPTS[char] ?? char).join("")}${sup(b)}`;

/** (p/q)·x^power with the sign outside: "(2/3)x³", "−(3/2)x²", "0". */
function mono(p: number, q: number, power: number): string {
  if (p === 0) return "0";
  return p < 0 ? `−${fracMonomial(-p, q, power)}` : fracMonomial(p, q, power);
}

/** "x − y" for formatted numbers, writing "x − (−y)" and dropping "− 0". */
function minus(x: string, y: string): string {
  if (y === "0") return x;
  return `${x} − ${y.startsWith("−") ? `(${y})` : y}`;
}

/** (x − r) as a teacher writes it: x, (x − 2), (x + 3). */
const factor = (r: number) => (r === 0 ? "x" : `(${linear(1, -r)})`);

/** eⁿ written for a product: "" for n = 0, "e", "e²", "e⁻¹". */
const ePow = (n: number) => (n === 0 ? "" : n === 1 ? "e" : `e${sup(n)}`);

/** c·eⁿ: "3", "−e", "2e²", "e⁻¹". */
const eTerm = (c: number, n: number) => (n === 0 ? num(c) : mul(c, ePow(n)));

/** c·(body)·eⁿ, e.g. "2(e − 1)e⁻¹", "(e − 2)e", "e − 2". */
function eProduct(c: number, body: string, n: number): string {
  const lead = c === 1 ? "" : c === -1 ? "−" : num(c);
  if (!lead && n === 0) return body;
  return `${lead}(${body})${ePow(n)}`;
}

export const integralProblems: ProblemGenerator[] = [
  {
    id: "polynomial-area",
    title: "دالة أصلية، تكامل ومساحة حيز",
    generate(rng: Rng) {
      const alpha = rng.int(-3, 2);
      const d = rng.int(1, 4);
      const beta = alpha + d;
      const k = rng.pick([-2, -1, 1, 2]);
      const s = alpha + beta;
      const p = alpha * beta;
      const expression = poly([[2, k], [1, -k * s], [0, k * p]]);
      const factored = `${k === 1 ? "" : k === -1 ? "−" : num(k)}${factor(alpha)}${factor(beta)}`;
      // 6·F(x), an integer for integer x, so every value is exact.
      const sixF = (x: number) => 2 * k * x ** 3 - 3 * k * s * x ** 2 + 6 * k * p * x;
      const F = (x: number) => frac(sixF(x), 6);
      const primitive = join(mono(k, 3, 3), mono(-k * s, 2, 2), mono(k * p, 1, 1));
      const sixI = sixF(beta) - sixF(alpha);
      const sixJ = sixF(beta + 1) - sixF(beta);
      if (sixI !== -k * d ** 3 || sixJ !== k * (2 + 3 * d)) throw new Error("integral mismatch");
      const I = frac(sixI, 6);
      const J = frac(sixJ, 6);
      const area = frac(Math.abs(sixI), 6);
      const mean = frac(sixI, 6 * d);
      const total = frac(Math.abs(sixI) + Math.abs(sixJ), 6);
      const signInside = k > 0 ? "سالبة" : "موجبة";
      const signOutside = k > 0 ? "موجبة" : "سالبة";
      return {
        statement: `نعتبر الدالة f المعرفة على ℝ بـ: f(x) = ${expression}\nو (C) منحناها البياني في معلم متعامد ومتجانس.`,
        parts: [
          {
            skill: "primitive_condition",
            difficulty: 1,
            type: "short",
            prompt: "عيّن الدالة الأصلية F للدالة f على ℝ التي تنعدم من أجل x = 0.",
            answer: primitive,
            steps: [
              "أصلية xⁿ هي xⁿ⁺¹/(n + 1)، ونأخذ أصلية كل حد",
              `الدوال الأصلية لـ f هي F(x) = ${primitive} + C`,
              "F(0) = C = 0، إذن C = 0",
              `F(x) = ${primitive}`,
            ],
          },
          {
            skill: "area",
            difficulty: 1,
            type: "short",
            prompt: "حلّ في ℝ المعادلة f(x) = 0، ثم اكتب الحل الأكبر.",
            answer: num(beta),
            steps: [
              `نحلل: f(x) = ${factored}`,
              `f(x) = 0 يعني x = ${num(alpha)} أو x = ${num(beta)}`,
              `الحل الأكبر هو ${num(beta)}`,
            ],
          },
          {
            skill: "definite_integral",
            difficulty: 2,
            type: "short",
            prompt: `باستعمال F، احسب التكامل I = ${intg(alpha, beta)} f(x) dx.`,
            answer: I,
            steps: [
              `I = F(${num(beta)}) − F(${num(alpha)})`,
              `F(${num(beta)}) = ${F(beta)} و F(${num(alpha)}) = ${F(alpha)}`,
              F(alpha) === "0" ? `I = ${I}` : `I = ${minus(F(beta), F(alpha))} = ${I}`,
            ],
          },
          {
            skill: "area",
            difficulty: 2,
            type: "short",
            prompt: `استنتج مساحة الحيز المستوي المحدد بالمنحنى (C) ومحور الفواصل والمستقيمين اللذين معادلتاهما x = ${num(alpha)} و x = ${num(beta)} (بوحدة المساحة).`,
            answer: area,
            steps: [
              `على المجال [${num(alpha)} ; ${num(beta)}] الدالة f ${signInside} (إشارة عكس إشارة معامل x² بين الجذرين)`,
              k > 0 ? `إذن A = −I = −(${I})` : "إذن A = I",
              `A = ${area} u.a`,
            ],
          },
          {
            skill: "mean_value",
            difficulty: 2,
            type: "short",
            prompt: `احسب القيمة المتوسطة μ للدالة f على المجال [${num(alpha)} ; ${num(beta)}].`,
            answer: mean,
            steps: [
              `μ = (1/(b − a)) × I حيث b − a = ${alpha === 0 ? d : `${minus(num(beta), num(alpha))} = ${d}`}`,
              `μ = ${I} ÷ ${d} = ${mean}`,
            ],
          },
          {
            skill: "area",
            difficulty: 3,
            type: "short",
            prompt: `احسب مساحة الحيز المستوي المحدد بالمنحنى (C) ومحور الفواصل والمستقيمين اللذين معادلتاهما x = ${num(alpha)} و x = ${num(beta + 1)}.`,
            answer: total,
            steps: [
              `f تغيّر إشارتها عند ${num(beta)}: هي ${signInside} على [${num(alpha)} ; ${num(beta)}] و ${signOutside} على [${num(beta)} ; ${num(beta + 1)}]`,
              `نقسم المجال (علاقة شال): A = |${intg(alpha, beta)} f(x) dx| + |${intg(beta, beta + 1)} f(x) dx|`,
              `${intg(beta, beta + 1)} f(x) dx = F(${num(beta + 1)}) − F(${num(beta)}) = ${minus(F(beta + 1), F(beta))} = ${J}`,
              `A = ${area} + ${frac(Math.abs(sixJ), 6)} = ${total} u.a`,
              "تنبيه: حساب التكامل مباشرة على كامل المجال يطرح جزءاً من المساحة بدل أن يجمعه",
            ],
          },
        ],
      };
    },
  },
  {
    id: "exp-primitive-area",
    title: "دالة أسية: دالة أصلية، مساحة وقيمة متوسطة",
    generate(rng: Rng) {
      const a = rng.pick([-2, -1, 1, 2, 3]);
      const r = rng.int(-1, 2);
      const b = -a * r;
      const c = -a * (r + 1);
      const f = r === 0 ? `${mul(a, "x")}eˣ` : `(${linear(a, b)})eˣ`;
      const F = c === 0 ? `${mul(a, "x")}eˣ` : `(${linear(a, c)})eˣ`;
      const I = eTerm(a, r);
      const J = eProduct(a, "2 − e", r - 1);
      const absA = Math.abs(a);
      const areaLeft = eProduct(absA, "e − 2", r - 1);
      const mean = eTerm(a, r - 1);
      const total = eProduct(2 * absA, "e − 1", r - 1);
      const positiveRight = a > 0;
      return {
        statement: `نعتبر الدالة f المعرفة على ℝ بـ: f(x) = ${f}\nو (C) منحناها البياني في معلم متعامد ومتجانس.`,
        parts: [
          {
            skill: "area",
            difficulty: 1,
            type: "short",
            prompt: "حلّ في ℝ المعادلة f(x) = 0.",
            answer: num(r),
            steps: [
              "من أجل كل x من ℝ: eˣ > 0",
              `إذن f(x) = 0 يعني ${linear(a, b)} = 0، أي x = ${num(r)}`,
              `إشارة f هي إشارة ${linear(a, b)}`,
            ],
          },
          {
            skill: "primitive_composite",
            difficulty: 2,
            type: "short",
            prompt: "عيّن العددين الحقيقيين α و β بحيث تكون الدالة F المعرفة بـ F(x) = (αx + β)eˣ دالة أصلية للدالة f على ℝ، ثم اكتب عبارة F(x).",
            answer: F,
            steps: [
              "F′(x) = αeˣ + (αx + β)eˣ = (αx + α + β)eˣ",
              `F′(x) = f(x) يعني α = ${num(a)} و α + β = ${num(b)}`,
              `إذن α = ${num(a)} و β = ${num(c)}`,
              `F(x) = ${F}`,
            ],
          },
          {
            skill: "definite_integral",
            difficulty: 2,
            type: "short",
            prompt: `احسب التكامل I = ${intg(r, r + 1)} f(x) dx.`,
            answer: I,
            steps: [
              `I = F(${num(r + 1)}) − F(${num(r)})`,
              `F(${num(r + 1)}) = 0 و F(${num(r)}) = ${eTerm(-a, r)}`,
              `I = ${minus("0", eTerm(-a, r))} = ${I}`,
            ],
          },
          {
            skill: "area",
            difficulty: 2,
            type: "short",
            prompt: `احسب مساحة الحيز المستوي المحدد بالمنحنى (C) ومحور الفواصل والمستقيمين اللذين معادلتاهما x = ${num(r - 1)} و x = ${num(r)} (بوحدة المساحة).`,
            answer: areaLeft,
            steps: [
              `على [${num(r - 1)} ; ${num(r)}] الدالة f ${positiveRight ? "سالبة" : "موجبة"}`,
              `J = ${intg(r - 1, r)} f(x) dx = F(${num(r)}) − F(${num(r - 1)}) = ${minus(eTerm(-a, r), eTerm(-2 * a, r - 1))} = ${J}`,
              positiveRight ? "المساحة A = −J لأن f سالبة" : "المساحة A = J لأن f موجبة",
              `A = ${areaLeft} u.a`,
            ],
          },
          {
            skill: "mean_value",
            difficulty: 2,
            type: "short",
            prompt: `احسب القيمة المتوسطة μ للدالة f على المجال [${num(r - 1)} ; ${num(r + 1)}].`,
            answer: mean,
            steps: [
              `بعلاقة شال: ${intg(r - 1, r + 1)} f(x) dx = J + I = ${join(J, I)}`,
              `= ${eProduct(a, "2 − e + e", r - 1)} = ${eTerm(2 * a, r - 1)}`,
              `طول المجال 2، إذن μ = ${eTerm(2 * a, r - 1)} ÷ 2 = ${mean}`,
            ],
          },
          {
            skill: "area",
            difficulty: 3,
            type: "short",
            prompt: `احسب مساحة الحيز المستوي المحدد بالمنحنى (C) ومحور الفواصل والمستقيمين اللذين معادلتاهما x = ${num(r - 1)} و x = ${num(r + 1)}.`,
            answer: total,
            steps: [
              `f تغيّر إشارتها عند ${num(r)}، فلا يمكن حساب المساحة بتكامل واحد على [${num(r - 1)} ; ${num(r + 1)}]`,
              `A = |J| + |I| = ${areaLeft} + ${eTerm(absA, r)}`,
              r === 1 ? `نبسّط: A = ${total} u.a` : `نكتب ${eTerm(1, r)} = e × ${eTerm(1, r - 1)} ونبسّط: A = ${total} u.a`,
              `تنبيه: 2 × |μ| = ${eTerm(2 * absA, r - 1)} ليست المساحة، لأن جزءاً من الحيز تحت محور الفواصل`,
            ],
          },
        ],
      };
    },
  },
];
