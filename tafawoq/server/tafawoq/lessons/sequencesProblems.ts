// BAC-style problems for "المتتاليات العددية" (see ../problems.ts for the pattern).
import { frac, join, linear, num, paren, signed, sup, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};
/** The term u with index i: u₀, u₁₂. */
const term = (name: string, i: number) => `${name}${Array.from(String(i)).map(c => SUBSCRIPTS[c] ?? c).join("")}`;

const ARITH = (r: string) => `حسابية أساسها ${r}`;
const GEO = (q: string) => `هندسية أساسها ${q}`;
const NEITHER = "ليست حسابية ولا هندسية";

/** Ratios q = p/d with 0 < q < 1. */
const RATIOS: Array<readonly [number, number]> = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]];

/** (p/d) raised to a power: "(1/2)ⁿ", "(2/3)ⁿ⁺¹". */
const qPow = (q: string, exponent: string) => `(${q})${exponent}`;
/** k × (p/d)ⁿ written as a teacher would. */
const geo = (k: number, q: string, exponent = "ⁿ") =>
  k === 1 ? qPow(q, exponent) : k === -1 ? `−${qPow(q, exponent)}` : `${num(k)} × ${qPow(q, exponent)}`;
/** k(body): "3(…)", "−(…)", "(…)". */
const times = (k: number, body: string) => (k === 1 ? `(${body})` : k === -1 ? `−(${body})` : `${num(k)}(${body})`);

