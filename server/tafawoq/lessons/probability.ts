// BAC lesson "الاحتمالات" — skill graph, misconceptions and parametric
// generators (pattern: ./derivativesGenerators.ts). Every probability is
// computed exactly: fractions via frac(), decimals as integers / 10ᵏ.
import type { Lesson } from "../curriculum";
import { frac, join, num, paren, sup, type Generator, type Rng } from "../generators/core";
import { probabilityProblems } from "./probabilityProblems";

/** Re-draws until `valid` holds — keeps generators free of degenerate cases. */
export function draw<T>(rng: Rng, make: (rng: Rng) => T, valid: (value: T) => boolean): T {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = make(rng);
    if (valid(value)) return value;
  }
  throw new Error("generator could not find valid parameters");
}

/** Numerically distinct values (options must never be equal to each other). */
export const distinctValues = (...values: number[]) => new Set(values.map(value => value.toFixed(9))).size === values.length;

function factorial(n: number): number {
  let result = 1;
  for (let k = 2; k <= n; k += 1) result *= k;
  return result;
}

/** Combinations C(n, k). */
export function comb(n: number, k: number): number {
  return factorial(n) / (factorial(k) * factorial(n - k));
}

/** Arrangements A(n, k) = n!/(n − k)!. */
function arr(n: number, k: number): number {
  return factorial(n) / factorial(n - k);
}

/** Decimal k/10 or k/100: "0.3", "0.25". */
const dec = (k: number, scale = 10) => num(k / scale);

/** Integer power as written: "(1/3)²". */
const power = (base: string, exponent: number) => `${paren(base.includes("/") ? `(${base})` : base)}${sup(exponent)}`;

const COLOURS = [
  { name: "حمراء", one: "حمراء" },
  { name: "بيضاء", one: "بيضاء" },
  { name: "خضراء", one: "خضراء" },
] as const;

