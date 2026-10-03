// BAC-style problems for "الاحتمالات" (see ../problems.ts for the pattern).
// Every probability is computed as an exact fraction [numerator, denominator].
import { frac, gcd, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";
import { comb, distinctValues, draw } from "./probability";

type Q = [number, number];

const q = (p: number, d: number): Q => {
  const g = gcd(p, d);
  return [p / g, d / g];
};
const add = (x: Q, y: Q): Q => q(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const sub = (x: Q, y: Q): Q => q(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
const mult = (x: Q, y: Q): Q => q(x[0] * y[0], x[1] * y[1]);
const div = (x: Q, y: Q): Q => q(x[0] * y[1], x[1] * y[0]);
const show = (x: Q) => frac(x[0], x[1]);
const value = (x: Q) => x[0] / x[1];
const ONE: Q = [1, 1];

/** "p/d = reduced", or just "p/d" when already reduced. */
const ratio = (p: number, d: number) => {
  const reduced = frac(p, d);
  return reduced === `${p}/${d}` ? reduced : `${p}/${d} = ${reduced}`;
};

/** "كرية حمراء واحدة", "كريتان حمراوان", "4 كريات حمراء". */
function balls(n: number, colour: "red" | "white"): string {
  if (n === 1) return colour === "red" ? "كرية حمراء واحدة" : "كرية بيضاء واحدة";
  if (n === 2) return colour === "red" ? "كريتين حمراوين" : "كريتين بيضاوين";
  return `${n} كريات ${colour === "red" ? "حمراء" : "بيضاء"}`;
}

/** Die outcomes that send us to the first urn: m favourable faces out of 6. */
const DIE_EVENTS: Record<number, string> = {
  1: "الرقم 6",
  2: "رقم مضاعف للعدد 3",
  3: "رقم زوجي",
  4: "رقم أصغر من أو يساوي 4",
};

export const probabilityProblems: ProblemGenerator[] = [
  {
    id: "two-urns-tree",
    title: "السحب من الصندوقين وشجرة الاحتمالات",
    generate(rng: Rng) {
      const { m, a, b, c, d } = draw(
        rng,
        r => ({ m: r.int(1, 4), a: r.int(1, 5), b: r.int(1, 5), c: r.int(1, 5), d: r.int(1, 5) }),
        ({ m, a, b, c, d }) => {
          if (a * (c + d) === c * (a + b)) return false; // same composition: the die would not matter
          const pU1: Q = q(m, 6);
          const pR = add(mult(pU1, q(a, a + b)), mult(q(6 - m, 6), q(c, c + d)));
          const pW = sub(ONE, pR);
          const u1W = mult(pU1, q(b, a + b));
          const notU1R = sub(ONE, mult(pU1, q(a, a + b)));
          return pR[1] <= 60 && distinctValues(value(pW), value(pR), value(u1W), value(notU1R));
        }
      );
      const pU1: Q = q(m, 6);
      const pU2: Q = q(6 - m, 6);
      const r1: Q = q(a, a + b);
      const r2: Q = q(c, c + d);
      const u1R = mult(pU1, r1);
      const u2R = mult(pU2, r2);
      const pR = add(u1R, u2R);
      const pW = sub(ONE, pR);
      const u1W = mult(pU1, q(b, a + b));
      const notU1R = sub(ONE, u1R);
      const bayes = div(u1R, pR);
      return {
        statement: [
          `صندوقان U₁ و U₂: يحتوي U₁ على ${balls(a, "red")} و ${balls(b, "white")}، ويحتوي U₂ على ${balls(c, "red")} و ${balls(d, "white")}. الكريات متماثلة لا نفرق بينها باللمس.`,
          `نرمي زهرة نرد متوازنة: إذا ظهر ${DIE_EVENTS[m]} نسحب عشوائياً كرية من الصندوق U₁، وإلا نسحب كرية من الصندوق U₂.`,
          "نسمي الحوادث: U₁ «السحب من الصندوق U₁»، U₂ «السحب من الصندوق U₂»، R «الكرية المسحوبة حمراء».",
        ].join("\n"),
        parts: [
          {
            skill: "equally_likely",
            difficulty: 1,
            type: "short",
            prompt: "احسب P(U₁)، ثم احسب الاحتمال الشرطي P_U₁(R). اكتب P_U₁(R).",
            answer: show(r1),
            steps: [
              `الزهرة متوازنة، والحادثة «ظهور ${DIE_EVENTS[m]}» توافق ${m} من 6 أوجه، إذن P(U₁) = ${show(pU1)} و P(U₂) = ${show(pU2)}`,
              `علماً أن السحب من U₁: فيه ${a + b} كريات منها ${a} حمراء`,
              `P_U₁(R) = ${ratio(a, a + b)}`,
            ],
          },
          {
            skill: "conditional",
            difficulty: 1,
            type: "short",
            prompt: "أنشئ شجرة الاحتمالات، ثم احسب P(U₁ ∩ R).",
            answer: show(u1R),
            steps: [
              `على الشجرة: P_U₁(R) = ${show(r1)} و P_U₂(R) = ${show(r2)}`,
              "نضرب على طول الفرع: P(U₁ ∩ R) = P(U₁) × P_U₁(R)",
              `P(U₁ ∩ R) = ${show(pU1)} × ${show(r1)} = ${show(u1R)}`,
            ],
          },
          {
            skill: "conditional",
            difficulty: 2,
            type: "short",
            prompt: "باستعمال دستور الاحتمالات الكلية، احسب P(R).",
            answer: show(pR),
            steps: [
              "الحوادث U₁ و U₂ تشكل تجزئة لمجموعة الإمكانيات",
              "P(R) = P(U₁) × P_U₁(R) + P(U₂) × P_U₂(R)",
              `P(R) = ${show(u1R)} + ${show(pU2)} × ${show(r2)} = ${show(u1R)} + ${show(u2R)}`,
              `P(R) = ${show(pR)}`,
            ],
          },
          {
            skill: "event_operations",
            difficulty: 2,
            type: "mcq",
            prompt: "استنتج احتمال أن تكون الكرية المسحوبة بيضاء:",
            answer: show(pW),
            distractors: [
              { option: show(pR), misconception: "complement_confusion" },
              { option: show(u1W), misconception: "total_prob_one_branch" },
              { option: show(notU1R), misconception: "complement_wrong" },
            ],
            steps: [
              "الحادثة «الكرية بيضاء» هي الحادثة العكسية R̄ للحادثة R",
              `P(R̄) = 1 − P(R) = 1 − ${show(pR)} = ${show(pW)}`,
            ],
          },
          {
            skill: "conditional",
            difficulty: 3,
            type: "short",
            prompt: "علماً أن الكرية المسحوبة حمراء، ما احتمال أن تكون قد سُحبت من الصندوق U₁؟",
            answer: show(bayes),
            steps: [
              "المطلوب الاحتمال الشرطي P_R(U₁) = P(U₁ ∩ R) / P(R)",
              `P_R(U₁) = ${show(u1R)} ÷ ${show(pR)}`,
              `P_R(U₁) = ${show(bayes)}`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "random-variable-game",
    title: "متغير عشوائي: قانون الاحتمال والأمل ولعبة عادلة",
    generate(rng: Rng) {
      const { r, w, g } = draw(
        rng,
        rr => ({ r: rr.int(2, 6), w: rr.int(2, 6), g: rr.pick([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) }),
        ({ r, w, g }) => r + w <= 10 && (2 * r * g) % (r + w) === 0
      );
      const n = r + w;
      const total = comb(n, 2);
      const p2 = q(comb(r, 2), total);
      const p1 = q(r * w, total);
      const p0 = sub(sub(ONE, p1), p2);
      const expectation = add(p1, mult([2, 1], p2));
      const k = (2 * r * g) / n;
      return {
        statement: [
          `كيس يحتوي على ${balls(r, "red")} و ${balls(w, "white")}، لا نفرق بينها باللمس. نسحب عشوائياً وفي آن واحد كريتين من الكيس.`,
          "ليكن X المتغير العشوائي الذي يرفق بكل سحبة عدد الكريات الحمراء المسحوبة.",
          `نقترح اللعبة التالية: يدفع اللاعب مبلغ k دج ليشارك، ثم يتحصل على ${g} دج عن كل كرية حمراء مسحوبة.`,
        ].join("\n"),
        parts: [
          {
            skill: "counting",
            difficulty: 1,
            type: "short",
            prompt: "ما هو عدد السحبات الممكنة؟",
            answer: String(total),
            steps: [
              "السحب في آن واحد: الترتيب غير مهم، نستعمل التوفيقات",
              `عدد السحبات الممكنة: C(${n}, 2) = (${n} × ${n - 1})/2 = ${total}`,
            ],
          },
          {
            skill: "equally_likely",
            difficulty: 1,
            type: "short",
            prompt: "احسب P(X = 2).",
            answer: show(p2),
            steps: [
              "X = 2 يعني سحب كريتين حمراوين",
              `عدد الحالات الملائمة: C(${r}, 2) = ${comb(r, 2)}`,
              `P(X = 2) = ${ratio(comb(r, 2), total)}`,
            ],
          },
          {
            skill: "equally_likely",
            difficulty: 2,
            type: "short",
            prompt: "احسب P(X = 1).",
            answer: show(p1),
            steps: [
              "X = 1 يعني سحب كرية حمراء وكرية بيضاء",
              `عدد الحالات الملائمة: C(${r}, 1) × C(${w}, 1) = ${r} × ${w} = ${r * w}`,
              `P(X = 1) = ${ratio(r * w, total)}`,
            ],
          },
          {
            skill: "random_variable",
            difficulty: 2,
            type: "short",
            prompt: "استنتج P(X = 0)، ثم اكتب قانون احتمال X.",
            answer: show(p0),
            steps: [
              "مجموع احتمالات قيم X يساوي 1",
              `P(X = 0) = 1 − ${show(p1)} − ${show(p2)} = ${show(p0)}`,
              `تحقق: C(${w}, 2)/${total} = ${ratio(comb(w, 2), total)}`,
              `قانون احتمال X: القيم 0 ؛ 1 ؛ 2 واحتمالاتها ${show(p0)} ؛ ${show(p1)} ؛ ${show(p2)}`,
            ],
          },
          {
            skill: "random_variable",
            difficulty: 2,
            type: "short",
            prompt: "احسب الأمل الرياضياتي E(X).",
            answer: show(expectation),
            steps: [
              "E(X) = 0 × P(X = 0) + 1 × P(X = 1) + 2 × P(X = 2)",
              `E(X) = ${show(p1)} + 2 × ${show(p2)}`,
              `E(X) = ${show(expectation)}`,
            ],
          },
          {
            skill: "random_variable",
            difficulty: 3,
            type: "short",
            prompt: "ليكن Y الربح الجبري للاعب، أي Y = " + g + "X − k. عيّن قيمة k التي تجعل اللعبة عادلة (أي E(Y) = 0).",
            answer: String(k),
            steps: [
              `بخطية الأمل: E(Y) = ${g} × E(X) − k`,
              `E(Y) = ${g} × ${show(expectation)} − k = ${k} − k`,
              `اللعبة عادلة إذا كان E(Y) = 0، أي k = ${k} دج`,
            ],
          },
        ],
      };
    },
  },
];