export const sequenceProblems: ProblemGenerator[] = [
  {
    id: "affine-recurrence",
    title: "متتالية معرفة بعلاقة تراجعية ومتتالية مساعدة",
    generate(rng: Rng) {
      let p = 1;
      let d = 2;
      let l = 1;
      let c = 1;
      for (;;) {
        [p, d] = rng.pick(RATIOS);
        l = rng.nonZero(-6, 8);
        c = rng.pick([-3, -2, -1, 1, 2, 3]);
        // Sₙ needs v₀/(1 − q) = c·d³/(d − p) to be an integer.
        if ((c * d ** 3) % (d - p) === 0) break;
      }
      const q = frac(p, d);
      const v0 = c * d * d;
      const u0 = l + v0;
      const v1 = c * p * d;
      const v2 = c * p * p;
      const u1 = l + v1;
      const u2 = l + v2;
      const K = (c * d ** 3) / (d - p);
      const bP = l * (d - p);
      const recurrence = `(${q})uₙ ${bP > 0 ? "+" : "−"} ${frac(Math.abs(bP), d)}`;
      const vn = geo(v0, q);
      const un = join(vn, num(l));
      const sumGeo = times(K, `1 − ${qPow(q, "ⁿ⁺¹")}`);
      const sumArith = Math.abs(l) === 1 ? "(n + 1)" : `${num(Math.abs(l))}(n + 1)`;
      const Sn = `${sumGeo} ${l > 0 ? "+" : "−"} ${sumArith}`;
      return {
        statement: [
          `نعتبر المتتالية العددية (uₙ) المعرفة على ℕ بـ: u₀ = ${num(u0)} ومن أجل كل عدد طبيعي n: uₙ₊₁ = ${recurrence}.`,
          `ونعتبر المتتالية (vₙ) المعرفة على ℕ بـ: vₙ = uₙ ${l > 0 ? "−" : "+"} ${Math.abs(l)}.`,
        ].join("\n"),
        parts: [
          {
            skill: "sequence_nature",
            difficulty: 1,
            type: "short",
            prompt: "احسب u₁ و u₂، ثم اكتب قيمة u₂.",
            answer: num(u2),
            steps: [
              `u₁ = (${q}) × ${paren(num(u0))} ${bP > 0 ? "+" : "−"} ${frac(Math.abs(bP), d)} = ${num(u1)}`,
              `u₂ = (${q}) × ${paren(num(u1))} ${bP > 0 ? "+" : "−"} ${frac(Math.abs(bP), d)} = ${num(u2)}`,
            ],
          },
          {
            skill: "sequence_nature",
            difficulty: 2,
            type: "short",
            prompt: "بيّن أن (vₙ) متتالية هندسية، ثم اكتب أساسها q.",
            answer: q,
            steps: [
              `vₙ₊₁ = uₙ₊₁ − ${paren(num(l))} = (${q})uₙ ${bP > 0 ? "+" : "−"} ${frac(Math.abs(bP), d)} ${l > 0 ? "−" : "+"} ${Math.abs(l)}`,
              `vₙ₊₁ = (${q})uₙ ${(bP - l * d) > 0 ? "+" : "−"} ${frac(Math.abs(bP - l * d), d)} = (${q})(uₙ ${l > 0 ? "−" : "+"} ${Math.abs(l)})`,
              `إذن vₙ₊₁ = (${q})vₙ: المتتالية (vₙ) هندسية أساسها q = ${q}`,
            ],
          },
          {
            skill: "geo_term",
            difficulty: 2,
            type: "short",
            prompt: "احسب v₀ ثم اكتب vₙ بدلالة n.",
            answer: vn,
            steps: [
              `v₀ = u₀ ${l > 0 ? "−" : "+"} ${Math.abs(l)} = ${num(u0)} ${l > 0 ? "−" : "+"} ${Math.abs(l)} = ${num(v0)}`,
              "vₙ = v₀ × qⁿ",
              `vₙ = ${vn}`,
            ],
          },
          {
            skill: "geo_term",
            difficulty: 2,
            type: "short",
            prompt: "استنتج عبارة uₙ بدلالة n.",
            answer: un,
            accept: [`uₙ = ${un}`],
            steps: [`vₙ = uₙ − ${paren(num(l))} إذن uₙ = vₙ ${signed(l)}`, `uₙ = ${un}`],
          },
          {
            skill: "geometric_limits",
            difficulty: 2,
            type: "short",
            prompt: "احسب نهاية المتتالية (uₙ) عندما يؤول n إلى +∞.",
            answer: num(l),
            steps: [
              `0 < ${q} < 1 إذن ${qPow(q, "ⁿ")} يؤول إلى 0`,
              `إذن ${vn} يؤول إلى 0`,
              `lim uₙ = 0 ${signed(l)} = ${num(l)}`,
            ],
          },
          {
            skill: "sequence_sums",
            difficulty: 3,
            type: "short",
            prompt: "نضع Sₙ = u₀ + u₁ + … + uₙ. اكتب Sₙ بدلالة n.",
            answer: Sn,
            accept: [`Sₙ = ${Sn}`],
            steps: [
              `Sₙ = (v₀ + v₁ + … + vₙ) + (n + 1) × ${paren(num(l))} لأن uₖ = vₖ ${signed(l)}`,
              `v₀ + … + vₙ = v₀ × (1 − qⁿ⁺¹)/(1 − q) = ${num(v0)} × (1 − ${qPow(q, "ⁿ⁺¹")})/(${frac(d - p, d)}) = ${sumGeo}`,
              `Sₙ = ${Sn}`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "savings-plan",
    title: "مخطط ادخار شهري",
    streams: ["gestion"],
    generate(rng: Rng) {
      const A = rng.pick([1000, 1500, 2000, 2500, 3000, 4000]);
      const r = rng.pick([100, 150, 200, 250, 300, 400, 500]);
      const m = rng.int(6, 15);
      const N = rng.int(15, 24);
      const deposit = (n: number) => A + (n - 1) * r;
      const total = (n: number) => (n * (2 * A + (n - 1) * r)) / 2;
      const u3 = deposit(3);
      const X = deposit(m);
      const S12 = total(12);
      const T = Math.ceil((total(N - 1) + 1) / 1000) * 1000;
      const un = linear(r, A - r, "n");
      return {
        statement: [
          `قرّر أمين أن يدّخر مبلغاً من المال كل شهر: يضع في الشهر الأول ${A} دج، ثم يضع في كل شهر ${r} دج أكثر مما وضعه في الشهر الذي قبله.`,
          "نسمي uₙ المبلغ (بالدينار) الذي يضعه أمين في الشهر رقم n، فيكون u₁ = " + A + ".",
        ].join("\n"),
        parts: [
          {
            skill: "arith_term",
            difficulty: 1,
            type: "short",
            prompt: "احسب u₂ و u₃، ثم اكتب قيمة u₃.",
            answer: num(u3),
            steps: [`u₂ = ${A} + ${r} = ${A + r}`, `u₃ = ${A + r} + ${r} = ${u3}`],
          },
          {
            skill: "sequence_nature",
            difficulty: 1,
            type: "mcq",
            prompt: "المتتالية (uₙ):",
            answer: ARITH(String(r)),
            distractors: [
              { option: GEO(String(r)), misconception: "confuse_r_q" },
              { option: ARITH(String(A)), misconception: "ratio_misread" },
              { option: NEITHER, misconception: "nature_unrecognized" },
            ],
            steps: [`uₙ₊₁ = uₙ + ${r} من أجل كل n ≥ 1`, `نضيف دائماً نفس العدد ${r}: المتتالية حسابية أساسها r = ${r}`],
          },
          {
            skill: "arith_term",
            difficulty: 2,
            type: "short",
            prompt: "اكتب uₙ بدلالة n.",
            answer: un,
            accept: [`uₙ = ${un}`],
            steps: [
              "الحد الأول هو u₁ إذن uₙ = u₁ + (n − 1)·r",
              `uₙ = ${A} + (n − 1) × ${r} = ${A} + ${r}n − ${r}`,
              `uₙ = ${un}`,
            ],
          },
          {
            skill: "arith_term",
            difficulty: 2,
            type: "short",
            prompt: `في أي شهر يضع أمين مبلغ ${X} دج؟ (اكتب رقم الشهر n)`,
            answer: String(m),
            steps: [
              `uₙ = ${X} يعني ${un} = ${X}`,
              `${r}n = ${X} − ${A - r} = ${X - (A - r)}`,
              `n = ${X - (A - r)}/${r} = ${m}`,
            ],
          },
          {
            skill: "sequence_sums",
            difficulty: 2,
            type: "short",
            prompt: "احسب المبلغ الإجمالي S₁₂ = u₁ + u₂ + … + u₁₂ الذي يدّخره أمين خلال سنة كاملة.",
            answer: num(S12),
            steps: [
              `u₁₂ = ${A} + 11 × ${r} = ${deposit(12)}`,
              "عدد الحدود من u₁ إلى u₁₂ هو 12",
              `S₁₂ = 12 × (u₁ + u₁₂)/2 = 6 × (${A} + ${deposit(12)}) = ${S12}`,
            ],
          },
          {
            skill: "sequence_sums",
            difficulty: 3,
            type: "short",
            prompt: `نضع Sₙ = u₁ + u₂ + … + uₙ. ما هو أصغر عدد من الأشهر n الذي يكون فيه المبلغ المدّخر Sₙ ≥ ${T} دج؟`,
            answer: String(N),
            steps: [
              `Sₙ = n × (u₁ + uₙ)/2 = n × (${A} + ${un})/2 = ${join(`${num(r / 2)}n²`, `${num(A - r / 2)}n`)}`,
              `نحل المتراجحة ${join(`${num(r / 2)}n²`, `${num(A - r / 2)}n`)} ≥ ${T} في ℕ`,
              `${term("S", N - 1)} = ${total(N - 1)} < ${T} و ${term("S", N)} = ${total(N)} ≥ ${T}`,
              `أصغر عدد من الأشهر هو n = ${N}`,
            ],
          },
        ],
      };
    },
  },
];