const probabilityGenerators: Generator[] = [
  // ------------------------------------------------------------------ counting
  {
    id: "arrangements-short",
    skill: "counting",
    difficulty: 1,
    generate: rng => {
      const n = rng.int(5, 10);
      const k = rng.int(2, 3);
      const roles = k === 2 ? "رئيس ونائب له" : "رئيس ونائب له وأمين مال";
      const answer = arr(n, k);
      const factors = Array.from({ length: k }, (_, index) => n - index).join(" × ");
      return {
        type: "short",
        prompt: `بكم طريقة يمكن اختيار ${roles} من بين ${n} تلاميذ (لا يشغل التلميذ أكثر من منصب واحد)؟`,
        answer: num(answer),
        steps: [
          "المناصب مختلفة فالترتيب مهم، ودون تكرار: إنها ترتيبات",
          `A(${n}, ${k}) = ${factors}`,
          `= ${answer}`,
        ],
      };
    },
  },
  {
    id: "combinations-short",
    skill: "counting",
    difficulty: 2,
    generate: rng => {
      const n = rng.int(5, 10);
      const k = rng.int(2, 4);
      const answer = comb(n, k);
      const top = Array.from({ length: k }, (_, index) => n - index).join(" × ");
      const bottom = Array.from({ length: k }, (_, index) => k - index).join(" × ");
      return {
        type: "short",
        prompt: `بكم طريقة يمكن تشكيل لجنة من ${k} أعضاء من بين ${n} أشخاص؟`,
        answer: num(answer),
        steps: [
          "أعضاء اللجنة متساوون فالترتيب غير مهم: إنها توفيقات",
          `C(${n}, ${k}) = (${top})/(${bottom})`,
          `= ${arr(n, k)}/${factorial(k)} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "draws-count-mcq",
    skill: "counting",
    difficulty: 2,
    generate: rng => {
      const [n, k] = draw(
        rng,
        r => [r.int(4, 9), r.int(2, 3)] as const,
        ([n, k]) => distinctValues(comb(n, k), arr(n, k), n ** k, n * k)
      );
      const mode = rng.pick(["together", "ordered", "replaced"] as const);
      const label = {
        together: "في آن واحد",
        ordered: "على التوالي ودون إرجاع",
        replaced: "على التوالي مع الإرجاع",
      }[mode];
      const values = { together: comb(n, k), ordered: arr(n, k), replaced: n ** k };
      const formula = {
        together: `C(${n}, ${k}) = ${comb(n, k)}`,
        ordered: `A(${n}, ${k}) = ${Array.from({ length: k }, (_, i) => n - i).join(" × ")} = ${arr(n, k)}`,
        replaced: `${n}${sup(k)} = ${n ** k}`,
      }[mode];
      const reason = {
        together: "السحب في آن واحد: الترتيب غير مهم ولا تكرار ← توفيقات",
        ordered: "السحب على التوالي دون إرجاع: الترتيب مهم ولا تكرار ← ترتيبات",
        replaced: "السحب على التوالي مع الإرجاع: الترتيب مهم والتكرار ممكن ← قوائم",
      }[mode];
      const tag = (other: keyof typeof values) =>
        mode === "replaced" || other === "replaced" ? "replacement_confusion" : "order_confusion";
      const others = (["together", "ordered", "replaced"] as const).filter(other => other !== mode);
      return {
        type: "mcq",
        prompt: `كيس يحتوي على ${n} كريات مرقمة. نسحب ${k} كريات ${label}. ما عدد السحبات الممكنة؟`,
        answer: num(values[mode]),
        distractors: [
          ...others.map(other => ({ option: num(values[other]), misconception: tag(other) })),
          { option: num(n * k), misconception: "counting_naive_product" },
        ],
        steps: [reason, formula],
      };
    },
  },
  // ------------------------------------------------------ equally likely events
  {
    id: "urn-single-mcq",
    skill: "equally_likely",
    difficulty: 1,
    generate: rng => {
      const [r, w, g] = draw(
        rng,
        rr => [rr.int(2, 7), rr.int(1, 6), rr.int(1, 5)] as const,
        ([r, w, g]) => {
          const total = r + w + g;
          return distinctValues(r / total, r / (total - r), 1 / 3, (total - r) / total);
        }
      );
      const total = r + w + g;
      return {
        type: "mcq",
        prompt: `كيس يحتوي على ${r} كريات حمراء و ${w} كريات بيضاء و ${g} كريات خضراء، لا نفرق بينها باللمس. نسحب كرية واحدة عشوائياً. ما احتمال أن تكون حمراء؟`,
        answer: frac(r, total),
        distractors: [
          { option: frac(r, total - r), misconception: "favorable_over_unfavorable" },
          { option: "1/3", misconception: "colours_equiprobable" },
          { option: frac(total - r, total), misconception: "complement_confusion" },
        ],
        steps: [
          `عدد الحالات الممكنة: ${r} + ${w} + ${g} = ${total}`,
          `عدد الحالات الملائمة (كرية حمراء): ${r}`,
          `P = ${r}/${total}${frac(r, total) === `${r}/${total}` ? "" : ` = ${frac(r, total)}`}`,
        ],
      };
    },
  },
  {
    id: "dice-sum-short",
    skill: "equally_likely",
    difficulty: 1,
    generate: rng => {
      const s = rng.int(3, 11);
      const mode = rng.pick(["equal", "atLeast", "atMost"] as const);
      const matches = (sum: number) => (mode === "equal" ? sum === s : mode === "atLeast" ? sum >= s : sum <= s);
      const pairs: string[] = [];
      for (let a = 1; a <= 6; a += 1) {
        for (let b = 1; b <= 6; b += 1) if (matches(a + b)) pairs.push(`(${a} ; ${b})`);
      }
      const condition =
        mode === "equal" ? `يساوي ${s}` : mode === "atLeast" ? `أكبر من أو يساوي ${s}` : `أصغر من أو يساوي ${s}`;
      const answer = frac(pairs.length, 36);
      return {
        type: "short",
        prompt: `نرمي زهرتي نرد متوازنتين. ما احتمال أن يكون مجموع الرقمين الظاهرين ${condition}؟`,
        answer,
        steps: [
          "عدد الحالات الممكنة: 6 × 6 = 36 ثنائية متساوية الاحتمال",
          pairs.length <= 8
            ? `الثنائيات الملائمة: ${pairs.join(" ، ")} وعددها ${pairs.length}`
            : `نعدّ الثنائيات (a ; b) التي مجموعها ${condition}: عددها ${pairs.length}`,
          `P = ${pairs.length}/36${answer === `${pairs.length}/36` ? "" : ` = ${answer}`}`,
        ],
      };
    },
  },
  {
    id: "urn-together-short",
    skill: "equally_likely",
    difficulty: 2,
    generate: rng => {
      const r = rng.int(2, 6);
      const w = rng.int(2, 6);
      const total = r + w;
      const favorable = comb(r, 2);
      const possible = comb(total, 2);
      return {
        type: "short",
        prompt: `كيس يحتوي على ${r} كريات حمراء و ${w} كريات بيضاء. نسحب عشوائياً كريتين في آن واحد. ما احتمال أن تكون الكريتان حمراوين؟`,
        answer: frac(favorable, possible),
        steps: [
          `عدد الحالات الممكنة: C(${total}, 2) = ${possible}`,
          `عدد الحالات الملائمة: C(${r}, 2) = ${favorable}`,
          `P = ${favorable}/${possible}${frac(favorable, possible) === `${favorable}/${possible}` ? "" : ` = ${frac(favorable, possible)}`}`,
        ],
      };
    },
  },
  {
    id: "urn-successive-mcq",
    skill: "equally_likely",
    difficulty: 3,
    generate: rng => {
      const [r, w] = draw(
        rng,
        rr => [rr.int(2, 6), rr.int(2, 6)] as const,
        ([r, w]) => {
          const t = r + w;
          return distinctValues(
            (r * (r - 1)) / (t * (t - 1)),
            (r * r) / (t * t),
            (r * (r - 1)) / 2 / (t * (t - 1)),
            r / t
          );
        }
      );
      const t = r + w;
      const answer = frac(r * (r - 1), t * (t - 1));
      return {
        type: "mcq",
        prompt: `كيس يحتوي على ${r} كريات حمراء و ${w} كريات بيضاء. نسحب كريتين على التوالي دون إرجاع. ما احتمال أن تكون الكريتان حمراوين؟`,
        answer,
        distractors: [
          { option: frac(r * r, t * t), misconception: "replacement_confusion" },
          { option: frac(r * (r - 1), 2 * t * (t - 1)), misconception: "order_confusion" },
          { option: frac(r, t), misconception: "product_rule_forgotten" },
        ],
        steps: [
          `السحبة الأولى: P = ${r}/${t}`,
          `دون إرجاع يبقى ${r - 1} حمراء من ${t - 1}: P = ${r - 1}/${t - 1}`,
          `P = ${r}/${t} × ${r - 1}/${t - 1} = ${r * (r - 1)}/${t * (t - 1)}${answer === `${r * (r - 1)}/${t * (t - 1)}` ? "" : ` = ${answer}`}`,
        ],
      };
    },
  },
  // ---------------------------------------------------------- event operations
  {
    id: "complement-short",
    skill: "event_operations",
    difficulty: 1,
    generate: rng => {
      const r = rng.int(2, 8);
      const w = rng.int(2, 8);
      const g = rng.int(1, 5);
      const total = r + w + g;
      const colour = rng.pick(COLOURS);
      const count = colour === COLOURS[0] ? r : colour === COLOURS[1] ? w : g;
      return {
        type: "short",
        prompt: `كيس يحتوي على ${r} كريات حمراء و ${w} كريات بيضاء و ${g} كريات خضراء. نسحب كرية واحدة. ما احتمال ألا تكون الكرية ${colour.one}؟`,
        answer: frac(total - count, total),
        steps: [
          `P(${colour.one}) = ${frac(count, total)}`,
          "الحادثة «ليست " + colour.one + "» هي الحادثة العكسية: P(Ā) = 1 − P(A)",
          `P = 1 − ${frac(count, total)} = ${frac(total - count, total)}`,
        ],
      };
    },
  },
  {
    id: "at-least-one-mcq",
    skill: "event_operations",
    difficulty: 2,
    generate: rng => {
      const [s, t, n] = draw(
        rng,
        r => [...r.pick([[1, 6], [1, 5], [1, 4], [1, 3], [2, 5], [1, 7], [1, 8], [2, 7], [1, 10], [3, 10]] as const), r.int(2, 4)] as const,
        ([s, t, n]) => {
          const p = s / t;
          return n * p < 1 && distinctValues(1 - (1 - p) ** n, (1 - p) ** n, n * p, 1 - p ** n);
        }
      );
      const q = t - s;
      const answer = frac(t ** n - q ** n, t ** n);
      const context =
        t === 6 && s === 1
          ? { story: `نرمي زهرة نرد متوازنة ${n} مرات`, success: "الحصول على الرقم 6" }
          : { story: `رامٍ يصيب الهدف باحتمال ${frac(s, t)} في كل رمية، ويرمي ${n} رميات مستقلة`, success: "إصابة الهدف" };
      return {
        type: "mcq",
        prompt: `${context.story}. ما احتمال ${context.success} مرة واحدة على الأقل؟`,
        answer,
        distractors: [
          { option: frac(q ** n, t ** n), misconception: "complement_forgotten" },
          { option: frac(n * s, t), misconception: "at_least_one_sum" },
          { option: frac(t ** n - s ** n, t ** n), misconception: "complement_wrong" },
        ],
        steps: [
          `عكس «مرة واحدة على الأقل» هو «ولا مرة»: احتماله ${power(frac(q, t), n)} = ${frac(q ** n, t ** n)}`,
          `P = 1 − ${frac(q ** n, t ** n)} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "union-mcq",
    skill: "event_operations",
    difficulty: 2,
    generate: rng => {
      const [a, b, c] = draw(
        rng,
        r => [r.int(2, 7), r.int(2, 7), r.int(1, 4)] as const,
        ([a, b, c]) =>
          c < Math.min(a, b) &&
          a + b <= 10 &&
          a + b - 2 * c > 0 &&
          distinctValues(a + b - c, a + b, (a * b) / 10, a + b - 2 * c)
      );
      return {
        type: "mcq",
        prompt: `A و B حادثتان حيث P(A) = ${dec(a)} و P(B) = ${dec(b)} و P(A ∩ B) = ${dec(c)}. ما قيمة P(A ∪ B)؟`,
        answer: dec(a + b - c),
        distractors: [
          { option: dec(a + b), misconception: "union_no_intersection" },
          { option: dec(a * b, 100), misconception: "union_product" },
          { option: dec(a + b - 2 * c), misconception: "union_double_subtract" },
        ],
        steps: [
          "P(A ∪ B) = P(A) + P(B) − P(A ∩ B)",
          `P(A ∪ B) = ${dec(a)} + ${dec(b)} − ${dec(c)}`,
          `= ${dec(a + b - c)}`,
        ],
      };
    },
  },
  {
    id: "intersection-short",
    skill: "event_operations",
    difficulty: 3,
    generate: rng => {
      const [a, b, c] = draw(
        rng,
        r => [r.int(2, 7), r.int(2, 7), r.int(1, 4)] as const,
        ([a, b, c]) => c < Math.min(a, b) && a + b - c <= 9
      );
      const u = a + b - c;
      return {
        type: "short",
        prompt: `A و B حادثتان حيث P(A) = ${dec(a)} و P(B) = ${dec(b)} و P(A ∪ B) = ${dec(u)}. احسب P(A ∩ B).`,
        answer: dec(c),
        steps: [
          "من P(A ∪ B) = P(A) + P(B) − P(A ∩ B) نستنتج P(A ∩ B) = P(A) + P(B) − P(A ∪ B)",
          `P(A ∩ B) = ${dec(a)} + ${dec(b)} − ${dec(u)}`,
          `= ${dec(c)}`,
        ],
      };
    },
  },
  // --------------------------------------------------------------- conditional
  {
    id: "conditional-mcq",
    skill: "conditional",
    difficulty: 2,
    generate: rng => {
      const [a, b, c] = draw(
        rng,
        r => [r.int(2, 8), r.int(2, 8), r.int(1, 4)] as const,
        ([a, b, c]) => c < Math.min(a, b) && distinctValues(c / a, c / b, c / 10, (a * c) / 100)
      );
      return {
        type: "mcq",
        prompt: `A و B حادثتان حيث P(A) = ${dec(a)} و P(B) = ${dec(b)} و P(A ∩ B) = ${dec(c)}. ما قيمة P_A(B) (احتمال B علماً أن A محققة)؟`,
        answer: frac(c, a),
        distractors: [
          { option: frac(c, b), misconception: "conditional_wrong_denominator" },
          { option: dec(c), misconception: "conditional_as_intersection" },
          { option: dec(a * c, 100), misconception: "conditional_multiply" },
        ],
        steps: [
          "P_A(B) = P(A ∩ B)/P(A)",
          `P_A(B) = ${dec(c)}/${dec(a)} = ${c}/${a}`,
          `P_A(B) = ${frac(c, a)}`,
        ],
      };
    },
  },
  {
    id: "intersection-from-conditional",
    skill: "conditional",
    difficulty: 1,
    generate: rng => {
      const a = rng.int(1, 9);
      const b = rng.int(1, 9);
      return {
        type: "short",
        prompt: `P(A) = ${dec(a)} و P_A(B) = ${dec(b)}. احسب P(A ∩ B).`,
        answer: dec(a * b, 100),
        steps: ["P(A ∩ B) = P(A) × P_A(B)", `P(A ∩ B) = ${dec(a)} × ${dec(b)} = ${dec(a * b, 100)}`],
      };
    },
  },
  {
    id: "total-probability-short",
    skill: "conditional",
    difficulty: 2,
    generate: rng => {
      const a = rng.int(2, 8);
      const d1 = rng.int(1, 9);
      const d2 = draw(rng, r => r.int(1, 9), value => value !== d1);
      const total = a * d1 + (10 - a) * d2;
      return {
        type: "short",
        prompt: `مصنع فيه آلتان: الآلة A تنتج ${dec(a)} من القطع والآلة B الباقي. نسبة القطع المعيبة ${dec(d1)} من إنتاج A و ${dec(d2)} من إنتاج B. نختار قطعة عشوائياً؛ ما احتمال أن تكون معيبة (الحادثة D)؟`,
        answer: dec(total, 100),
        steps: [
          `P(B) = 1 − ${dec(a)} = ${dec(10 - a)}`,
          "دستور الاحتمالات الكلية: P(D) = P(A)·P_A(D) + P(B)·P_B(D)",
          `P(D) = ${dec(a)} × ${dec(d1)} + ${dec(10 - a)} × ${dec(d2)} = ${dec(a * d1, 100)} + ${dec((10 - a) * d2, 100)}`,
          `P(D) = ${dec(total, 100)}`,
        ],
      };
    },
  },
  {
    id: "total-probability-mcq",
    skill: "conditional",
    difficulty: 3,
    generate: rng => {
      const [a, d1, d2] = draw(
        rng,
        r => [r.int(2, 8), r.int(1, 8), r.int(1, 8)] as const,
        ([a, d1, d2]) =>
          d1 !== d2 &&
          d1 + d2 < 10 &&
          distinctValues(a * d1 + (10 - a) * d2, a * d1, 10 * (d1 + d2), 5 * (d1 + d2))
      );
      const total = a * d1 + (10 - a) * d2;
      return {
        type: "mcq",
        prompt: `نختار عشوائياً أحد كيسين: الكيس U₁ باحتمال ${dec(a)} والكيس U₂ باحتمال ${dec(10 - a)}. احتمال سحب كرية حمراء (الحادثة R) هو ${dec(d1)} من U₁ و ${dec(d2)} من U₂. ما قيمة P(R)؟`,
        answer: dec(total, 100),
        distractors: [
          { option: dec(a * d1, 100), misconception: "total_prob_one_branch" },
          { option: dec(d1 + d2), misconception: "total_prob_no_multiply" },
          { option: dec(5 * (d1 + d2), 100), misconception: "total_prob_no_multiply" },
        ],
        steps: [
          "في شجرة الاحتمالات نضرب على طول كل فرع ثم نجمع الفروع المؤدية إلى R",
          `P(R) = ${dec(a)} × ${dec(d1)} + ${dec(10 - a)} × ${dec(d2)}`,
          `P(R) = ${dec(a * d1, 100)} + ${dec((10 - a) * d2, 100)} = ${dec(total, 100)}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------ random variable
  {
    id: "missing-probability",
    skill: "random_variable",
    difficulty: 1,
    generate: rng => {
      const q = rng.pick([8, 10, 12]);
      const [x, p] = draw(
        rng,
        r => {
          const values = r.shuffle([-3, -2, -1, 1, 2, 3, 4, 5]).slice(0, 4).sort((u, v) => u - v);
          return [values, [r.int(1, q / 2 - 1), r.int(1, q / 2 - 1), r.int(1, q / 2 - 1)]] as const;
        },
        ([, p]) => q - p[0] - p[1] - p[2] > 0
      );
      const missing = q - p[0] - p[1] - p[2];
      const table = x
        .slice(0, 3)
        .map((value, index) => `P(X = ${num(value)}) = ${frac(p[index], q)}`)
        .join(" ، ");
      return {
        type: "short",
        prompt: `متغير عشوائي X يأخذ القيم ${x.map(num).join(" ، ")} حيث ${table}. احسب P(X = ${num(x[3])}).`,
        answer: frac(missing, q),
        steps: [
          "مجموع احتمالات قانون الاحتمال يساوي 1",
          `P(X = ${num(x[3])}) = 1 − (${frac(p[0], q)} + ${frac(p[1], q)} + ${frac(p[2], q)})`,
          `= 1 − ${frac(q - missing, q)} = ${frac(missing, q)}`,
        ],
      };
    },
  },
  {
    id: "expectation-mcq",
    skill: "random_variable",
    difficulty: 2,
    generate: rng => {
      const q = rng.pick([6, 8, 10]);
      const [x, p] = draw(
        rng,
        r => {
          const values = [r.int(-5, -1), r.int(1, 3), r.int(4, 8)];
          const p1 = r.int(1, q - 2);
          const p2 = r.int(1, q - 1 - p1);
          return [values, [p1, p2, q - p1 - p2]] as const;
        },
        ([x, p]) => {
          const e = (x[0] * p[0] + x[1] * p[1] + x[2] * p[2]) / q;
          const average = (x[0] + x[1] + x[2]) / 3;
          const unsigned = (-x[0] * p[0] + x[1] * p[1] + x[2] * p[2]) / q;
          const sum = x[0] + x[1] + x[2];
          return p[2] > 0 && p[0] !== p[1] && distinctValues(e, average, unsigned, sum);
        }
      );
      const weighted = x[0] * p[0] + x[1] * p[1] + x[2] * p[2];
      const answer = frac(weighted, q);
      return {
        type: "mcq",
        prompt: `قانون احتمال متغير عشوائي X: P(X = ${num(x[0])}) = ${frac(p[0], q)} ، P(X = ${x[1]}) = ${frac(p[1], q)} ، P(X = ${x[2]}) = ${frac(p[2], q)}. ما أمله الرياضياتي E(X)؟`,
        answer,
        distractors: [
          { option: frac(x[0] + x[1] + x[2], 3), misconception: "expectation_simple_average" },
          { option: frac(-x[0] * p[0] + x[1] * p[1] + x[2] * p[2], q), misconception: "expectation_sign_error" },
          { option: num(x[0] + x[1] + x[2]), misconception: "expectation_no_weights" },
        ],
        steps: [
          "E(X) = Σ xᵢ·pᵢ: نضرب كل قيمة في احتمالها ثم نجمع",
          `E(X) = ${join(`${paren(num(x[0]))}×${frac(p[0], q)}`, `${x[1]}×${frac(p[1], q)}`, `${x[2]}×${frac(p[2], q)}`)}`,
          `E(X) = ${num(weighted)}/${q}${answer === `${num(weighted)}/${q}` ? "" : ` = ${answer}`}`,
        ],
      };
    },
  },
  {
    id: "game-expectation-short",
    skill: "random_variable",
    difficulty: 3,
    generate: rng => {
      const win6 = rng.int(4, 12);
      const win45 = rng.int(1, 5);
      const lose = rng.int(1, 4);
      const total = win6 + 2 * win45 - 3 * lose;
      return {
        type: "short",
        prompt: `لعبة: نرمي زهرة نرد متوازنة. إذا ظهر 6 نربح ${win6} DA، وإذا ظهر 4 أو 5 نربح ${win45} DA، وإلا نخسر ${lose} DA. ليكن X الربح الجبري. احسب E(X).`,
        answer: frac(total, 6),
        steps: [
          `قيم X: ${win6} باحتمال 1/6 ، ${win45} باحتمال 2/6 ، ${num(-lose)} باحتمال 3/6`,
          `E(X) = ${win6}×1/6 + ${win45}×2/6 + ${paren(num(-lose))}×3/6`,
          `E(X) = (${join(num(win6), num(2 * win45), num(-3 * lose))})/6 = ${frac(total, 6)}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------------ binomial
  {
    id: "binomial-short",
    skill: "binomial",
    difficulty: 2,
    generate: rng => {
      const [s, t] = rng.pick([[1, 2], [1, 3], [2, 3], [1, 4], [1, 5]] as const);
      const n = rng.int(3, t === 2 ? 5 : 4);
      const k = rng.int(1, n - 1);
      const c = comb(n, k);
      const numerator = c * s ** k * (t - s) ** (n - k);
      const answer = frac(numerator, t ** n);
      return {
        type: "short",
        prompt: `نكرر ${n} مرات بصفة مستقلة تجربة احتمال نجاحها ${frac(s, t)}. ليكن X عدد النجاحات. احسب P(X = ${k}).`,
        answer,
        steps: [
          `X يتبع القانون الثنائي B(${n} ; ${frac(s, t)})`,
          `P(X = ${k}) = C(${n}, ${k}) × ${power(frac(s, t), k)} × ${power(frac(t - s, t), n - k)}`,
          `= ${c} × ${frac(s ** k, t ** k)} × ${frac((t - s) ** (n - k), t ** (n - k))} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "binomial-mcq",
    skill: "binomial",
    difficulty: 3,
    generate: rng => {
      const [s, t, n, k] = draw(
        rng,
        r => {
          const [s, t] = r.pick([[1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5]] as const);
          const n = r.int(3, 4);
          return [s, t, n, r.int(1, n - 1)] as const;
        },
        ([s, t, n, k]) => {
          const p = s / t;
          const c = comb(n, k);
          return (
            2 * k !== n &&
            distinctValues(
              c * p ** k * (1 - p) ** (n - k),
              p ** k * (1 - p) ** (n - k),
              c * p ** (n - k) * (1 - p) ** k,
              c * p ** k
            )
          );
        }
      );
      const q = t - s;
      const c = comb(n, k);
      const answer = frac(c * s ** k * q ** (n - k), t ** n);
      return {
        type: "mcq",
        prompt: `X متغير عشوائي يتبع القانون الثنائي B(${n} ; ${frac(s, t)}). ما قيمة P(X = ${k})؟`,
        answer,
        distractors: [
          { option: frac(s ** k * q ** (n - k), t ** n), misconception: "binomial_no_coefficient" },
          { option: frac(c * s ** (n - k) * q ** k, t ** n), misconception: "binomial_exponent_error" },
          { option: frac(c * s ** k, t ** k), misconception: "binomial_forgot_failure" },
        ],
        steps: [
          "P(X = k) = C(n, k)·pᵏ·(1 − p)ⁿ⁻ᵏ",
          `P(X = ${k}) = ${c} × ${power(frac(s, t), k)} × ${power(frac(q, t), n - k)}`,
          `= ${c} × ${frac(s ** k, t ** k)} × ${frac(q ** (n - k), t ** (n - k))} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "binomial-expectation-mcq",
    skill: "binomial",
    difficulty: 1,
    generate: rng => {
      const [s, t, n] = draw(
        rng,
        r => [...r.pick([[1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [1, 6]] as const), r.int(3, 30)] as const,
        ([s, t, n]) => {
          const p = s / t;
          return distinctValues(n * p, n * (1 - p), n * p * (1 - p), p);
        }
      );
      return {
        type: "mcq",
        prompt: `X يتبع القانون الثنائي B(${n} ; ${frac(s, t)}). ما أمله الرياضياتي E(X)؟`,
        answer: frac(n * s, t),
        distractors: [
          { option: frac(n * (t - s), t), misconception: "binomial_success_failure" },
          { option: frac(n * s * (t - s), t * t), misconception: "variance_confusion" },
          { option: frac(s, t), misconception: "binomial_forgot_n" },
        ],
        steps: ["من أجل X ↝ B(n ; p) لدينا E(X) = n·p", `E(X) = ${n} × ${frac(s, t)} = ${frac(n * s, t)}`],
      };
    },
  },
];

export const probabilityLesson: Lesson = {
  key: "math-probability",
  curriculum: "dz",
  subject: "math",
  title: "الاحتمالات",
  levels: ["bac"],
  skills: [
    {
      key: "counting",
      name: "العدّ: القوائم والترتيبات والتوفيقات",
      prerequisites: [],
      explanation:
        "إذا كان الترتيب مهماً مع إمكانية التكرار نستعمل القوائم (nᵖ)، وإذا كان الترتيب مهماً دون تكرار نستعمل الترتيبات A(n, p) = n!/(n − p)!، وإذا كان الترتيب غير مهم (سحب في آن واحد، لجنة) نستعمل التوفيقات C(n, p) = n!/(p!(n − p)!).",
      example: {
        problem: "بكم طريقة نختار 3 كريات في آن واحد من كيس فيه 6 كريات؟",
        steps: ["الترتيب غير مهم: توفيقات", "C(6, 3) = (6 × 5 × 4)/(3 × 2 × 1)", "= 120/6"],
        answer: "20 طريقة",
      },
      dialogue: {
        opening: "أنت تعرف أن الاختيارات المتتالية تُضرب: إذا كان لديك اختياران ثم ثلاثة اختيارات، فهناك 2 × 3 إمكانية. لن أعطيك الدساتير؛ سنبنيها معاً بأمثلة صغيرة.",
        steps: [
          {
            ask: "رقم سري من خانتين، وكل خانة رقم من 1 إلى 5، والتكرار مسموح (مثل 33). كم رقماً سرياً ممكناً؟",
            answer: "25",
            hint: "الخانة الأولى لها خمسة اختيارات، والخانة الثانية أيضاً لأن التكرار مسموح. اضرب.",
            then: "مع التكرار والترتيب مهم: نضرب نفس العدد في نفسه، هذه هي القوائم.",
          },
          {
            ask: "الآن نختار من 5 تلاميذ رئيساً ثم نائباً له، ولا يمكن أن يكون نفس التلميذ. كم إمكانية؟",
            answer: "20",
            hint: "للرئيس خمسة اختيارات، أما النائب فلا يمكن أن يكون الرئيس نفسه: كم بقي له؟",
            then: "دون تكرار والترتيب مهم: العدد ينقص بواحد في كل مرة، هذه هي الترتيبات.",
          },
          {
            ask: "لو اخترنا تلميذين ليمثلا القسم دون أدوار، فالثنائية (أمين، سارة) هي نفسها (سارة، أمين). كل مجموعة من تلميذين حُسبت في العدد السابق كم مرة؟",
            answer: "2",
            hint: "بكم طريقة يمكن أن نرتب اسمين؟",
          },
          {
            ask: "إذن كم مجموعة من تلميذين يمكن أن نختار من 5 تلاميذ؟",
            answer: "10",
            hint: "خذ عدد إمكانيات (رئيس، نائب) واقسمه على عدد المرات التي تكررت فيها كل مجموعة.",
            then: "حين لا يهم الترتيب نقسم على عدد ترتيبات العناصر المختارة: هذه هي التوفيقات.",
          },
        ],
        rule: "الترتيب مهم مع التكرار: قوائم nᵖ. الترتيب مهم دون تكرار: ترتيبات A(n, p) = n!/(n − p)!. الترتيب غير مهم (سحب في آن واحد، لجنة): توفيقات C(n, p) = A(n, p)/p! = n!/(p!(n − p)!).",
      },
    },
    {
      key: "equally_likely",
      name: "احتمال حادثة في حالة تساوي الاحتمال",
      prerequisites: ["counting"],
      explanation:
        "إذا كانت كل النتائج متساوية الاحتمال فإن P(A) = عدد الحالات الملائمة ÷ عدد الحالات الممكنة. يجب أن يُحسب البسط والمقام بنفس طريقة العدّ (توفيقات مع توفيقات، أو ترتيبات مع ترتيبات).",
      example: {
        problem: "كيس فيه 3 كريات حمراء و 2 بيضاء. نسحب كريتين في آن واحد. ما احتمال أن تكونا حمراوين؟",
        steps: ["الحالات الممكنة: C(5, 2) = 10", "الحالات الملائمة: C(3, 2) = 3", "P = 3/10"],
        answer: "3/10",
      },
      dialogue: {
        opening: "كيس فيه 3 كريات حمراء وكريتان بيضاوان، كلها متماثلة لا نفرق بينها باللمس. أنت تعرف كيف تعدّ؛ سنكتشف الآن كيف نحسب الاحتمال.",
        steps: [
          {
            ask: "نسحب كرية واحدة عشوائياً. كم عدد النتائج الممكنة (كل كرية نتيجة)؟",
            answer: "5",
            hint: "عدّ كل الكريات الموجودة في الكيس، مهما كان لونها.",
          },
          {
            ask: "من بين هذه النتائج، كم نتيجة تعطي كرية حمراء؟",
            answer: "3",
            hint: "عدّ الكريات التي لونها أحمر فقط.",
            then: "هذه هي الحالات الملائمة.",
          },
          {
            ask: "كل الكريات لها نفس الحظ. إذن ما احتمال سحب كرية حمراء؟",
            answer: "3/5",
            hint: "اقسم عدد الحالات الملائمة على عدد كل الحالات الممكنة.",
            then: "الاحتمال = الحالات الملائمة ÷ الحالات الممكنة.",
          },
          {
            ask: "نسحب الآن كريتين في آن واحد: عدد الحالات الممكنة هو C(5, 2) = 10. كم ثنائية تتكون من كريتين حمراوين؟",
            answer: "3",
            hint: "نختار كريتين من بين الكريات الحمراء وحدها، والترتيب لا يهم.",
          },
          {
            ask: "إذن ما احتمال أن تكون الكريتان المسحوبتان حمراوين؟",
            answer: "3/10",
            hint: "نفس الفكرة: الملائمة على الممكنة، وكلاهما مُعدّ بالتوفيقات.",
          },
        ],
        rule: "في حالة تساوي الاحتمال: P(A) = عدد الحالات الملائمة ÷ عدد الحالات الممكنة، ونعدّ البسط والمقام بنفس الطريقة (توفيقات مع توفيقات، ترتيبات مع ترتيبات).",
      },
    },
    {
      key: "event_operations",
      name: "الحادثة العكسية واتحاد حادثتين",
      prerequisites: ["equally_likely"],
      explanation:
        "احتمال الحادثة العكسية: P(Ā) = 1 − P(A)، وهو مفيد لعبارات مثل «مرة واحدة على الأقل». واحتمال الاتحاد: P(A ∪ B) = P(A) + P(B) − P(A ∩ B)، لأن التقاطع يُحسب مرتين عند الجمع.",
      example: {
        problem: "P(A) = 0.5 و P(B) = 0.3 و P(A ∩ B) = 0.1. احسب P(A ∪ B).",
        steps: ["P(A ∪ B) = P(A) + P(B) − P(A ∩ B)", "= 0.5 + 0.3 − 0.1"],
        answer: "P(A ∪ B) = 0.7",
      },
      dialogue: {
        opening: "أنت تعرف أن احتمال الحصول على 6 عند رمي زهرة نرد متوازنة هو 1/6، وأن مجموع احتمالات كل النتائج يساوي 1. انطلق من هنا.",
        steps: [
          {
            ask: "ما احتمال ألا نحصل على 6؟",
            answer: "5/6",
            hint: "كم نتيجة من بين الستة ليست 6؟ أو: ماذا يبقى من 1؟",
            then: "احتمال العكس هو 1 ناقص احتمال الحادثة.",
          },
          {
            ask: "نرمي قطعة نقدية متوازنة 3 مرات. ما احتمال ألا يظهر الوجه F ولا مرة؟",
            answer: "1/8",
            hint: "في كل رمية احتمال عدم ظهور F هو النصف، والرميات مستقلة: اضرب.",
          },
          {
            ask: "إذن ما احتمال أن يظهر الوجه F مرة واحدة على الأقل؟",
            answer: "7/8",
            hint: "«مرة على الأقل» هي عكس «ولا مرة» التي حسبتها للتو.",
            then: "«على الأقل مرة» تُحسب دائماً بالحادثة العكسية.",
          },
          {
            ask: "في قسم: نصف التلاميذ يحبون الرياضيات، وثلثهم يحبون الفيزياء، وسدسهم يحبون المادتين معاً. إذا جمعنا 1/2 + 1/3، فكم مرة حسبنا التلاميذ الذين يحبون المادتين؟",
            answer: "2",
            hint: "التلميذ الذي يحب المادتين موجود في المجموعة الأولى، وهل هو موجود في الثانية أيضاً؟",
          },
          {
            ask: "إذن ما احتمال أن يحب تلميذ مختار عشوائياً الرياضيات أو الفيزياء؟",
            answer: "2/3",
            hint: "اجمع النسبتين ثم أزل ما حسبته زيادة مرة واحدة.",
            then: "نطرح التقاطع مرة واحدة لأنه حُسب مرتين.",
          },
        ],
        rule: "P(Ā) = 1 − P(A)، ونستعملها لـ«مرة واحدة على الأقل»: 1 − P(ولا مرة). و P(A ∪ B) = P(A) + P(B) − P(A ∩ B) لأن التقاطع يُحسب مرتين عند الجمع.",
      },
    },
    {
      key: "conditional",
      name: "الاحتمال الشرطي والاحتمالات الكلية",
      prerequisites: ["event_operations"],
      explanation:
        "احتمال B علماً أن A محققة هو P_A(B) = P(A ∩ B)/P(A)، ومنه P(A ∩ B) = P(A)·P_A(B). في شجرة الاحتمالات نضرب على طول الفرع، ودستور الاحتمالات الكلية: P(B) = P(A)·P_A(B) + P(Ā)·P_Ā(B).",
      example: {
        problem: "P(A) = 0.4 و P_A(B) = 0.5 و P_Ā(B) = 0.2. احسب P(B).",
        steps: ["P(Ā) = 0.6", "P(B) = 0.4 × 0.5 + 0.6 × 0.2", "= 0.2 + 0.12"],
        answer: "P(B) = 0.32",
      },
      dialogue: {
        opening: "في قسم 20 تلميذاً: 12 بنتاً و 8 أولاد. من بين البنات 3 يلبسن نظارات، ومن بين الأولاد 4 يلبسون نظارات. نختار تلميذاً عشوائياً. أنت تعرف حساب الاحتمال بالعدّ؛ سنرى ماذا يتغير حين نعرف معلومة إضافية.",
        steps: [
          {
            ask: "ما احتمال أن يكون التلميذ المختار بنتاً تلبس نظارات؟",
            answer: "3/20",
            hint: "الحالات الممكنة هي كل تلاميذ القسم، والملائمة هي البنات اللواتي يلبسن نظارات.",
            then: "هذا هو احتمال التقاطع P(F ∩ L).",
          },
          {
            ask: "قيل لنا الآن إن المختار بنت. كم عدد الحالات الممكنة بعد هذه المعلومة؟",
            answer: "12",
            hint: "الأولاد لم يعودوا ممكنين: من بقي؟",
          },
          {
            ask: "إذن ما احتمال أن تلبس نظارات علماً أنها بنت؟",
            answer: "1/4",
            hint: "الحالات الملائمة لم تتغير، لكن المقام صار عدد البنات فقط.",
            then: "هذا هو الاحتمال الشرطي P_F(L).",
          },
          {
            ask: "احسب الآن (3/20) ÷ (12/20)، أي P(F ∩ L) ÷ P(F). ماذا تجد؟",
            answer: "1/4",
            hint: "القسمة على كسر هي الضرب في مقلوبه، والعدد 20 يختزل.",
            then: "نفس النتيجة: P_F(L) = P(F ∩ L)/P(F).",
          },
          {
            ask: "الآن بالشجرة: فرع البنات 12/20 × 1/4، وفرع الأولاد 8/20 × 1/2. ما احتمال أن يلبس التلميذ المختار نظارات؟",
            answer: "7/20",
            hint: "احسب جداء كل فرع، ثم اجمع الفرعين المؤديين إلى «يلبس نظارات».",
            then: "تحقق بالعدّ: 3 + 4 تلاميذ من 20.",
          },
        ],
        rule: "P_A(B) = P(A ∩ B)/P(A)، ومنه P(A ∩ B) = P(A)·P_A(B): نضرب على طول الفرع. ودستور الاحتمالات الكلية: P(B) = P(A)·P_A(B) + P(Ā)·P_Ā(B): نجمع كل الفروع المؤدية إلى B.",
      },
    },
    {
      key: "random_variable",
      name: "المتغير العشوائي والأمل الرياضياتي",
      prerequisites: ["equally_likely"],
      explanation:
        "قانون احتمال المتغير العشوائي X هو جدول القيم xᵢ واحتمالاتها pᵢ، ومجموع الاحتمالات يساوي 1. الأمل الرياضياتي هو المتوسط المرجَّح E(X) = Σ xᵢ·pᵢ، وليس المتوسط البسيط للقيم.",
      example: {
        problem: "P(X = −2) = 1/2 ، P(X = 1) = 1/4 ، P(X = 6) = 1/4. احسب E(X).",
        steps: ["E(X) = (−2)×1/2 + 1×1/4 + 6×1/4", "= −1 + 1/4 + 6/4"],
        answer: "E(X) = 3/4",
      },
      dialogue: {
        opening: "لعبة: نرمي زهرة نرد متوازنة؛ إذا ظهر 6 تربح 12 دج، وإلا تخسر 3 دج. نسمي X ربحك الجبري (الخسارة تُكتب بإشارة −). هل اللعبة في صالحك؟ لنكتشف ذلك معاً.",
        steps: [
          {
            ask: "ما هي P(X = 12)؟",
            answer: "1/6",
            hint: "X = 12 يعني أن الزهرة أظهرت 6. كم وجهاً يحقق ذلك من بين الستة؟",
          },
          {
            ask: "وما هي P(X = −3)؟",
            answer: "5/6",
            hint: "هذه هي الحالة العكسية؛ ومجموع احتمالات قيم X يساوي 1.",
            then: "الجدول (قيم X واحتمالاتها) هو قانون احتمال X.",
          },
          {
            ask: "لو لعبت 6 مرات وجاءت النتائج «كما ينبغي»: مرة تربح 12 وخمس مرات تخسر 3. كم ربحك الإجمالي؟",
            answer: "−3",
            hint: "اجمع ما ربحته في المرة الرابحة مع ما خسرته في المرات الخاسرة، والخسارة سالبة.",
          },
          {
            ask: "إذن ما هو متوسط ربحك في اللعبة الواحدة؟",
            answer: "−1/2",
            hint: "اقسم الربح الإجمالي على عدد الألعاب.",
          },
          {
            ask: "احسب الآن 12 × 1/6 + (−3) × 5/6. ماذا تجد؟",
            answer: "−1/2",
            hint: "احسب كل جداء وحده ثم اجمع، ولا تنس الإشارة.",
            then: "نفس المتوسط: كل قيمة مضروبة في احتمالها. اللعبة ليست في صالحك.",
          },
        ],
        rule: "قانون احتمال X: القيم xᵢ واحتمالاتها pᵢ مع Σ pᵢ = 1. الأمل الرياضياتي E(X) = Σ xᵢ·pᵢ هو متوسط مرجَّح بالاحتمالات (ليس المتوسط البسيط للقيم)، وهو متوسط الربح على المدى الطويل.",
      },
    },
    {
      key: "binomial",
      name: "القانون الثنائي",
      prerequisites: ["counting", "random_variable"],
      explanation:
        "إذا كررنا n مرات بصفة مستقلة تجربة برنولي احتمال نجاحها p، فإن عدد النجاحات X يتبع القانون الثنائي B(n ; p) و P(X = k) = C(n, k)·pᵏ·(1 − p)ⁿ⁻ᵏ. أمله E(X) = n·p.",
      example: {
        problem: "X ↝ B(3 ; 1/2). احسب P(X = 2).",
        steps: ["P(X = 2) = C(3, 2) × (1/2)² × (1/2)¹", "= 3 × 1/4 × 1/2"],
        answer: "P(X = 2) = 3/8",
      },
      dialogue: {
        opening: "نرمي قطعة نقدية متوازنة 3 مرات، ونسمي «نجاحاً» ظهور الوجه F. أنت تعرف أن الرميات مستقلة فنضرب احتمالاتها، وتعرف التوفيقات. لنصل معاً إلى دستور القانون الثنائي.",
        steps: [
          {
            ask: "ما احتمال الحصول على النتيجة F ثم F ثم P بهذا الترتيب بالضبط؟",
            answer: "1/8",
            hint: "احتمال كل رمية هو النصف، والرميات مستقلة: اضرب الاحتمالات الثلاثة.",
          },
          {
            ask: "كم نتيجة فيها نجاحان بالضبط من 3 رميات؟ (FFP واحدة منها)",
            answer: "3",
            hint: "اختر موضعي الوجه F من بين المواضع الثلاثة: الترتيب داخل الاختيار لا يهم.",
            then: "هذا هو C(3, 2).",
          },
          {
            ask: "إذن ما احتمال الحصول على نجاحين بالضبط، أي P(X = 2)؟",
            answer: "3/8",
            hint: "كل هذه النتائج لها نفس الاحتمال الذي حسبته في السؤال الأول.",
          },
          {
            ask: "لاعب يسدد كرة 3 مرات، واحتمال نجاحه في كل تسديدة 1/3. ما احتمال: نجاح ثم نجاح ثم فشل، بهذا الترتيب؟",
            answer: "2/27",
            hint: "احتمال الفشل هو 1 − 1/3. اضرب احتمالات التسديدات الثلاث.",
          },
          {
            ask: "إذن ما احتمال أن ينجح مرتين بالضبط؟",
            answer: "2/9",
            hint: "كم ترتيباً فيه نجاحان من ثلاث تسديدات؟ وكل ترتيب له نفس الاحتمال السابق.",
            then: "عدد الترتيبات × احتمال ترتيب واحد.",
          },
        ],
        rule: "إذا كررنا n مرات بصفة مستقلة تجربة احتمال نجاحها p، فعدد النجاحات X يتبع القانون الثنائي B(n ; p): P(X = k) = C(n, k)·pᵏ·(1 − p)ⁿ⁻ᵏ — C(n, k) يعدّ مواضع النجاحات، و pᵏ(1 − p)ⁿ⁻ᵏ احتمال ترتيب واحد. وأمله E(X) = n·p.",
      },
    },
  ],
  misconceptions: {
    order_confusion: "الخلط بين الترتيبات (الترتيب مهم) والتوفيقات (الترتيب غير مهم)",
    replacement_confusion: "الخلط بين السحب مع الإرجاع والسحب دون إرجاع",
    counting_naive_product: "ضرب عدد الكريات في عدد السحبات بدل استعمال قاعدة العدّ المناسبة",
    favorable_over_unfavorable: "قسمة الحالات الملائمة على غير الملائمة بدل قسمتها على كل الحالات الممكنة",
    colours_equiprobable: "اعتبار الألوان متساوية الاحتمال رغم اختلاف عدد الكريات",
    complement_confusion: "الخلط بين الحادثة وحادثتها العكسية",
    product_rule_forgotten: "عدم ضرب احتمالات السحبات المتتالية",
    complement_forgotten: "نسيان طرح احتمال الحادثة العكسية من 1",
    complement_wrong: "خطأ في تحديد الحادثة العكسية",
    at_least_one_sum: "جمع احتمالات التجارب (n × p) لحساب «مرة واحدة على الأقل»",
    union_no_intersection: "نسيان طرح P(A ∩ B) في دستور الاتحاد",
    union_product: "اعتبار احتمال الاتحاد جداءً P(A) × P(B)",
    union_double_subtract: "طرح P(A ∩ B) مرتين في دستور الاتحاد",
    conditional_wrong_denominator: "القسمة على P(B) بدل P(A) في حساب P_A(B)",
    conditional_as_intersection: "الخلط بين P_A(B) و P(A ∩ B)",
    conditional_multiply: "الضرب بدل القسمة في الاحتمال الشرطي",
    total_prob_one_branch: "أخذ فرع واحد فقط من الشجرة في دستور الاحتمالات الكلية",
    total_prob_no_multiply: "جمع الاحتمالات الشرطية دون ضربها في احتمالات الفروع",
    expectation_simple_average: "حساب الأمل كمتوسط بسيط للقيم دون ترجيح",
    expectation_sign_error: "إهمال إشارة القيم السالبة (الخسارة) عند حساب الأمل",
    expectation_no_weights: "جمع القيم دون ضربها في احتمالاتها",
    binomial_no_coefficient: "نسيان المعامل C(n, k) في القانون الثنائي",
    binomial_exponent_error: "تبديل أسّي p و 1 − p في القانون الثنائي",
    binomial_forgot_failure: "نسيان العامل (1 − p)ⁿ⁻ᵏ في القانون الثنائي",
    binomial_success_failure: "الخلط بين احتمال النجاح p واحتمال الفشل 1 − p",
    variance_confusion: "الخلط بين الأمل n·p والتباين n·p·(1 − p)",
    binomial_forgot_n: "نسيان ضرب p في عدد التجارب n",
  },
  remedies: {
    order_confusion: "اسأل نفسك: هل تغيير الترتيب يعطي نتيجة مختلفة؟ إن نعم فترتيبات A(n, p)، وإلا فتوفيقات C(n, p).",
    replacement_confusion: "مع الإرجاع يبقى عدد الكريات نفسه في كل سحبة (nᵖ)، ودون إرجاع ينقص بواحد في كل سحبة.",
    counting_naive_product: "حدّد أولاً نوع السحب (في آن واحد، على التوالي مع أو دون إرجاع) ثم طبّق القاعدة الموافقة له.",
    favorable_over_unfavorable: "المقام هو عدد كل الحالات الممكنة (الملائمة وغير الملائمة معاً).",
    colours_equiprobable: "الكريات هي المتساوية الاحتمال وليست الألوان: احسب عدد كريات كل لون.",
    complement_confusion: "اقرأ السؤال جيداً: هل المطلوب الحادثة نفسها أم عكسها؟ P(Ā) = 1 − P(A).",
    product_rule_forgotten: "في السحبات المتتالية نضرب احتمال كل سحبة (على طول فرع الشجرة).",
    complement_forgotten: "احتمال «ولا مرة» هو احتمال العكس؛ المطلوب هو 1 ناقص هذا الاحتمال.",
    complement_wrong: "عكس «مرة واحدة على الأقل» هو «ولا نجاح» أي (1 − p)ⁿ، وليس «كل المرات نجاح».",
    at_least_one_sum: "الحوادث ليست متنافية فلا نجمع احتمالاتها؛ استعمل الحادثة العكسية: 1 − (1 − p)ⁿ.",
    union_no_intersection: "عند جمع P(A) و P(B) يُحسب التقاطع مرتين، فاطرح P(A ∩ B) مرة واحدة.",
    union_product: "الجداء يخص التقاطع لحادثتين مستقلتين؛ للاتحاد استعمل P(A) + P(B) − P(A ∩ B).",
    union_double_subtract: "التقاطع يُحسب مرتين في P(A) + P(B) فنطرحه مرة واحدة فقط.",
    conditional_wrong_denominator: "في P_A(B) الحادثة المعلومة A هي التي في المقام: P_A(B) = P(A ∩ B)/P(A).",
    conditional_as_intersection: "P(A ∩ B) هو احتمال تحقق الحادثتين معاً، أما P_A(B) فنقسمه على P(A).",
    conditional_multiply: "الاحتمال الشرطي حاصل قسمة: P_A(B) = P(A ∩ B)/P(A)، والضرب يعطي التقاطع P(A)·P_A(B).",
    total_prob_one_branch: "اجمع كل الفروع المؤدية إلى الحادثة، لا فرعاً واحداً فقط.",
    total_prob_no_multiply: "كل فرع يُضرب أولاً في احتمال بدايته: P(A)·P_A(B) + P(Ā)·P_Ā(B).",
    expectation_simple_average: "الأمل متوسط مرجَّح: كل قيمة تُضرب في احتمالها ثم نجمع.",
    expectation_sign_error: "الخسارة قيمة سالبة لـ X: احتفظ بالإشارة − عند الضرب في احتمالها.",
    expectation_no_weights: "لا تكتفِ بجمع القيم؛ E(X) = Σ xᵢ·pᵢ.",
    binomial_no_coefficient: "C(n, k) يعدّ مواضع النجاحات الممكنة بين n تجربة؛ لا تنسه في الدستور.",
    binomial_exponent_error: "p أسّه عدد النجاحات k، و (1 − p) أسّه عدد الإخفاقات n − k.",
    binomial_forgot_failure: "التجارب الباقية n − k إخفاقات، فيجب ضرب (1 − p)ⁿ⁻ᵏ.",
    binomial_success_failure: "p هو احتمال النجاح المعطى في B(n ; p)؛ E(X) = n·p وليس n·(1 − p).",
    variance_confusion: "n·p·(1 − p) هو التباين V(X)؛ الأمل هو E(X) = n·p فقط.",
    binomial_forgot_n: "الأمل هو عدد التجارب مضروباً في احتمال النجاح: E(X) = n·p.",
  },
  bank: [],
  generators: probabilityGenerators,
  problems: probabilityProblems,
};
