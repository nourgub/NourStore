// BAC lesson "الإحصاء: سلسلة إحصائية بمتغيرين" (Algerian curriculum, شعبة
// تسيير واقتصاد): mean point, sums, variance and covariance, the least-squares
// regression line, estimation, and the change of variable z = ln y.
// Data are built backwards (a line plus residuals orthogonal to 1 and xᵢ) so
// that means, V(x), cov(x, y), a and b are exact and "nice", as in the BAC.
import type { Lesson } from "../curriculum";
import { answersMatch } from "../grading";
import { expressionsEquivalent } from "../mathExpr";
import { frac, linear, num, paren, type Generator, type Rng } from "../generators/core";
import { statisticsProblems } from "./statisticsProblems";

/** Re-draws until `valid` holds — keeps generators free of degenerate cases. */
function draw<T>(rng: Rng, make: (rng: Rng) => T, valid: (value: T) => boolean): T {
  for (let attempt = 0; attempt < 400; attempt += 1) {
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

// ----------------------------------------------------------- exact statistics
/** Removes floating-point noise: 0.30000000004 → 0.3. */
const clean = (value: number) => Math.round(value * 1e6) / 1e6;
const total = (xs: number[]) => clean(xs.reduce((sum, value) => sum + value, 0));
const avg = (xs: number[]) => clean(total(xs) / xs.length);
const sumXY = (xs: number[], ys: number[]) => total(xs.map((x, i) => x * ys[i]));
const variance = (xs: number[]) => clean(sumXY(xs, xs) / xs.length - avg(xs) ** 2);
const covariance = (xs: number[], ys: number[]) => clean(sumXY(xs, ys) / xs.length - avg(xs) * avg(ys));
/** At most `digits` decimals (a "nice" BAC value). */
const nice = (value: number, digits = 2) => Math.abs(value * 10 ** digits - Math.round(value * 10 ** digits)) < 1e-6;
const ranks = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** "(1 ; 10)، (2 ; 14)، …" */
const pairs = (xs: number[], ys: number[]) => xs.map((x, i) => `(${num(x)} ; ${num(ys[i])})`).join("، ");
/** "1 + 2 + 3" with negative terms in parentheses. */
const plus = (xs: number[]) => xs.map(x => paren(num(x))).join(" + ");
/** "1×10 + 2×14 + …" */
const products = (xs: number[], ys: number[]) => xs.map((x, i) => `${paren(num(x))}×${paren(num(ys[i]))}`).join(" + ");
/** "1² + 2² + …" */
const squares = (xs: number[]) => xs.map(x => `${paren(num(x))}²`).join(" + ");
const point = (x: string, y: string) => `G(${x} ; ${y})`;
const line = (a: number, b: number) => `y = ${linear(a, b)}`;

/**
 * Residual patterns orthogonal to (1, …, 1) and to (1, 2, …, n): adding k × pattern
 * to a perfect line leaves its least-squares line unchanged.
 */
const PATTERNS: Record<number, number[][]> = {
  4: [[1, -1, -1, 1]],
  5: [[1, -2, 0, 2, -1], [2, -1, -2, -1, 2]],
};
/** yᵢ = a·xᵢ + b + residuals, for xᵢ = 1…n. */
function alignedData(rng: Rng, n: 4 | 5, a: number, b: number): number[] {
  const residual = new Array<number>(n).fill(0);
  for (const pattern of PATTERNS[n]) {
    const k = rng.int(-2, 2);
    pattern.forEach((value, i) => (residual[i] += k * value));
  }
  return ranks(n).map((x, i) => clean(a * x + b + residual[i]));
}

const QUANTITIES = [
  "الإنتاج بالأطنان",
  "رقم الأعمال بملايين الدنانير",
  "عدد الزبائن بالمئات",
  "المبيعات بآلاف الوحدات",
  "عدد المشتركين بالآلاف",
];

const generators: Generator[] = [
  // ---------------------------------------------------------------- mean point
  {
    id: "mean-of-values",
    skill: "mean_point",
    difficulty: 1,
    generate: rng => {
      const values = draw(
        rng,
        g => Array.from({ length: g.int(4, 6) }, () => g.int(2, 40)),
        xs => nice(total(xs) / xs.length)
      );
      const m = avg(values);
      return {
        type: "short",
        prompt: `سلسلة إحصائية قيم متغيرها yᵢ هي: ${values.map(num).join("، ")}. احسب المتوسط الحسابي ȳ.`,
        answer: num(m),
        steps: [
          `Σyᵢ = ${plus(values)} = ${num(total(values))}`,
          `عدد القيم n = ${values.length}`,
          `ȳ = Σyᵢ / n = ${num(total(values))}/${values.length} = ${num(m)}`,
        ],
      };
    },
  },
  {
    id: "mean-point-mcq",
    skill: "mean_point",
    difficulty: 2,
    generate: rng => {
      const { xs, ys } = draw(
        rng,
        g => {
          const n = g.int(4, 5);
          const start = g.int(0, 4);
          const h = g.pick([1, 2]);
          return {
            xs: ranks(n).map(i => start + h * i),
            ys: Array.from({ length: n }, () => g.int(5, 60)),
          };
        },
        ({ xs, ys }) => {
          const n = xs.length;
          return allDifferent(
            point(num(avg(xs)), num(avg(ys))),
            point(num(avg(ys)), num(avg(xs))),
            point(frac(total(xs), n - 1), frac(total(ys), n - 1)),
            point(num(total(xs)), num(total(ys)))
          );
        }
      );
      const n = xs.length;
      const answer = point(num(avg(xs)), num(avg(ys)));
      return {
        type: "mcq",
        prompt: `سلسلة إحصائية بمتغيرين (xᵢ ; yᵢ): ${pairs(xs, ys)}. ما هي النقطة المتوسطة G لسحابة النقط؟`,
        answer,
        distractors: [
          { option: point(num(avg(ys)), num(avg(xs))), misconception: "mean_point_swapped" },
          { option: point(frac(total(xs), n - 1), frac(total(ys), n - 1)), misconception: "mean_wrong_count" },
          { option: point(num(total(xs)), num(total(ys))), misconception: "no_division_by_n" },
        ],
        steps: [
          `x̄ = (${plus(xs)})/${n} = ${num(total(xs))}/${n} = ${num(avg(xs))}`,
          `ȳ = (${plus(ys)})/${n} = ${num(total(ys))}/${n} = ${num(avg(ys))}`,
          `G(x̄ ; ȳ) أي ${answer}`,
        ],
      };
    },
  },
  {
    id: "missing-value-from-mean",
    skill: "mean_point",
    difficulty: 3,
    generate: rng => {
      const { known, m, n } = draw(
        rng,
        g => {
          const n = g.int(4, 6);
          return { n, m: g.int(10, 40), known: Array.from({ length: n - 1 }, () => g.int(5, 50)) };
        },
        ({ known, m, n }) => n * m - total(known) > 0
      );
      const t = n * m - total(known);
      const position = rng.int(0, n - 1);
      const shown = [...known.map(num)];
      shown.splice(position, 0, "t");
      return {
        type: "short",
        prompt: `قيم متغير إحصائي هي: ${shown.join("، ")}، ومتوسطها الحسابي ȳ = ${m}. احسب القيمة t.`,
        answer: num(t),
        steps: [
          `ȳ = Σyᵢ / n إذن Σyᵢ = n × ȳ = ${n} × ${m} = ${n * m}`,
          `مجموع القيم المعلومة: ${plus(known)} = ${num(total(known))}`,
          `t = ${n * m} − ${num(total(known))} = ${num(t)}`,
        ],
      };
    },
  },
  // -------------------------------------------------------------- table, sums
  {
    id: "sum-xy",
    skill: "table_sums",
    difficulty: 1,
    generate: rng => {
      const n = rng.int(4, 5);
      const xs = ranks(n).map(i => i + rng.int(0, 1) * (i > 1 ? 1 : 0));
      const ys = Array.from({ length: n }, () => rng.int(2, 25));
      const answer = sumXY(xs, ys);
      return {
        type: "short",
        prompt: `سلسلة إحصائية بمتغيرين (xᵢ ; yᵢ): ${pairs(xs, ys)}. احسب المجموع Σxᵢyᵢ.`,
        answer: num(answer),
        steps: [
          "نضرب كل xᵢ في yᵢ المقابل له ثم نجمع الجداءات",
          `Σxᵢyᵢ = ${products(xs, ys)}`,
          `Σxᵢyᵢ = ${num(answer)}`,
        ],
      };
    },
  },
  {
    id: "sum-squares-mcq",
    skill: "table_sums",
    difficulty: 2,
    generate: rng => {
      const xs = draw(
        rng,
        g => Array.from({ length: g.int(4, 6) }, () => g.int(1, 12)),
        xs => {
          const s = total(xs);
          return allDifferent(num(sumXY(xs, xs)), num(s * s), num(2 * s), frac(s * s, xs.length));
        }
      );
      const s = total(xs);
      const answer = sumXY(xs, xs);
      return {
        type: "mcq",
        prompt: `قيم المتغير xᵢ هي: ${xs.map(num).join("، ")}. ما قيمة المجموع Σxᵢ²؟`,
        answer: num(answer),
        distractors: [
          { option: num(s * s), misconception: "sum_product_confusion" },
          { option: num(2 * s), misconception: "square_as_double" },
          { option: frac(s * s, xs.length), misconception: "sum_product_confusion" },
        ],
        steps: [
          "Σxᵢ² هو مجموع مربعات القيم: نربّع كل قيمة أولاً ثم نجمع",
          `Σxᵢ² = ${squares(xs)}`,
          `Σxᵢ² = ${num(answer)}`,
          `انتبه: (Σxᵢ)² = ${num(s)}² = ${num(s * s)} شيء آخر`,
        ],
      };
    },
  },
  {
    id: "missing-y-from-sumxy",
    skill: "table_sums",
    difficulty: 3,
    generate: rng => {
      const n = rng.int(4, 5);
      const xs = ranks(n);
      const ys = Array.from({ length: n }, () => rng.int(2, 30));
      const k = rng.int(1, n - 1);
      const P = sumXY(xs, ys);
      const rest = clean(P - xs[k] * ys[k]);
      const shown = ys.map((y, i) => (i === k ? "t" : num(y)));
      return {
        type: "short",
        prompt: `سلسلة إحصائية بمتغيرين (xᵢ ; yᵢ): ${xs.map((x, i) => `(${x} ; ${shown[i]})`).join("، ")}، حيث Σxᵢyᵢ = ${num(P)}. احسب t.`,
        answer: num(ys[k]),
        steps: [
          `Σxᵢyᵢ = ${xs.map((x, i) => `${x}×${shown[i]}`).join(" + ")}`,
          `الجداءات المعلومة مجموعها ${num(rest)}، إذن ${xs[k]}t = ${num(P)} − ${num(rest)} = ${num(P - rest)}`,
          `t = ${num(P - rest)}/${xs[k]} = ${num(ys[k])}`,
        ],
      };
    },
  },
  // --------------------------------------------------- variance and covariance
  {
    id: "variance-x",
    skill: "variance_covariance",
    difficulty: 1,
    generate: rng => {
      const xs = draw(
        rng,
        g => Array.from({ length: g.int(4, 5) }, () => g.int(0, 12)).sort((p, q) => p - q),
        xs => new Set(xs).size === xs.length && nice(variance(xs))
      );
      const n = xs.length;
      const V = variance(xs);
      return {
        type: "short",
        prompt: `قيم المتغير xᵢ هي: ${xs.map(num).join("، ")}. احسب التباين V(x).`,
        answer: num(V),
        steps: [
          `x̄ = ${num(total(xs))}/${n} = ${num(avg(xs))}`,
          `Σxᵢ² = ${squares(xs)} = ${num(sumXY(xs, xs))}`,
          `V(x) = Σxᵢ²/n − x̄² = ${num(sumXY(xs, xs))}/${n} − ${paren(num(avg(xs)))}²`,
          `V(x) = ${num(clean(sumXY(xs, xs) / n))} − ${num(clean(avg(xs) ** 2))} = ${num(V)}`,
        ],
      };
    },
  },
  {
    id: "covariance",
    skill: "variance_covariance",
    difficulty: 2,
    generate: rng => {
      const { xs, ys } = draw(
        rng,
        g => {
          const n = g.int(4, 5);
          return { xs: ranks(n), ys: Array.from({ length: n }, () => g.int(2, 30)) };
        },
        ({ xs, ys }) => nice(covariance(xs, ys)) && covariance(xs, ys) !== 0
      );
      const n = xs.length;
      const c = covariance(xs, ys);
      const P = sumXY(xs, ys);
      return {
        type: "short",
        prompt: `سلسلة إحصائية بمتغيرين (xᵢ ; yᵢ): ${pairs(xs, ys)}. احسب التغاير cov(x, y).`,
        answer: num(c),
        steps: [
          `x̄ = ${num(avg(xs))} و ȳ = ${num(total(ys))}/${n} = ${num(avg(ys))}`,
          `Σxᵢyᵢ = ${products(xs, ys)} = ${num(P)}`,
          `cov(x, y) = Σxᵢyᵢ/n − x̄·ȳ = ${num(P)}/${n} − ${num(avg(xs))} × ${num(avg(ys))}`,
          `cov(x, y) = ${num(clean(P / n))} − ${num(clean(avg(xs) * avg(ys)))} = ${num(c)}`,
        ],
      };
    },
  },
  {
    id: "covariance-mcq",
    skill: "variance_covariance",
    difficulty: 3,
    generate: rng => {
      const { xs, ys } = draw(
        rng,
        g => {
          const n = g.int(4, 5);
          return { xs: ranks(n).map(i => i + g.int(0, 2)), ys: Array.from({ length: n }, () => g.int(2, 25)) };
        },
        ({ xs, ys }) => {
          const n = xs.length;
          const P = sumXY(xs, ys);
          return (
            nice(covariance(xs, ys)) &&
            covariance(xs, ys) !== 0 &&
            allDifferent(
              num(covariance(xs, ys)),
              num(clean(P / n)),
              num(clean(P - avg(xs) * avg(ys))),
              num(variance(xs))
            )
          );
        }
      );
      const n = xs.length;
      const P = sumXY(xs, ys);
      const c = covariance(xs, ys);
      return {
        type: "mcq",
        prompt: `سلسلة إحصائية بمتغيرين (xᵢ ; yᵢ): ${pairs(xs, ys)}. ما قيمة التغاير cov(x, y)؟`,
        answer: num(c),
        distractors: [
          { option: num(clean(P / n)), misconception: "forgot_mean_product" },
          { option: num(clean(P - avg(xs) * avg(ys))), misconception: "no_division_by_n" },
          { option: num(variance(xs)), misconception: "cov_as_variance" },
        ],
        steps: [
          `x̄ = ${num(total(xs))}/${n} = ${num(avg(xs))} و ȳ = ${num(total(ys))}/${n} = ${num(avg(ys))}`,
          `Σxᵢyᵢ = ${products(xs, ys)} = ${num(P)}`,
          `cov(x, y) = Σxᵢyᵢ/n − x̄·ȳ = ${num(clean(P / n))} − ${num(clean(avg(xs) * avg(ys)))} = ${num(c)}`,
        ],
      };
    },
  },
  // --------------------------------------------------------- regression line
  {
    id: "slope-from-cov",
    skill: "regression_line",
    difficulty: 1,
    generate: rng => {
      const V = rng.pick([1.25, 2, 2.5, 4, 5, 8, 0.8]);
      const a = rng.pick([2, 3, 4, 5, 6, -2, -3, 0.5, 1.5, -0.5, 2.5]);
      const c = clean(a * V);
      return {
        type: "short",
        prompt: `في سلسلة إحصائية بمتغيرين لدينا V(x) = ${num(V)} و cov(x, y) = ${num(c)}. احسب معامل التوجيه a لمستقيم الانحدار بالمربعات الدنيا لـ y بدلالة x.`,
        answer: num(a),
        steps: ["a = cov(x, y) / V(x)", `a = ${num(c)}/${num(V)}`, `a = ${num(a)}`],
      };
    },
  },
  {
    id: "intercept-b",
    skill: "regression_line",
    difficulty: 2,
    generate: rng => {
      const xBar = rng.pick([2, 2.5, 3, 3.5, 4, 5, 6]);
      const a = rng.pick([2, 3, 4, 1.5, 2.5, -2, -1.5, 0.5, 6]);
      const b = rng.int(-10, 40);
      const yBar = clean(a * xBar + b);
      return {
        type: "short",
        prompt: `مستقيم الانحدار بالمربعات الدنيا لسلسلة إحصائية معامل توجيهه a = ${num(a)}، والنقطة المتوسطة ${point(num(xBar), num(yBar))}. احسب b حيث y = ax + b.`,
        answer: num(b),
        steps: [
          "مستقيم الانحدار يشمل النقطة المتوسطة G، إذن ȳ = a·x̄ + b أي b = ȳ − a·x̄",
          `b = ${num(yBar)} − ${paren(num(a))} × ${num(xBar)}`,
          `b = ${num(yBar)} − ${paren(num(clean(a * xBar)))} = ${num(b)}`,
        ],
      };
    },
  },
  {
    id: "line-through-g",
    skill: "regression_line",
    difficulty: 1,
    generate: rng => {
      const a = rng.pick([2, 3, 4, 5, 1.5, 2.5, -2, -3, 0.5]);
      const b = rng.nonZero(-5, 30);
      const xBar = rng.pick([2.5, 3, 3.5, 4, 4.5, 5]);
      const yBar = clean(a * xBar + b);
      return {
        type: "short",
        prompt: `معادلة مستقيم الانحدار بالمربعات الدنيا لسلسلة إحصائية هي ${line(a, b)}، و x̄ = ${num(xBar)}. احسب ȳ.`,
        answer: num(yBar),
        steps: [
          "مستقيم الانحدار بالمربعات الدنيا يشمل دائماً النقطة المتوسطة G(x̄ ; ȳ)",
          `ȳ = a·x̄ + b = ${num(a)} × ${num(xBar)} ${b < 0 ? "−" : "+"} ${num(Math.abs(b))}`,
          `ȳ = ${num(yBar)}`,
        ],
      };
    },
  },
  {
    id: "regression-line-mcq",
    skill: "regression_line",
    difficulty: 2,
    generate: rng => {
      const { V, a, xBar, b } = draw(
        rng,
        g => ({
          V: g.pick([1.25, 2, 2.5, 4, 5]),
          a: g.pick([2, 4, 5, 0.5, 2.5, -2, -0.5, 1.25, -4]),
          xBar: g.pick([2.5, 3, 3.5, 4]),
          b: g.int(-5, 30),
        }),
        ({ V, a, xBar, b }) => {
          const yBar = clean(a * xBar + b);
          const inv = clean(1 / a);
          return allDifferent(
            line(a, b),
            line(inv, clean(yBar - inv * xBar)),
            line(a, clean(yBar + a * xBar)),
            line(a, clean(xBar - a * yBar))
          ) && V > 0;
        }
      );
      const c = clean(a * V);
      const yBar = clean(a * xBar + b);
      const inv = clean(1 / a);
      return {
        type: "mcq",
        prompt: `سلسلة إحصائية بمتغيرين فيها x̄ = ${num(xBar)} و ȳ = ${num(yBar)} و V(x) = ${num(V)} و cov(x, y) = ${num(c)}. ما معادلة مستقيم الانحدار بالمربعات الدنيا لـ y بدلالة x؟`,
        answer: line(a, b),
        distractors: [
          { option: line(inv, clean(yBar - inv * xBar)), misconception: "slope_inverted" },
          { option: line(a, clean(yBar + a * xBar)), misconception: "intercept_sign" },
          { option: line(a, clean(xBar - a * yBar)), misconception: "intercept_swap" },
        ],
        steps: [
          `a = cov(x, y)/V(x) = ${num(c)}/${num(V)} = ${num(a)}`,
          `b = ȳ − a·x̄ = ${num(yBar)} − ${paren(num(a))} × ${num(xBar)} = ${num(b)}`,
          `إذن ${line(a, b)}`,
        ],
      };
    },
  },
  {
    id: "regression-from-table",
    skill: "regression_line",
    difficulty: 3,
    generate: rng => {
      const n = rng.pick([4, 5] as const);
      const { a, b, ys } = draw(
        rng,
        g => {
          const a = g.pick([2, 3, 4, 5, 1.5, 2.5, -2, -3]);
          const b = g.int(5, 40);
          return { a, b, ys: alignedData(g, n, a, b) };
        },
        ({ ys }) => ys.every(y => y > 0)
      );
      const xs = ranks(n);
      const V = variance(xs);
      const c = covariance(xs, ys);
      const answer = linear(a, b);
      return {
        type: "short",
        prompt: `سلسلة إحصائية بمتغيرين (xᵢ ; yᵢ): ${pairs(xs, ys)}. اكتب معادلة مستقيم الانحدار بالمربعات الدنيا لـ y بدلالة x على الشكل y = ax + b.`,
        answer,
        accept: [`y = ${answer}`],
        steps: [
          `x̄ = ${num(avg(xs))} و ȳ = ${num(total(ys))}/${n} = ${num(avg(ys))}`,
          `V(x) = Σxᵢ²/n − x̄² = ${num(sumXY(xs, xs))}/${n} − ${num(avg(xs))}² = ${num(V)}`,
          `Σxᵢyᵢ = ${num(sumXY(xs, ys))} إذن cov(x, y) = ${num(clean(sumXY(xs, ys) / n))} − ${num(clean(avg(xs) * avg(ys)))} = ${num(c)}`,
          `a = cov(x, y)/V(x) = ${num(c)}/${num(V)} = ${num(a)}`,
          `b = ȳ − a·x̄ = ${num(avg(ys))} − ${paren(num(a))} × ${num(avg(xs))} = ${num(b)}`,
          `y = ${answer}`,
        ],
      };
    },
  },
  // -------------------------------------------------------------- estimation
  {
    id: "estimate-value",
    skill: "estimation",
    difficulty: 1,
    generate: rng => {
      const a = rng.pick([2, 3, 4, 5, 1.5, 2.5, 0.5, 6]);
      const b = rng.int(5, 60);
      const year0 = rng.int(2015, 2020);
      const k = rng.int(6, 12);
      const quantity = rng.pick(QUANTITIES);
      const value = clean(a * k + b);
      return {
        type: "short",
        prompt: `نرمز بـ xᵢ لرتبة السنة حيث xᵢ = 1 يوافق سنة ${year0}، و yᵢ يمثل ${quantity}. معادلة مستقيم الانحدار هي ${line(a, b)}. قدّر yᵢ في سنة ${year0 + k - 1}.`,
        answer: num(value),
        steps: [
          `سنة ${year0 + k - 1} توافق الرتبة x = ${year0 + k - 1} − ${year0} + 1 = ${k}`,
          `y = ${num(a)} × ${k} + ${num(b)}`,
          `y = ${num(value)}`,
        ],
      };
    },
  },
  {
    id: "solve-for-x",
    skill: "estimation",
    difficulty: 2,
    generate: rng => {
      const a = rng.pick([2, 3, 4, 5, -2, -3, 1.5, 2.5, -1.5]);
      const b = rng.int(10, 80);
      const x = rng.int(6, 15);
      const y0 = clean(a * x + b);
      return {
        type: "short",
        prompt: `معادلة مستقيم الانحدار بالمربعات الدنيا لـ y بدلالة x هي ${line(a, b)}. عيّن قيمة x التي من أجلها يكون التقدير y = ${num(y0)}.`,
        answer: num(x),
        steps: [
          `${linear(a, b)} = ${num(y0)}`,
          `${num(a)}x = ${num(y0)} − ${num(b)} = ${num(clean(y0 - b))}`,
          `x = ${num(clean(y0 - b))}/${paren(num(a))} = ${num(x)}`,
        ],
      };
    },
  },
  {
    id: "threshold-year-mcq",
    skill: "estimation",
    difficulty: 3,
    generate: rng => {
      const a = rng.pick([2, 3, 4, 5, 2.5, 3.5, 6]);
      const b = rng.int(10, 60);
      const N = rng.int(7, 14);
      const year0 = rng.int(2015, 2020);
      const top = clean(a * N + b);
      const T = Number.isInteger(top) ? top - 1 : Math.floor(top);
      const xStar = clean((T - b) / a);
      const year = year0 + N - 1;
      const quantity = rng.pick(QUANTITIES);
      return {
        type: "mcq",
        prompt: `نرمز بـ xᵢ لرتبة السنة حيث xᵢ = 1 يوافق سنة ${year0}، و yᵢ يمثل ${quantity}. معادلة مستقيم الانحدار هي ${line(a, b)}. ابتداءً من أي سنة يتجاوز التقدير القيمة ${T}؟`,
        answer: String(year),
        distractors: [
          { option: String(N), misconception: "rank_as_year" },
          { option: String(year0 + N), misconception: "rank_as_year" },
          { option: String(year - 1), misconception: "threshold_rounding" },
        ],
        steps: [
          `نحل المتراجحة ${linear(a, b)} > ${T}`,
          `${num(a)}x > ${num(clean(T - b))} أي x > ${num(clean(T - b))}/${num(a)} ≈ ${num(Math.round(xStar * 100) / 100)}`,
          `أصغر رتبة طبيعية تحقق ذلك هي x = ${N}`,
          `الرتبة ${N} توافق سنة ${year0} + ${N} − 1 = ${year}`,
        ],
      };
    },
  },
  {
    id: "percentage-change",
    skill: "estimation",
    difficulty: 2,
    generate: rng => {
      const { a, b, k1, k2 } = draw(
        rng,
        g => {
          const k1 = g.int(5, 8);
          return { a: g.pick([2, 3, 4, 5, 6, 10]), b: g.int(5, 60), k1, k2: k1 + g.int(2, 6) };
        },
        ({ a, b, k1, k2 }) => nice((100 * a * (k2 - k1)) / (a * k1 + b), 1)
      );
      const y1 = a * k1 + b;
      const y2 = a * k2 + b;
      const p = clean((100 * (y2 - y1)) / y1);
      return {
        type: "short",
        prompt: `معادلة مستقيم الانحدار هي ${line(a, b)} حيث x رتبة السنة. احسب نسبة التطور المئوية بين التقديرين الموافقين لـ x = ${k1} و x = ${k2}.`,
        answer: num(p),
        accept: [`${num(p)}%`],
        steps: [
          `من أجل x = ${k1}: y = ${num(a)} × ${k1} + ${num(b)} = ${y1}`,
          `من أجل x = ${k2}: y = ${num(a)} × ${k2} + ${num(b)} = ${y2}`,
          `نسبة التطور = (${y2} − ${y1})/${y1} × 100 = ${num(p)}%`,
        ],
      };
    },
  },
  // ----------------------------------------------------- change of variable
  {
    id: "exp-from-z-line",
    skill: "exp_adjustment",
    difficulty: 1,
    generate: rng => {
      const alpha = rng.pick([0.2, 0.3, 0.4, 0.5, 0.6, 1.2, -0.2, -0.5]);
      const beta = rng.int(1, 6);
      const z = linear(alpha, beta);
      const answer = `e^(${z})`;
      return {
        type: "short",
        prompt: `نضع z = ln y. معادلة مستقيم الانحدار لـ z بدلالة x هي z = ${z}. عبّر عن y بدلالة x.`,
        answer,
        steps: ["z = ln y يكافئ y = eᶻ", `y = ${answer}`, `أي y = e${beta === 1 ? "" : `^${beta}`} × e^(${linear(alpha, 0)})`],
      };
    },
  },
  {
    id: "exp-back-mcq",
    skill: "exp_adjustment",
    difficulty: 2,
    generate: rng => {
      const [C, q] = draw(
        rng,
        g => [g.int(2, 9), g.int(2, 5)] as const,
        ([C, q]) => C !== q
      );
      const z = `x ln ${q} + ln ${C}`;
      return {
        type: "mcq",
        prompt: `نضع z = ln y. معادلة مستقيم الانحدار لـ z بدلالة x هي z = ${z}. أي عبارة تعطي y بدلالة x؟`,
        answer: `y = ${C} × ${q}ˣ`,
        distractors: [
          { option: `y = ${q}ˣ + ${C}`, misconception: "exp_back_error" },
          { option: `y = ${q} × ${C}ˣ`, misconception: "exp_back_error" },
          { option: `y = ${z}`, misconception: "ln_forgot_back" },
        ],
        steps: [
          "z = ln y يكافئ y = eᶻ",
          `y = e^(${z}) = e^(x ln ${q}) × e^(ln ${C})`,
          `e^(x ln ${q}) = ${q}ˣ و e^(ln ${C}) = ${C}`,
          `إذن y = ${C} × ${q}ˣ`,
        ],
      };
    },
  },
  {
    id: "z-intercept",
    skill: "exp_adjustment",
    difficulty: 3,
    generate: rng => {
      const C = rng.int(2, 9);
      const q = rng.int(2, 3);
      const xBar = rng.int(1, 4);
      const Y = C * q ** xBar;
      return {
        type: "short",
        prompt: `نضع z = ln y. النقطة المتوسطة لسحابة النقط (xᵢ ; zᵢ) هي ${point(String(xBar), `ln ${Y}`)}، ومعامل توجيه مستقيم الانحدار لـ z بدلالة x هو a = ln ${q}. احسب القيمة المضبوطة لـ b حيث z = ax + b.`,
        answer: `ln ${C}`,
        steps: [
          "b = z̄ − a·x̄",
          `b = ln ${Y} − ${xBar === 1 ? "" : `${xBar} `}ln ${q} = ln ${Y} − ln ${q ** xBar}`,
          `b = ln(${Y}/${q ** xBar}) = ln ${C}`,
        ],
      };
    },
  },
];

export const statisticsLesson: Lesson = {
  key: "math-statistics",
  curriculum: "dz",
  subject: "math",
  title: "الإحصاء: سلسلة إحصائية بمتغيرين",
  levels: ["bac"],
  skills: [
    {
      key: "mean_point",
      name: "المتوسط الحسابي والنقطة المتوسطة",
      prerequisites: [],
      explanation:
        "المتوسط الحسابي لقيم x₁، x₂، …، xₙ هو x̄ = (x₁ + x₂ + … + xₙ)/n = Σxᵢ/n، وبنفس الطريقة ȳ = Σyᵢ/n. في سلسلة إحصائية بمتغيرين نمثل الثنائيات (xᵢ ; yᵢ) بسحابة نقط، والنقطة المتوسطة لهذه السحابة هي G(x̄ ; ȳ): فاصلتها متوسط الفواصل وترتيبها متوسط التراتيب.",
      example: {
        problem: "سلسلة إحصائية: (1 ; 10)، (2 ; 14)، (3 ; 15)، (4 ; 21). عيّن النقطة المتوسطة G.",
        steps: ["x̄ = (1 + 2 + 3 + 4)/4 = 10/4 = 2.5", "ȳ = (10 + 14 + 15 + 21)/4 = 60/4 = 15", "G(2.5 ; 15)"],
        answer: "G(2.5 ; 15)",
      },
      dialogue: {
        opening: "باع متجر خلال أربعة أسابيع متتالية: 10 ثم 14 ثم 15 ثم 21 قطعة. نرمز بـ xᵢ لرتبة الأسبوع (1، 2، 3، 4) وبـ yᵢ لعدد القطع المبيعة.",
        steps: [
          {
            ask: "ما مجموع القطع المبيعة خلال الأسابيع الأربعة، أي Σyᵢ؟",
            answer: "60",
            hint: "اجمع مبيعات كل الأسابيع.",
          },
          {
            ask: "لو بيعت نفس الكمية كل أسبوع، كم قطعة تُباع في الأسبوع؟ هذا هو ȳ.",
            answer: "15",
            hint: "وزّع المجموع بالتساوي على عدد الأسابيع.",
          },
          {
            ask: "بنفس الطريقة احسب متوسط الرتب x̄.",
            answer: "2.5",
            accept: ["5/2"],
            hint: "اجمع الرتب ثم اقسم على عددها.",
            then: "النقطة G(x̄ ; ȳ) هي النقطة المتوسطة: إنها «مركز» سحابة النقط.",
          },
          {
            ask: "لو زادت مبيعات كل أسبوع بقطعتين، كم يصبح ȳ؟",
            answer: "17",
            hint: "كل قيمة زادت بنفس المقدار، فماذا يحدث للمجموع ثم للمتوسط؟",
          },
        ],
        rule: "x̄ = Σxᵢ/n و ȳ = Σyᵢ/n، والنقطة المتوسطة لسحابة النقط (xᵢ ; yᵢ) هي G(x̄ ; ȳ).",
      },
    },
    {
      key: "table_sums",
      name: "جدول السلسلة والمجاميع Σxᵢ² و Σxᵢyᵢ",
      prerequisites: ["mean_point"],
      explanation:
        "نقرأ جدول السلسلة عموداً عموداً: كل عمود ثنائية (xᵢ ; yᵢ). نكمل الجدول بسطرين: xᵢ² و xᵢyᵢ، ثم نجمع كل سطر. Σxᵢ² هو مجموع مربعات القيم (نربّع أولاً ثم نجمع) وهو يختلف عن (Σxᵢ)²، و Σxᵢyᵢ هو مجموع الجداءات عموداً عموداً وهو يختلف عن Σxᵢ × Σyᵢ.",
      example: {
        problem: "السلسلة (1 ; 4)، (2 ; 5)، (3 ; 9). احسب Σxᵢ² و Σxᵢyᵢ.",
        steps: ["Σxᵢ² = 1² + 2² + 3² = 1 + 4 + 9 = 14", "Σxᵢyᵢ = 1×4 + 2×5 + 3×9 = 4 + 10 + 27 = 41"],
        answer: "Σxᵢ² = 14 و Σxᵢyᵢ = 41",
      },
      dialogue: {
        opening: "خذ السلسلة (1 ; 4)، (2 ; 5)، (3 ; 9). سنكمل الجدول بسطر الجداءات xᵢyᵢ.",
        steps: [
          {
            ask: "احسب جداء العمود الثاني x₂y₂.",
            answer: "10",
            hint: "اضرب قيمة x في قيمة y في نفس العمود.",
          },
          {
            ask: "أكمل الجداءات واجمعها: كم يساوي Σxᵢyᵢ؟",
            answer: "41",
            hint: "احسب جداء كل عمود على حدة، ثم اجمع النتائج الثلاث.",
          },
          {
            ask: "قارن: احسب Σxᵢ × Σyᵢ، أي مجموع الفواصل مضروباً في مجموع التراتيب.",
            answer: "108",
            hint: "اجمع سطر x وحده، واجمع سطر y وحده، ثم اضرب النتيجتين.",
            then: "النتيجتان مختلفتان تماماً: مجموع الجداءات ليس جداء المجموعين.",
          },
          {
            ask: "بنفس الفكرة احسب Σxᵢ²: ربّع كل قيمة x ثم اجمع.",
            answer: "14",
            hint: "مربعات القيم الثلاث ثم مجموعها، وليس مربع المجموع.",
          },
        ],
        rule: "Σxᵢyᵢ = x₁y₁ + x₂y₂ + … + xₙyₙ (نضرب عموداً عموداً ثم نجمع)، و Σxᵢ² = x₁² + … + xₙ². وانتبه: Σxᵢyᵢ ≠ Σxᵢ × Σyᵢ و Σxᵢ² ≠ (Σxᵢ)².",
      },
    },
    {
      key: "variance_covariance",
      name: "التباين والتغاير",
      prerequisites: ["table_sums"],
      explanation:
        "تباين المتغير x هو V(x) = Σxᵢ²/n − x̄²، وهو يقيس تشتت القيم حول متوسطها (دائماً موجب). التغاير بين x و y هو cov(x, y) = Σxᵢyᵢ/n − x̄·ȳ: إشارته تعطي اتجاه العلاقة؛ موجب إذا كان y يميل إلى التزايد مع x، وسالب إذا كان يميل إلى التناقص.",
      example: {
        problem: "السلسلة (1 ; 3)، (2 ; 5)، (3 ; 4)، (4 ; 8)، (5 ; 10). احسب V(x) و cov(x, y).",
        steps: [
          "x̄ = 15/5 = 3 و ȳ = 30/5 = 6",
          "Σxᵢ² = 55 إذن V(x) = 55/5 − 3² = 11 − 9 = 2",
          "Σxᵢyᵢ = 3 + 10 + 12 + 32 + 50 = 107",
          "cov(x, y) = 107/5 − 3 × 6 = 21.4 − 18 = 3.4",
        ],
        answer: "V(x) = 2 و cov(x, y) = 3.4",
      },
      dialogue: {
        opening: "السلسلة: (1 ; 3)، (2 ; 5)، (3 ; 4)، (4 ; 8)، (5 ; 10). لدينا x̄ = 3 و ȳ = 6 و Σxᵢ² = 55 و Σxᵢyᵢ = 107.",
        steps: [
          {
            ask: "احسب متوسط المربعات Σxᵢ²/n.",
            answer: "11",
            hint: "اقسم مجموع المربعات على عدد القيم.",
          },
          {
            ask: "التباين هو متوسط المربعات ناقص مربع المتوسط. كم يساوي V(x)؟",
            answer: "2",
            hint: "اطرح من النتيجة السابقة مربع x̄.",
            then: "V(x) = Σxᵢ²/n − x̄².",
          },
          {
            ask: "التغاير يُبنى بنفس الطريقة مع الجداءات. احسب أولاً متوسط الجداءات Σxᵢyᵢ/n.",
            answer: "21.4",
            accept: ["107/5"],
            hint: "اقسم مجموع الجداءات على عدد الثنائيات.",
          },
          {
            ask: "اطرح الآن جداء المتوسطين x̄·ȳ: كم يساوي cov(x, y)؟",
            answer: "3.4",
            accept: ["17/5"],
            hint: "احسب جداء المتوسطين ثم اطرحه من متوسط الجداءات.",
            then: "التغاير موجب: y يميل إلى التزايد عندما يتزايد x.",
          },
        ],
        rule: "V(x) = Σxᵢ²/n − x̄² و cov(x, y) = Σxᵢyᵢ/n − x̄·ȳ: «متوسط الجداءات ناقص جداء المتوسطات».",
      },
    },
    {
      key: "regression_line",
      name: "مستقيم الانحدار بالمربعات الدنيا",
      prerequisites: ["variance_covariance", "mean_point"],
      explanation:
        "مستقيم الانحدار بالمربعات الدنيا لـ y بدلالة x هو المستقيم y = ax + b الأقرب إلى سحابة النقط، حيث a = cov(x, y)/V(x) و b = ȳ − a·x̄. العلاقة الأخيرة تعني أن هذا المستقيم يشمل دائماً النقطة المتوسطة G(x̄ ; ȳ)، ويمكن استعمال ذلك للتحقق من النتيجة.",
      example: {
        problem: "سلسلة فيها x̄ = 3 و ȳ = 6 و V(x) = 2 و cov(x, y) = 3.4. عيّن معادلة مستقيم الانحدار لـ y بدلالة x.",
        steps: ["a = cov(x, y)/V(x) = 3.4/2 = 1.7", "b = ȳ − a·x̄ = 6 − 1.7 × 3 = 6 − 5.1 = 0.9", "y = 1.7x + 0.9"],
        answer: "y = 1.7x + 0.9",
      },
      dialogue: {
        opening: "نواصل مع السلسلة السابقة: x̄ = 3 و ȳ = 6 و V(x) = 2 و cov(x, y) = 3.4. نبحث عن المستقيم y = ax + b الأقرب إلى النقط.",
        steps: [
          {
            ask: "معامل التوجيه هو التغاير مقسوماً على تباين x. كم يساوي a؟",
            answer: "1.7",
            accept: ["17/10"],
            hint: "اقسم cov(x, y) على V(x).",
          },
          {
            ask: "هذا المستقيم يمر بالنقطة المتوسطة G(3 ; 6)، أي 6 = 3a + b. استنتج b.",
            answer: "0.9",
            accept: ["9/10"],
            hint: "عوّض a بقيمته ثم انقل الحد المعلوم إلى الطرف الآخر.",
          },
          {
            ask: "اكتب معادلة مستقيم الانحدار.",
            answer: "1.7x + 0.9",
            accept: ["y = 1.7x + 0.9"],
            hint: "ضع قيمتي a و b في الشكل y = ax + b.",
          },
          {
            ask: "تحقق: عوّض x بـ x̄ في المعادلة. ماذا تجد؟",
            answer: "6",
            hint: "احسب صورة فاصلة G بالمعادلة التي وجدتها.",
            then: "نجد ȳ: المستقيم يشمل G دائماً.",
          },
        ],
        rule: "مستقيم الانحدار بالمربعات الدنيا: y = ax + b حيث a = cov(x, y)/V(x) و b = ȳ − a·x̄، وهو يشمل النقطة المتوسطة G(x̄ ; ȳ).",
      },
    },
    {
      key: "estimation",
      name: "التقدير والتنبؤ باستعمال مستقيم الانحدار",
      prerequisites: ["regression_line"],
      explanation:
        "إذا كان التعديل الخطي ملائماً نستعمل y = ax + b للتقدير: لتقدير y من أجل قيمة x نعوّض مباشرة، ولمعرفة متى يبلغ y قيمة معينة نحل المعادلة أو المتراجحة في x ثم نأخذ أصغر رتبة طبيعية مناسبة ونحولها إلى سنة. نسبة التطور المئوية من y₁ إلى y₂ هي (y₂ − y₁)/y₁ × 100.",
      example: {
        problem: "y = 4x + 30 حيث x رتبة السنة و x = 1 يوافق سنة 2019. ابتداءً من أي سنة يتجاوز y القيمة 70؟",
        steps: ["4x + 30 > 70 أي 4x > 40", "x > 10، فأصغر رتبة طبيعية هي x = 11", "الرتبة 11 توافق سنة 2019 + 11 − 1 = 2029"],
        answer: "ابتداءً من سنة 2029",
      },
      dialogue: {
        opening: "تطور إنتاج مصنع (بالأطنان) معدَّل بالمستقيم y = 4x + 30، حيث x رتبة السنة و x = 1 يوافق سنة 2019.",
        steps: [
          {
            ask: "ما رتبة سنة 2025؟",
            answer: "7",
            hint: "سنة 2019 رتبتها الأولى؛ عدّ السنوات بعدها واحدة واحدة.",
          },
          {
            ask: "قدّر الإنتاج في سنة 2025.",
            answer: "58",
            hint: "عوّض x بالرتبة التي وجدتها في معادلة المستقيم.",
          },
          {
            ask: "من أجل أي رتبة x يكون التقدير 70 طناً بالضبط؟",
            answer: "10",
            hint: "حل المعادلة: اطرح الحد الثابت ثم اقسم على معامل x.",
          },
          {
            ask: "ما السنة الموافقة لهذه الرتبة؟",
            answer: "2028",
            hint: "الرتبة الأولى هي سنة البداية، فأضف إليها عدد الرتب ناقص واحد.",
          },
          {
            ask: "التقدير في الرتبة الخامسة 50 طناً وفي الرتبة العاشرة 70 طناً. ما نسبة التطور المئوية بينهما؟",
            answer: "40",
            accept: ["40%"],
            hint: "اقسم الزيادة على القيمة الأولى ثم اضرب في مئة.",
          },
        ],
        rule: "للتقدير نعوّض x في y = ax + b؛ ولمعرفة متى يبلغ y قيمة نحل المعادلة أو المتراجحة في x ثم نحول الرتبة إلى سنة. نسبة التطور = (y₂ − y₁)/y₁ × 100.",
      },
    },
    {
      key: "exp_adjustment",
      name: "تغيير المتغير z = ln y",
      prerequisites: ["regression_line"],
      explanation:
        "عندما تتضاعف قيم y تقريباً بنفس النسبة (نمو أسي) لا تكون النقط على استقامة، فنضع z = ln y. إذا كانت y = C × qˣ فإن z = x·ln q + ln C: النقط (xᵢ ; zᵢ) على استقامة. نعيّن مستقيم الانحدار z = ax + b ثم نرجع إلى y بـ y = eᶻ = e^(ax + b) = eᵇ × (eᵃ)ˣ.",
      example: {
        problem: "z = ln y ومستقيم الانحدار لـ z بدلالة x هو z = x ln 2 + ln 3. عبّر عن y بدلالة x.",
        steps: ["y = eᶻ = e^(x ln 2 + ln 3)", "y = e^(x ln 2) × e^(ln 3)", "y = 3 × 2ˣ"],
        answer: "y = 3 × 2ˣ",
      },
      dialogue: {
        opening: "عدد مستعملي تطبيق (بالآلاف) خلال الأشهر x = 0، 1، 2، 3 كان: 3، 6، 12، 24. القيم تتضاعف كل شهر، فالنقط ليست على استقامة. نضع z = ln y.",
        steps: [
          {
            ask: "اكتب القيمة المضبوطة لـ z₀ الموافقة لـ y = 3.",
            answer: "ln 3",
            hint: "طبّق اللوغاريتم النيبيري على القيمة الأولى.",
          },
          {
            ask: "احسب z₁ − z₀ = ln 6 − ln 3 بالقيمة المضبوطة.",
            answer: "ln 2",
            hint: "فرق لوغاريتمين هو لوغاريتم حاصل القسمة.",
            then: "وكذلك z₂ − z₁ و z₃ − z₂: الزيادة ثابتة، فالنقط (xᵢ ; zᵢ) على استقامة.",
          },
          {
            ask: "اكتب z بدلالة x.",
            answer: "x ln 2 + ln 3",
            accept: ["ln 3 + x ln 2"],
            hint: "الحد الثابت هو z₀، ومعامل x هو الزيادة الثابتة التي وجدتها.",
          },
          {
            ask: "بما أن y = eᶻ، اكتب y بدلالة x.",
            answer: "3 × 2ˣ",
            accept: ["3·2ˣ"],
            hint: "الأسية تحوّل المجموع إلى جداء، و e^(ln k) = k.",
          },
        ],
        rule: "إذا كانت y = C × qˣ فإن z = ln y = x·ln q + ln C دالة تآلفية لـ x. نعدّل z بمستقيم z = ax + b ثم نرجع إلى y = e^(ax + b) = eᵇ × (eᵃ)ˣ.",
      },
    },
  ],
  misconceptions: {
    mean_point_swapped: "قلب إحداثيي النقطة المتوسطة: G(ȳ ; x̄) بدل G(x̄ ; ȳ)",
    mean_wrong_count: "القسمة على عدد خاطئ (n − 1 مثلاً) عند حساب المتوسط",
    no_division_by_n: "نسيان القسمة على n في المتوسط أو التباين أو التغاير",
    sum_product_confusion: "الخلط بين Σxᵢ² و (Σxᵢ)²، أو بين Σxᵢyᵢ و Σxᵢ × Σyᵢ",
    square_as_double: "حساب xᵢ² على أنه 2xᵢ",
    forgot_mean_product: "نسيان طرح x̄·ȳ في التغاير (أو x̄² في التباين)",
    cov_as_variance: "الخلط بين التغاير cov(x, y) والتباين V(x)",
    slope_inverted: "قلب الكسر: a = V(x)/cov(x, y) بدل a = cov(x, y)/V(x)",
    intercept_sign: "خطأ في الإشارة: b = ȳ + a·x̄ بدل b = ȳ − a·x̄",
    intercept_swap: "تبديل دوري x و y في حساب b: b = x̄ − a·ȳ",
    rank_as_year: "الخلط بين رتبة السنة xᵢ والسنة نفسها أو الخطأ بواحد في التحويل",
    threshold_rounding: "أخذ الجزء الصحيح للحل بدل أصغر عدد طبيعي يحقق المتراجحة",
    exp_back_error: "خطأ في الرجوع من z = ln y إلى y: e^(ax + b) = eᵃˣ + eᵇ أو قلب دوري C و q",
    ln_forgot_back: "نسيان الرجوع إلى y وإعطاء عبارة z = ln y",
  },
  remedies: {
    mean_point_swapped: "G(x̄ ; ȳ): الفاصلة أولاً هي متوسط قيم x، ثم الترتيب وهو متوسط قيم y.",
    mean_wrong_count: "المتوسط = المجموع ÷ عدد القيم n كلها: أربع قيم تعني القسمة على 4.",
    no_division_by_n: "المتوسط والتباين والتغاير كلها «متوسطات»: لا تنس القسمة على n.",
    sum_product_confusion: "Σxᵢ² يعني ربّع ثم اجمع، و Σxᵢyᵢ يعني اضرب عموداً عموداً ثم اجمع؛ أكمل الجدول بسطري xᵢ² و xᵢyᵢ.",
    square_as_double: "xᵢ² = xᵢ × xᵢ وليس 2 × xᵢ: مثلاً 5² = 25.",
    forgot_mean_product: "cov(x, y) = Σxᵢyᵢ/n − x̄·ȳ و V(x) = Σxᵢ²/n − x̄²: الطرح جزء من الدستور.",
    cov_as_variance: "V(x) يستعمل xᵢ² وحده، أما cov(x, y) فيستعمل الجداءات xᵢyᵢ والمتوسطين x̄ و ȳ.",
    slope_inverted: "a = cov(x, y)/V(x): التغاير في البسط وتباين x في المقام.",
    intercept_sign: "المستقيم يشمل G: ȳ = a·x̄ + b، إذن b = ȳ − a·x̄.",
    intercept_swap: "عوّض إحداثيي G في y = ax + b كما هما: y بـ ȳ و x بـ x̄، فتجد b = ȳ − a·x̄.",
    rank_as_year: "حوّل بين الرتبة والسنة: السنة = سنة البداية + الرتبة − 1، والجواب المطلوب سنة.",
    threshold_rounding: "إذا كان x > 9.4 فأصغر رتبة طبيعية هي 10 وليست 9: نأخذ العدد الطبيعي الذي يلي الحل.",
    exp_back_error: "e^(ax + b) = eᵇ × eᵃˣ (جداء لا مجموع)، و e^(x ln q + ln C) = C × qˣ: الثابت C معامل و q أساس القوة.",
    ln_forgot_back: "المطلوب y وليس z: طبّق الدالة الأسية على الطرفين، y = eᶻ.",
  },
  bank: [],
  generators,
  problems: statisticsProblems,
};
