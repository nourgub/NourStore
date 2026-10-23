// BAC-style problems for "الإحصاء: سلسلة إحصائية بمتغيرين" (see ../problems.ts
// for the pattern). Data are built backwards so every key is exact.
import { linear, num, paren, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

const clean = (value: number) => Math.round(value * 1e6) / 1e6;
const total = (xs: number[]) => clean(xs.reduce((sum, value) => sum + value, 0));
const avg = (xs: number[]) => clean(total(xs) / xs.length);
const sumXY = (xs: number[], ys: number[]) => total(xs.map((x, i) => x * ys[i]));
const ranks = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
/** A table row: "xᵢ | 1 | 2 | 3". */
const row = (label: string, values: Array<number | string>) =>
  `${label} | ${values.map(value => (typeof value === "number" ? num(value) : value)).join(" | ")}`;
/** "k ln q" written as a teacher would: "ln 2", "3 ln 2", "2.5 ln 2". */
const kLn = (k: number, q: number) => (k === 1 ? `ln ${q}` : `${num(k)} ln ${q}`);

/** Residuals orthogonal to (1, …, 1) and (1, …, n): the least-squares line stays y = ax + b. */
const PATTERNS: Record<number, number[][]> = {
  4: [[1, -1, -1, 1]],
  5: [[1, -2, 0, 2, -1], [2, -1, -2, -1, 2]],
};

const CONTEXTS = [
  { what: "إنتاج مؤسسة", unit: "بالأطنان" },
  { what: "رقم أعمال شركة", unit: "بملايين الدنانير" },
  { what: "مبيعات متجر", unit: "بآلاف الوحدات" },
  { what: "عدد زبائن وكالة", unit: "بالمئات" },
];

export const statisticsProblems: ProblemGenerator[] = [
  {
    id: "production-regression",
    title: "تعديل خطي لتطور الإنتاج وتقدير",
    generate(rng: Rng) {
      const n = rng.pick([4, 5] as const);
      let a = 2;
      let b = 20;
      let ys: number[] = [];
      for (;;) {
        a = rng.pick([2, 3, 4, 5, 6, 1.5, 2.5, 3.5]);
        b = rng.int(10, 50);
        const residual = new Array<number>(n).fill(0);
        for (const pattern of PATTERNS[n]) {
          const k = rng.int(-2, 2);
          pattern.forEach((value, i) => (residual[i] += k * value));
        }
        ys = ranks(n).map((x, i) => clean(a * x + b + residual[i]));
        if (ys.every(y => y > 0)) break;
      }
      const xs = ranks(n);
      const year0 = rng.int(2015, 2020);
      const context = rng.pick(CONTEXTS);
      const xBar = avg(xs);
      const yBar = avg(ys);
      const V = clean(sumXY(xs, xs) / n - xBar * xBar);
      const P = sumXY(xs, ys);
      const c = clean(P / n - xBar * yBar);
      const slope = clean(c / V);
      const intercept = clean(yBar - slope * xBar);
      const eq = linear(slope, intercept);
      const k = n + rng.int(2, 5);
      const estimate = clean(slope * k + intercept);
      const N = k + rng.int(2, 6);
      const top = clean(slope * N + intercept);
      const T = Number.isInteger(top) ? top - 1 : Math.floor(top);
      const xStar = clean((T - intercept) / slope);
      return {
        statement: [
          `يعطي الجدول التالي تطور ${context.what} ${context.unit} خلال ${n} سنوات متتالية ابتداءً من سنة ${year0}.`,
          "نرمز بـ xᵢ لرتبة السنة وبـ yᵢ للقيمة المسجلة.",
          row("السنة", xs.map(x => String(year0 + x - 1))),
          row("xᵢ", xs),
          row("yᵢ", ys),
        ].join("\n"),
        parts: [
          {
            skill: "mean_point",
            difficulty: 1,
            type: "short",
            prompt: "احسب إحداثيي النقطة المتوسطة G لسحابة النقط، ثم اكتب ȳ.",
            answer: num(yBar),
            steps: [
              `x̄ = (${xs.join(" + ")})/${n} = ${num(xBar)}`,
              `ȳ = (${ys.map(num).join(" + ")})/${n} = ${num(total(ys))}/${n} = ${num(yBar)}`,
              `G(${num(xBar)} ; ${num(yBar)})`,
            ],
          },
          {
            skill: "variance_covariance",
            difficulty: 2,
            type: "short",
            prompt: "احسب التباين V(x) ثم التغاير cov(x, y)، واكتب قيمة cov(x, y).",
            answer: num(c),
            steps: [
              `Σxᵢ² = ${num(sumXY(xs, xs))} إذن V(x) = ${num(sumXY(xs, xs))}/${n} − ${num(xBar)}² = ${num(V)}`,
              `Σxᵢyᵢ = ${xs.map((x, i) => `${x}×${num(ys[i])}`).join(" + ")} = ${num(P)}`,
              `cov(x, y) = Σxᵢyᵢ/n − x̄·ȳ = ${num(clean(P / n))} − ${num(clean(xBar * yBar))} = ${num(c)}`,
            ],
          },
          {
            skill: "regression_line",
            difficulty: 2,
            type: "short",
            prompt: "عيّن معادلة مستقيم الانحدار بالمربعات الدنيا لـ y بدلالة x على الشكل y = ax + b.",
            answer: eq,
            accept: [`y = ${eq}`],
            steps: [
              `a = cov(x, y)/V(x) = ${num(c)}/${num(V)} = ${num(slope)}`,
              `b = ȳ − a·x̄ = ${num(yBar)} − ${num(slope)} × ${num(xBar)} = ${num(intercept)}`,
              `y = ${eq}`,
            ],
          },
          {
            skill: "estimation",
            difficulty: 2,
            type: "short",
            prompt: `باستعمال هذا التعديل، قدّر القيمة المنتظرة في سنة ${year0 + k - 1}.`,
            answer: num(estimate),
            steps: [
              `سنة ${year0 + k - 1} توافق الرتبة x = ${k}`,
              `y = ${num(slope)} × ${k} ${intercept < 0 ? "−" : "+"} ${num(Math.abs(intercept))} = ${num(estimate)}`,
            ],
          },
          {
            skill: "estimation",
            difficulty: 3,
            type: "short",
            prompt: `حسب هذا التعديل، ابتداءً من أي سنة تتجاوز القيمة ${T}؟ (اكتب السنة)`,
            answer: String(year0 + N - 1),
            steps: [
              `نحل المتراجحة ${eq} > ${T}`,
              `${num(slope)}x > ${num(clean(T - intercept))} أي x > ${num(Math.round(xStar * 100) / 100)} تقريباً`,
              `أصغر رتبة طبيعية هي x = ${N}`,
              `السنة الموافقة: ${year0} + ${N} − 1 = ${year0 + N - 1}`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "exponential-adjustment",
    title: "تعديل أسي بتغيير المتغير z = ln y",
    generate(rng: Rng) {
      const n = rng.pick([4, 5] as const);
      const q = rng.pick([2, 3]);
      let C = rng.int(2, q === 2 ? 8 : 4);
      if (C >= q) C += 1;
      const xs = ranks(n);
      const ys = xs.map(x => C * q ** x);
      const xBar = avg(xs);
      const V = clean(sumXY(xs, xs) / n - xBar * xBar);
      const zBar = `ln ${C} + ${kLn(xBar, q)}`;
      const zLine = `x ln ${q} + ln ${C}`;
      const yForm = `${C} × ${q}ˣ`;
      const k = n + rng.int(1, 2);
      const N = n + rng.int(2, 4);
      const low = C * q ** (N - 1);
      // Halfway between two consecutive values, rounded to ten: far from either boundary.
      const T = Math.round((low + C * q ** N) / 20) * 10;
      return {
        statement: [
          "يعطي الجدول التالي عدد مستعملي تطبيق إلكتروني (بالمئات) خلال الأشهر الأولى من إطلاقه، حيث xᵢ رتبة الشهر.",
          row("xᵢ", xs),
          row("yᵢ", ys),
          "نلاحظ أن سحابة النقط (xᵢ ; yᵢ) لا تلائم تعديلاً خطياً، فنضع zᵢ = ln yᵢ.",
        ].join("\n"),
        parts: [
          {
            skill: "mean_point",
            difficulty: 2,
            type: "short",
            prompt: `بيّن أن zᵢ = ln ${C} + xᵢ ln ${q}، ثم احسب القيمة المضبوطة لـ z̄.`,
            answer: zBar,
            steps: [
              `yᵢ = ${C} × ${q}^xᵢ إذن zᵢ = ln ${C} + xᵢ ln ${q}`,
              `z̄ = ln ${C} + x̄ ln ${q} لأن المتوسط يحافظ على العبارات التآلفية`,
              `x̄ = ${num(xBar)} إذن z̄ = ${zBar}`,
            ],
          },
          {
            skill: "variance_covariance",
            difficulty: 2,
            type: "short",
            prompt: "احسب V(x)، ثم بيّن أن cov(x, z) = V(x) × ln " + q + " واكتب القيمة المضبوطة لـ cov(x, z).",
            answer: kLn(V, q),
            steps: [
              `V(x) = ${num(sumXY(xs, xs))}/${n} − ${num(xBar)}² = ${num(V)}`,
              `zᵢ − z̄ = (xᵢ − x̄) ln ${q} إذن cov(x, z) = ln ${q} × V(x)`,
              `cov(x, z) = ${kLn(V, q)}`,
            ],
          },
          {
            skill: "regression_line",
            difficulty: 2,
            type: "short",
            prompt: "استنتج معادلة مستقيم الانحدار بالمربعات الدنيا لـ z بدلالة x على الشكل z = ax + b بالقيم المضبوطة.",
            answer: zLine,
            accept: [`z = ${zLine}`],
            steps: [
              `a = cov(x, z)/V(x) = ${paren(kLn(V, q))}/${num(V)} = ln ${q}`,
              `b = z̄ − a·x̄ = ${zBar} − ${kLn(xBar, q)} = ln ${C}`,
              `z = ${zLine}`,
            ],
          },
          {
            skill: "exp_adjustment",
            difficulty: 2,
            type: "mcq",
            prompt: "استنتج عبارة y بدلالة x:",
            answer: `y = ${yForm}`,
            distractors: [
              { option: `y = ${q}ˣ + ${C}`, misconception: "exp_back_error" },
              { option: `y = ${q} × ${C}ˣ`, misconception: "exp_back_error" },
              { option: `y = ${zLine}`, misconception: "ln_forgot_back" },
            ],
            steps: [
              `y = eᶻ = e^(${zLine})`,
              `y = e^(x ln ${q}) × e^(ln ${C}) = ${q}ˣ × ${C}`,
              `y = ${yForm}`,
            ],
          },
          {
            skill: "estimation",
            difficulty: 2,
            type: "short",
            prompt: `قدّر عدد المستعملين (بالمئات) في الشهر ذي الرتبة ${k}.`,
            answer: num(C * q ** k),
            steps: [`y = ${C} × ${q}${k === 1 ? "" : `^${k}`}`, `y = ${C} × ${q ** k} = ${C * q ** k}`],
          },
          {
            skill: "estimation",
            difficulty: 3,
            type: "short",
            prompt: `ابتداءً من أي شهر يتجاوز عدد المستعملين ${T} مئة؟ (اكتب رتبة الشهر)`,
            answer: String(N),
            steps: [
              `${yForm} > ${T} يكافئ ${q}ˣ > ${T}/${C}`,
              `نطبق ln (دالة متزايدة تماماً): x ln ${q} > ln(${T}/${C}) أي x > ln(${T}/${C})/ln ${q} ≈ ${num(Math.round((Math.log(T / C) / Math.log(q)) * 100) / 100)}`,
              `أصغر رتبة طبيعية هي x = ${N}`,
            ],
          },
        ],
      };
    },
  },
];
