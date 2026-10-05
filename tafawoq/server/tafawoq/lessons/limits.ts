// BAC lesson "النهايات والاستمرارية" (Algerian curriculum): skill graph,
// misconceptions and parametric generators (see ../generators/core.ts and
// ./derivativesGenerators.ts for the pattern). Any answer that is ±∞, an
// interval or a sentence is multiple choice; numeric limits are typed.
import type { Lesson } from "../curriculum";
import { limitsProblems } from "./limitsProblems";
import {
  frac,
  join,
  linear,
  mul,
  num,
  paren,
  poly,
  sup,
  times,
  type Generator,
  type Rng,
} from "../generators/core";

/** Re-draws until `valid` holds — keeps generators free of degenerate cases. */
function draw<T>(rng: Rng, make: (rng: Rng) => T, valid: (value: T) => boolean): T {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = make(rng);
    if (valid(value)) return value;
  }
  throw new Error("generator could not find valid parameters");
}

const distinct = (...values: string[]) => new Set(values).size === values.length;

const inf = (sign: number) => (sign > 0 ? "+∞" : "−∞");
const monomial = (a: number, n: number) => poly([[n, a]]);
const side = (s: number) => (s > 0 ? "+∞" : "−∞");
const NO_LIMIT = "ليست لها نهاية";

const limitsGenerators: Generator[] = [
  // --- نهاية كثير حدود عند اللانهاية -----------------------------------
  {
    id: "poly-plus-infinity",
    skill: "poly_limits_infinity",
    difficulty: 1,
    generate: rng => {
      const [a, n, b, c] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.int(2, 4), r.nonZero(-9, 9), r.nonZero(-9, 9)] as const,
        ([a, , b]) => a * b < 0
      );
      const f = poly([[n, a], [1, b], [0, c]]);
      return {
        type: "mcq",
        prompt: `f(x) = ${f}. احسب النهاية lim (x → +∞) f(x).`,
        answer: inf(a),
        distractors: [
          { option: inf(-a), misconception: "leading_sign_error" },
          { option: num(c), misconception: "constant_term_instead_of_leading" },
          { option: "0", misconception: "inf_minus_inf_zero" },
        ],
        steps: [
          `بالتعويض المباشر نجد حالة عدم تعيين من الشكل ∞ − ∞`,
          `نهاية كثير حدود عند +∞ هي نهاية حده الأعلى درجة: lim (x → +∞) f(x) = lim (x → +∞) ${monomial(a, n)}`,
          `lim (x → +∞) x${sup(n)} = +∞ والمعامل ${num(a)} ${a > 0 ? "موجب" : "سالب"}، إذن النهاية ${inf(a)}`,
        ],
      };
    },
  },
  {
    id: "poly-minus-infinity",
    skill: "poly_limits_infinity",
    difficulty: 2,
    generate: rng => {
      const [a, n, b, c] = draw(
        rng,
        r => [r.nonZero(-4, 4), r.int(2, 5), r.nonZero(-7, 7), r.nonZero(-9, 9)] as const,
        () => true
      );
      const parity = n % 2 === 0 ? 1 : -1;
      const s = a * parity;
      const f = poly([[n, a], [n - 1, b], [0, c]]);
      return {
        type: "mcq",
        prompt: `f(x) = ${f}. احسب النهاية lim (x → −∞) f(x).`,
        answer: inf(s),
        distractors: [
          { option: inf(-s), misconception: "leading_sign_error" },
          { option: num(c), misconception: "constant_term_instead_of_leading" },
          { option: "0", misconception: "inf_minus_inf_zero" },
        ],
        steps: [
          `عند −∞ نهاية كثير الحدود هي نهاية حده الأعلى درجة ${monomial(a, n)}`,
          `الأس ${n} ${parity > 0 ? "زوجي إذن lim (x → −∞) x" + sup(n) + " = +∞" : "فردي إذن lim (x → −∞) x" + sup(n) + " = −∞"}`,
          `نضرب في المعامل ${num(a)}: lim (x → −∞) f(x) = ${inf(s)}`,
        ],
      };
    },
  },

  // --- نهاية دالة ناطقة عند اللانهاية ----------------------------------
  {
    id: "rational-same-degree",
    skill: "rational_limits_infinity",
    difficulty: 1,
    generate: rng => {
      const [a, b, c, d, e, g] = draw(
        rng,
        r =>
          [r.nonZero(-6, 6), r.int(-5, 5), r.int(-9, 9), r.nonZero(-5, 5), r.int(-5, 5), r.nonZero(-9, 9)] as const,
        ([a, , , d]) => a !== d
      );
      const s = rng.chance(0.5) ? 1 : -1;
      const top = poly([[2, a], [1, b], [0, c]]);
      const bottom = poly([[2, d], [1, e], [0, g]]);
      return {
        type: "short",
        prompt: `f(x) = (${top})/(${bottom}). احسب lim (x → ${side(s)}) f(x).`,
        answer: frac(a, d),
        steps: [
          `عند ${side(s)} نهاية الدالة الناطقة هي نهاية حاصل قسمة الحدين الأعليين درجة`,
          `lim (x → ${side(s)}) f(x) = lim (x → ${side(s)}) ${monomial(a, 2)}/${paren(monomial(d, 2))}`,
          `نبسط x² فنجد ${num(a)}/${paren(num(d))} = ${frac(a, d)}`,
        ],
      };
    },
  },
  {
    id: "rational-degree-cases",
    skill: "rational_limits_infinity",
    difficulty: 2,
    generate: rng => {
      const kind = rng.pick(["lower", "equal", "higher"] as const);
      if (kind === "lower") {
        const [a, b, d, e, g] = draw(
          rng,
          r => [r.nonZero(-6, 6), r.int(-6, 6), r.nonZero(-4, 4), r.int(-5, 5), r.nonZero(-9, 9)] as const,
          ([a, , d]) => distinct("0", frac(a, d), "1")
        );
        return {
          type: "mcq",
          prompt: `f(x) = (${linear(a, b)})/(${poly([[2, d], [1, e], [0, g]])}). احسب lim (x → +∞) f(x).`,
          answer: "0",
          distractors: [
            { option: frac(a, d), misconception: "degree_comparison_error" },
            { option: "1", misconception: "inf_over_inf_one" },
            { option: "+∞", misconception: "degree_comparison_error" },
          ],
          steps: [
            `حالة عدم تعيين ∞/∞، ننتقل إلى الحدين الأعليين درجة`,
            `lim (x → +∞) f(x) = lim (x → +∞) ${monomial(a, 1)}/${paren(monomial(d, 2))} = lim (x → +∞) ${frac(a, d)}/x`,
            `درجة البسط أصغر من درجة المقام، إذن النهاية 0`,
          ],
        };
      }
      if (kind === "equal") {
        const [a, b, c, d, e, g] = draw(
          rng,
          r =>
            [r.nonZero(-6, 6), r.int(-5, 5), r.nonZero(-9, 9), r.nonZero(-5, 5), r.int(-5, 5), r.nonZero(-9, 9)] as const,
          ([a, , c, d, , g]) => distinct(frac(a, d), frac(c, g), "1", "0")
        );
        return {
          type: "mcq",
          prompt: `f(x) = (${poly([[2, a], [1, b], [0, c]])})/(${poly([[2, d], [1, e], [0, g]])}). احسب lim (x → +∞) f(x).`,
          answer: frac(a, d),
          distractors: [
            { option: frac(c, g), misconception: "constant_term_instead_of_leading" },
            { option: "1", misconception: "inf_over_inf_one" },
            { option: "0", misconception: "degree_comparison_error" },
          ],
          steps: [
            `حالة عدم تعيين ∞/∞، ننتقل إلى الحدين الأعليين درجة`,
            `lim (x → +∞) f(x) = lim (x → +∞) ${monomial(a, 2)}/${paren(monomial(d, 2))}`,
            `للبسط والمقام نفس الدرجة، إذن النهاية ${num(a)}/${paren(num(d))} = ${frac(a, d)}`,
          ],
        };
      }
      const [a, b, c, d, e] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.int(-5, 5), r.int(-9, 9), r.nonZero(-4, 4), r.nonZero(-6, 6)] as const,
        ([a, , , d]) => distinct(frac(a, d), "1")
      );
      const s = rng.chance(0.5) ? 1 : -1;
      const result = Math.sign(a / d) * s;
      return {
        type: "mcq",
        prompt: `f(x) = (${poly([[2, a], [1, b], [0, c]])})/(${linear(d, e)}). احسب lim (x → ${side(s)}) f(x).`,
        answer: inf(result),
        distractors: [
          { option: inf(-result), misconception: "leading_sign_error" },
          { option: frac(a, d), misconception: "degree_comparison_error" },
          { option: "1", misconception: "inf_over_inf_one" },
        ],
        steps: [
          `حالة عدم تعيين ∞/∞، ننتقل إلى الحدين الأعليين درجة`,
          `lim (x → ${side(s)}) f(x) = lim (x → ${side(s)}) ${monomial(a, 2)}/${paren(monomial(d, 1))} = lim (x → ${side(s)}) ${mul(1, frac(a, d).includes("/") ? `(${frac(a, d)})x` : monomial(a / d, 1))}`,
          `درجة البسط أكبر من درجة المقام، والإشارة تُحدَّد بإشارة ${frac(a, d)} وبـ x → ${side(s)}: النهاية ${inf(result)}`,
        ],
      };
    },
  },

  // --- النهاية عند عدد حقيقي ---------------------------------------------
  {
    id: "finite-substitution",
    skill: "limits_at_point",
    difficulty: 1,
    generate: rng => {
      const [a, b, c, k] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.int(-8, 8), r.nonZero(-6, 6), r.nonZero(-4, 4)] as const,
        ([, , c, k]) => k + c !== 0
      );
      const top = a * k + b;
      const bottom = k + c;
      return {
        type: "short",
        prompt: `f(x) = (${linear(a, b)})/(${linear(1, c)}). احسب lim (x → ${num(k)}) f(x).`,
        answer: frac(top, bottom),
        steps: [
          `المقام لا ينعدم عند ${num(k)} (${join(paren(num(k)), num(c))} = ${num(bottom)} ≠ 0)، إذن f مستمرة عند ${num(k)}`,
          `lim (x → ${num(k)}) f(x) = f(${num(k)}) = (${join(times(a, paren(num(k))), num(b))})/${paren(num(bottom))}`,
          `= ${num(top)}/${paren(num(bottom))} = ${frac(top, bottom)}`,
        ],
      };
    },
  },
  {
    id: "forbidden-value-side",
    skill: "limits_at_point",
    difficulty: 2,
    generate: rng => {
      const [a, b, k] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.int(-8, 8), r.nonZero(-5, 5)] as const,
        ([a, b, k]) => a * k + b !== 0
      );
      const right = rng.chance(0.5);
      const N = a * k + b;
      const result = Math.sign(N) * (right ? 1 : -1);
      const K = num(k);
      return {
        type: "mcq",
        prompt: `f(x) = (${linear(a, b)})/(${linear(1, -k)}) معرفة على ℝ − {${K}}. احسب lim f(x) عندما x يؤول إلى ${K} بقيم ${right ? "أكبر" : "أصغر"} من ${K} (x → ${K} و x ${right ? ">" : "<"} ${K}).`,
        answer: inf(result),
        distractors: [
          { option: inf(-result), misconception: "denominator_sign_forgotten" },
          { option: "0", misconception: "number_over_zero_zero" },
          { option: num(N), misconception: "ignore_zero_denominator" },
        ],
        steps: [
          `نهاية البسط: ${join(times(a, paren(K)), num(b))} = ${num(N)}`,
          `نهاية المقام: ${linear(1, -k)} → 0، ولما x ${right ? ">" : "<"} ${K} يكون ${linear(1, -k)} ${right ? "> 0 أي المقام يؤول إلى 0⁺" : "< 0 أي المقام يؤول إلى 0⁻"}`,
          `${num(N)} على ${right ? "0⁺" : "0⁻"}: حسب قاعدة الإشارات النهاية ${inf(result)}`,
        ],
      };
    },
  },
  {
    id: "forbidden-value-square",
    skill: "limits_at_point",
    difficulty: 3,
    generate: rng => {
      const [a, b, k] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.int(-8, 8), r.nonZero(-5, 5)] as const,
        ([a, b, k]) => a * k + b !== 0
      );
      const N = a * k + b;
      const K = num(k);
      const denominator = `(${linear(1, -k)})²`;
      return {
        type: "mcq",
        prompt: `f(x) = (${linear(a, b)})/${denominator}. احسب lim (x → ${K}) f(x).`,
        answer: inf(N),
        distractors: [
          { option: inf(-N), misconception: "denominator_sign_forgotten" },
          { option: "0", misconception: "number_over_zero_zero" },
          { option: NO_LIMIT, misconception: "square_sign_change" },
        ],
        steps: [
          `نهاية البسط عند ${K}: ${join(times(a, paren(K)), num(b))} = ${num(N)}`,
          `المقام ${denominator} مربع فهو موجب دائماً، ويؤول إلى 0⁺ من الجهتين`,
          `${num(N)} على 0⁺: lim (x → ${K}) f(x) = ${inf(N)}`,
        ],
      };
    },
  },

  // --- إزالة حالات عدم التعيين -----------------------------------------
  {
    id: "factor-difference-squares",
    skill: "indeterminate_forms",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-6, 6);
      const c = rng.int(1, 3);
      const top = poly([[2, c], [0, -c * a * a]]);
      return {
        type: "short",
        prompt: `احسب lim (x → ${num(a)}) (${top})/(${linear(1, -a)}).`,
        answer: num(2 * a * c),
        steps: [
          `بالتعويض نجد البسط والمقام معدومين: حالة عدم تعيين 0/0`,
          `نحلل البسط: ${top} = ${mul(c, `(${linear(1, -a)})(${linear(1, a)})`)}`,
          `نبسط على ${linear(1, -a)}: من أجل x ≠ ${num(a)}، f(x) = ${mul(c, c === 1 ? linear(1, a) : `(${linear(1, a)})`)}`,
          `lim (x → ${num(a)}) f(x) = ${times(c, paren(join(num(a), num(a))))} = ${num(2 * a * c)}`,
        ],
      };
    },
  },
  {
    id: "factor-quadratic",
    skill: "indeterminate_forms",
    difficulty: 3,
    generate: rng => {
      const [r0, s] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.nonZero(-5, 5)] as const,
        ([r0, s]) => distinct(num(r0 - s), num(r0 + s), num(s - r0), "0")
      );
      const top = poly([[2, 1], [1, -(r0 + s)], [0, r0 * s]]);
      return {
        type: "mcq",
        prompt: `احسب lim (x → ${num(r0)}) (${top})/(${linear(1, -r0)}).`,
        answer: num(r0 - s),
        distractors: [
          { option: "0", misconception: "zero_over_zero_value" },
          { option: num(r0 + s), misconception: "factorisation_error" },
          { option: num(s - r0), misconception: "factorisation_error" },
        ],
        steps: [
          `عند x = ${num(r0)} ينعدم البسط والمقام: حالة عدم تعيين 0/0`,
          `${num(r0)} جذر للبسط، إذن ${top} = (${linear(1, -r0)})(${linear(1, -s)})`,
          `من أجل x ≠ ${num(r0)}: f(x) = ${linear(1, -s)}`,
          `lim (x → ${num(r0)}) f(x) = ${join(num(r0), num(-s))} = ${num(r0 - s)}`,
        ],
      };
    },
  },
  {
    id: "sqrt-conjugate-point",
    skill: "indeterminate_forms",
    difficulty: 3,
    generate: rng => {
      const [m, a] = draw(
        rng,
        r => [r.int(1, 4), r.nonZero(-5, 5)] as const,
        ([m, a]) => m * m - a !== 0
      );
      const b = m * m - a;
      const inner = linear(1, b);
      return {
        type: "short",
        prompt: `احسب lim (x → ${num(a)}) (√(${inner}) − ${m})/(${linear(1, -a)}).`,
        answer: frac(1, 2 * m),
        steps: [
          `بالتعويض: √(${num(a + b)}) − ${m} = 0 والمقام معدوم: حالة عدم تعيين 0/0`,
          `نضرب البسط والمقام في المرافق √(${inner}) + ${m}: البسط يصبح ${join(inner, num(-m * m))} = ${linear(1, -a)}`,
          `من أجل x ≠ ${num(a)}: f(x) = 1/(√(${inner}) + ${m})`,
          `lim (x → ${num(a)}) f(x) = 1/(${m} + ${m}) = ${frac(1, 2 * m)}`,
        ],
      };
    },
  },
  {
    id: "conjugate-infinity",
    skill: "indeterminate_forms",
    difficulty: 3,
    generate: rng => {
      const a = draw(rng, r => r.nonZero(-9, 9), value => value !== 1 && value !== 2);
      const inner = poly([[2, 1], [1, a]]);
      return {
        type: "mcq",
        prompt: `احسب lim (x → +∞) (√(${inner}) − x).`,
        answer: frac(a, 2),
        distractors: [
          { option: "0", misconception: "inf_minus_inf_zero" },
          { option: num(a), misconception: "conjugate_error" },
          { option: "1", misconception: "inf_over_inf_one" },
        ],
        steps: [
          `حالة عدم تعيين ∞ − ∞، نضرب ونقسم على المرافق √(${inner}) + x`,
          `f(x) = (${inner} − x²)/(√(${inner}) + x) = ${monomial(a, 1)}/(√(${inner}) + x)`,
          `نخرج x عاملاً مشتركاً في المقام: f(x) = ${num(a)}/(√(${join("1", frac(a, 1) + "/x")}) + 1)`,
          `lim (x → +∞) f(x) = ${num(a)}/(1 + 1) = ${frac(a, 2)}`,
        ],
      };
    },
  },

  // --- المستقيمات المقاربة -----------------------------------------------
  {
    id: "horizontal-asymptote",
    skill: "asymptotes",
    difficulty: 1,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.nonZero(-6, 6), r.nonZero(-6, 6), r.nonZero(-4, 4), r.nonZero(-6, 6)] as const,
        ([a, b, c, d]) => a * d - b * c !== 0 && distinct(frac(a, c), frac(-d, c), frac(b, d), frac(c, a))
      );
      return {
        type: "mcq",
        prompt: `f(x) = (${linear(a, b)})/(${linear(c, d)}). ما معادلة المستقيم المقارب الموازي لمحور الفواصل لمنحنى f بجوار +∞؟`,
        answer: `y = ${frac(a, c)}`,
        distractors: [
          { option: `x = ${frac(-d, c)}`, misconception: "asymptote_type_confusion" },
          { option: `y = ${frac(b, d)}`, misconception: "constant_term_instead_of_leading" },
          { option: `y = ${frac(c, a)}`, misconception: "asymptote_ratio_inverted" },
        ],
        steps: [
          `lim (x → +∞) f(x) = lim (x → +∞) ${monomial(a, 1)}/${paren(monomial(c, 1))} = ${frac(a, c)}`,
          `النهاية عدد حقيقي، إذن المستقيم ذو المعادلة y = ${frac(a, c)} مقارب أفقي بجوار +∞`,
        ],
      };
    },
  },
  {
    id: "vertical-asymptote",
    skill: "asymptotes",
    difficulty: 2,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.nonZero(-6, 6), r.nonZero(-6, 6), r.nonZero(-4, 4), r.nonZero(-6, 6)] as const,
        ([a, b, c, d]) => a * d - b * c !== 0 && distinct(frac(-d, c), frac(a, c), frac(d, c), frac(-b, a))
      );
      const V = frac(-d, c);
      return {
        type: "mcq",
        prompt: `f(x) = (${linear(a, b)})/(${linear(c, d)}). ما معادلة المستقيم المقارب العمودي (الموازي لمحور التراتيب) لمنحنى f؟`,
        answer: `x = ${V}`,
        distractors: [
          { option: `y = ${frac(a, c)}`, misconception: "asymptote_type_confusion" },
          { option: `x = ${frac(d, c)}`, misconception: "asymptote_sign_error" },
          { option: `x = ${frac(-b, a)}`, misconception: "asymptote_numerator_root" },
        ],
        steps: [
          `المقام ينعدم عندما ${linear(c, d)} = 0 أي x = ${V}، والبسط لا ينعدم عند هذه القيمة`,
          `إذن lim f(x) = ±∞ عندما x يؤول إلى ${V} (حسب الجهة)`,
          `المستقيم ذو المعادلة x = ${V} مقارب عمودي لمنحنى f`,
        ],
      };
    },
  },
  {
    id: "horizontal-asymptote-short",
    skill: "asymptotes",
    difficulty: 2,
    generate: rng => {
      const [a, b, c, d, e] = draw(
        rng,
        r => [r.nonZero(-6, 6), r.int(-5, 5), r.int(-9, 9), r.int(1, 5), r.int(1, 9)] as const,
        ([a, , , d]) => a !== d
      );
      const s = rng.chance(0.5) ? 1 : -1;
      return {
        type: "short",
        prompt: `f(x) = (${poly([[2, a], [1, b], [0, c]])})/(${poly([[2, d], [0, e]])}). اكتب معادلة المستقيم المقارب الأفقي لمنحنى f بجوار ${side(s)} (على الشكل y = k).`,
        answer: `y = ${frac(a, d)}`,
        accept: [frac(a, d)],
        steps: [
          `lim (x → ${side(s)}) f(x) = lim (x → ${side(s)}) ${monomial(a, 2)}/${monomial(d, 2)} = ${frac(a, d)}`,
          `النهاية منتهية، إذن المستقيم y = ${frac(a, d)} مقارب أفقي لمنحنى f بجوار ${side(s)}`,
        ],
      };
    },
  },
  {
    id: "oblique-asymptote",
    skill: "asymptotes",
    difficulty: 3,
    generate: rng => {
      const [a, b, c, k] = draw(
        rng,
        r => [r.nonZero(-4, 4), r.nonZero(-7, 7), r.nonZero(-6, 6), r.nonZero(-5, 5)] as const,
        ([a, b, , k]) => distinct(`y = ${linear(a, b)}`, `x = ${num(k)}`, `y = ${linear(a, 0)}`, `y = ${num(b)}`)
      );
      const fraction = `${num(c)}/(${linear(1, -k)})`;
      return {
        type: "mcq",
        prompt: `f(x) = ${join(linear(a, b), fraction)} معرفة على ℝ − {${num(k)}}. ما معادلة المستقيم المقارب المائل لمنحنى f بجوار +∞؟`,
        answer: `y = ${linear(a, b)}`,
        distractors: [
          { option: `x = ${num(k)}`, misconception: "asymptote_type_confusion" },
          { option: `y = ${linear(a, 0)}`, misconception: "oblique_constant_forgotten" },
          { option: `y = ${num(b)}`, misconception: "asymptote_type_confusion" },
        ],
        steps: [
          `f(x) − (${linear(a, b)}) = ${fraction}`,
          `lim (x → +∞) ${fraction} = 0 لأن المقام يؤول إلى +∞`,
          `إذن المستقيم ذو المعادلة y = ${linear(a, b)} مقارب مائل لمنحنى f بجوار +∞`,
        ],
      };
    },
  },

  // --- الاستمرارية ومبرهنة القيم المتوسطة ------------------------------
  {
    id: "continuity-parameter",
    skill: "continuity_ivt",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-4, 4);
      const b = rng.int(-6, 6);
      const k = rng.nonZero(-3, 3);
      const value = a * k + b;
      const m = value - k * k;
      const K = num(k);
      return {
        type: "short",
        prompt: `نعتبر الدالة f المعرفة على ℝ بـ: f(x) = ${linear(a, b)} إذا كان x ≤ ${K}، و f(x) = x² + m إذا كان x > ${K}، حيث m عدد حقيقي. عيّن قيمة m حتى تكون f مستمرة عند ${K}.`,
        answer: num(m),
        steps: [
          `f(${K}) = lim (x → ${K}, x < ${K}) f(x) = ${join(times(a, paren(K)), num(b))} = ${num(value)}`,
          `lim (x → ${K}, x > ${K}) f(x) = ${paren(K)}² + m = ${join(num(k * k), "m")}`,
          `f مستمرة عند ${K} ⟺ ${join(num(k * k), "m")} = ${num(value)}`,
          `إذن m = ${join(num(value), num(-k * k))} = ${num(m)}`,
        ],
      };
    },
  },
  {
    id: "ivt-interval",
    skill: "continuity_ivt",
    difficulty: 2,
    generate: rng => {
      const a = rng.int(1, 4);
      const m = rng.int(-2, 2);
      const f = (x: number, b: number) => x ** 3 + a * x + b;
      const low = -((m + 1) ** 3 + a * (m + 1)) + 1;
      const high = -(m ** 3 + a * m) - 1;
      const b = rng.int(low, high);
      const others = rng.shuffle([-2, -1, 1, 2]).slice(0, 3);
      const interval = (lo: number) => `[${num(lo)} ; ${num(lo + 1)}]`;
      const fx = poly([[3, 1], [1, a], [0, b]]);
      return {
        type: "mcq",
        prompt: `f(x) = ${fx}. الدالة f مستمرة ومتزايدة تماماً على ℝ، والمعادلة f(x) = 0 تقبل حلاً وحيداً α. إلى أي مجال ينتمي α؟`,
        answer: interval(m),
        distractors: others.map(shift => ({ option: interval(m + shift), misconception: "ivt_no_sign_change" })),
        steps: [
          `f(${num(m)}) = ${num(f(m, b))} و f(${num(m + 1)}) = ${num(f(m + 1, b))}`,
          `f(${num(m)}) × f(${num(m + 1)}) < 0: الإشارة تتغير بين ${num(m)} و ${num(m + 1)}`,
          `f مستمرة ومتزايدة تماماً، فحسب مبرهنة القيم المتوسطة α ∈ ]${num(m)} ; ${num(m + 1)}[`,
        ],
      };
    },
  },
  {
    id: "ivt-conclusion",
    skill: "continuity_ivt",
    difficulty: 3,
    generate: rng => {
      const variant = rng.pick(["between", "outside", "discontinuous"] as const);
      const p = rng.int(-3, 1);
      const q = p + rng.int(2, 4);
      const increasing = rng.chance(0.5);
      // low < high are the values at the ends of the interval.
      const [low, high] = draw(
        rng,
        r => [r.int(-6, 6), r.int(-6, 9)] as const,
        ([low, high]) => high - low >= 2
      );
      const k =
        variant === "outside"
          ? rng.chance(0.5)
            ? low - rng.int(1, 4)
            : high + rng.int(1, 4)
          : rng.int(low + 1, high - 1);
      const fp = increasing ? low : high;
      const fq = increasing ? high : low;
      const I = `[${num(p)} ; ${num(q)}]`;
      const unique = `المعادلة f(x) = ${num(k)} تقبل حلاً وحيداً في ${I}`;
      const none = `المعادلة f(x) = ${num(k)} لا تقبل أي حل في ${I}`;
      const atLeast = `المعادلة تقبل حلاً على الأقل لكن لا يمكن الجزم بأنه وحيد`;
      const two = `المعادلة f(x) = ${num(k)} تقبل حلين على الأقل في ${I}`;
      const unknown = `لا يمكن الجزم بوجود حل لأن f غير مستمرة على ${I}`;
      const c = rng.int(p + 1, q - 1);
      const hypothesis =
        variant === "discontinuous"
          ? `f دالة ${increasing ? "متزايدة" : "متناقصة"} تماماً على ${I} وغير مستمرة عند ${num(c)}`
          : `f دالة مستمرة و${increasing ? "متزايدة" : "متناقصة"} تماماً على ${I}`;
      const prompt = `${hypothesis}، حيث f(${num(p)}) = ${num(fp)} و f(${num(q)}) = ${num(fq)}. ماذا يمكن القول عن المعادلة f(x) = ${num(k)}؟`;
      const between = `${num(k)} محصور بين ${num(low)} و ${num(high)}`;
      if (variant === "between") {
        return {
          type: "mcq",
          prompt,
          answer: unique,
          distractors: [
            { option: none, misconception: "ivt_no_sign_change" },
            { option: atLeast, misconception: "ivt_uniqueness_confusion" },
            { option: two, misconception: "ivt_uniqueness_confusion" },
          ],
          steps: [
            `f مستمرة على ${I} و ${between}`,
            `حسب مبرهنة القيم المتوسطة المعادلة f(x) = ${num(k)} تقبل حلاً على الأقل في ${I}`,
            `وبما أن f رتيبة تماماً فهذا الحل وحيد`,
          ],
        };
      }
      if (variant === "outside") {
        return {
          type: "mcq",
          prompt,
          answer: none,
          distractors: [
            { option: unique, misconception: "ivt_no_sign_change" },
            { option: atLeast, misconception: "ivt_no_sign_change" },
            { option: two, misconception: "ivt_no_sign_change" },
          ],
          steps: [
            `f مستمرة و${increasing ? "متزايدة" : "متناقصة"} تماماً، فصورة ${I} هي المجال [${num(low)} ; ${num(high)}]`,
            `العدد ${num(k)} لا ينتمي إلى [${num(low)} ; ${num(high)}]`,
            `إذن المعادلة f(x) = ${num(k)} لا تقبل أي حل في ${I}`,
          ],
        };
      }
      return {
        type: "mcq",
        prompt,
        answer: unknown,
        distractors: [
          { option: unique, misconception: "ivt_no_continuity" },
          { option: atLeast, misconception: "ivt_no_continuity" },
          { option: none, misconception: "ivt_no_continuity" },
        ],
        steps: [
          `صحيح أن ${between}، لكن مبرهنة القيم المتوسطة تشترط استمرار f على كامل المجال`,
          `f غير مستمرة عند ${num(c)}، فقد "تقفز" قيمها فوق ${num(k)}`,
          `إذن لا يمكن الجزم بوجود حل دون معلومات إضافية`,
        ],
      };
    },
  },
];

export const limitsLesson: Lesson = {
  key: "math-limits",
  curriculum: "dz",
  subject: "math",
  title: "النهايات والاستمرارية",
  levels: ["bac"],
  skills: [
    {
      key: "poly_limits_infinity",
      name: "نهاية كثير حدود عند ±∞",
      prerequisites: [],
      explanation:
        "عند +∞ أو −∞ نهاية كثير الحدود هي نهاية حده الأعلى درجة، لأن باقي الحدود تصبح مهملة أمامه. نحدد الإشارة بإشارة المعامل وبزوجية الأس: (−∞)² = +∞ بينما (−∞)³ = −∞. لا نكتب أبداً ∞ − ∞ = 0 فهي حالة عدم تعيين.",
      example: {
        problem: "احسب lim (x → −∞) (2x³ − 5x² + 1).",
        steps: [
          "نهاية كثير الحدود عند −∞ هي نهاية حده الأعلى درجة 2x³",
          "lim (x → −∞) x³ = −∞ لأن الأس فردي",
          "2 × (−∞) = −∞",
        ],
        answer: "lim (x → −∞) f(x) = −∞",
      },
      dialogue: {
        opening: "أنت تعرف كيف تحسب صورة عدد بدالة كثير حدود. لنأخذ f(x) = x² − 10x ونعطي x قيمة كبيرة جداً، ولنرَ أي الحدين هو «الأقوى».",
        steps: [
          {
            ask: "من أجل x = 1000، كم يساوي الحد x²؟",
            answer: "1000000",
            accept: ["10^6"],
            hint: "اضرب العدد ألف في نفسه.",
          },
          {
            ask: "ومن أجل x = 1000 أيضاً، كم يساوي الحد 10x؟",
            answer: "10000",
            accept: ["10^4"],
            hint: "اضرب ألفاً في عشرة.",
          },
          {
            ask: "قارن: الحد x² أكبر من الحد 10x بكم مرة؟",
            answer: "100",
            hint: "اقسم النتيجة الأولى على الثانية.",
            then: "وكلما كبر x كبر هذا الفرق أكثر: الحد الأعلى درجة يسحق الحدود الأخرى.",
          },
          {
            ask: "إذن في g(x) = −3x³ + 7x² − 2، ما هو الحد الذي يتحكم في g(x) لما x كبير جداً؟",
            answer: "−3x³",
            hint: "ابحث عن الحد الذي فيه أكبر أس لـ x، ولا تنس معامله وإشارته.",
          },
          {
            ask: "لما x كبير جداً وموجب، ما إشارة −3x³: موجبة أم سالبة؟",
            answer: "سالبة",
            accept: ["سالب"],
            hint: "x³ موجب هنا، ثم انظر إلى إشارة المعامل الذي أمامه.",
            then: "إذن lim (x → +∞) g(x) = −∞.",
          },
        ],
        rule: "عند +∞ أو −∞ نهاية كثير الحدود هي نهاية حده الأعلى درجة: lim (aₙxⁿ + … + a₀) = lim aₙxⁿ، وإشارتها تُحدَّد بإشارة aₙ وبزوجية n عند −∞.",
      },
    },
    {
      key: "rational_limits_infinity",
      name: "نهاية دالة ناطقة عند ±∞",
      prerequisites: ["poly_limits_infinity"],
      explanation:
        "عند ±∞ نهاية الدالة الناطقة هي نهاية حاصل قسمة الحد الأعلى درجة في البسط على الحد الأعلى درجة في المقام. إذا كانت درجة البسط أصغر فالنهاية 0، وإذا تساوت الدرجتان فالنهاية حاصل قسمة المعاملين، وإذا كانت أكبر فالنهاية ±∞. الشكل ∞/∞ حالة عدم تعيين وليس 1.",
      example: {
        problem: "احسب lim (x → +∞) (3x² − x + 2)/(2x² + 5).",
        steps: ["حالة عدم تعيين ∞/∞", "ننتقل إلى الحدين الأعليين درجة: 3x²/2x²", "نبسط: 3/2"],
        answer: "3/2",
      },
      dialogue: {
        opening: "اكتشفت أن نهاية كثير حدود عند ±∞ هي نهاية حده الأعلى درجة. الدالة الناطقة هي كثير حدود على كثير حدود: لنستعمل ما تعرفه مع f(x) = (3x² − x + 2)/(2x² + 5).",
        steps: [
          {
            ask: "لما x → +∞، ما هو الحد الذي يتحكم في البسط 3x² − x + 2؟",
            answer: "3x²",
            hint: "تذكّر: الحد ذو أكبر أس هو الأقوى.",
          },
          {
            ask: "وما هو الحد الذي يتحكم في المقام 2x² + 5؟",
            answer: "2x²",
            hint: "نفس الفكرة، لكن في المقام هذه المرة.",
          },
          {
            ask: "بسّط حاصل قسمة الحدين اللذين وجدتهما. ماذا يبقى؟",
            answer: "3/2",
            accept: ["1.5"],
            hint: "x² في الأعلى و x² في الأسفل يختزلان، فلا يبقى إلا المعاملان.",
            then: "إذن lim (x → +∞) f(x) = 3/2، وليست ∞/∞ = 1.",
          },
          {
            ask: "الآن g(x) = (5x + 1)/(x² + 4). بسّط حاصل قسمة الحدين الأعليين درجة في البسط والمقام.",
            answer: "5/x",
            hint: "الحدان هما 5x و x²: اختزل x مرة واحدة.",
          },
          {
            ask: "إلى أي عدد يؤول هذا الكسر لما x → +∞؟",
            answer: "0",
            hint: "عدد ثابت مقسوم على عدد يكبر بلا حدود: جرّب x = 1000 ثم x = 1000000.",
            then: "لما درجة البسط أصغر من درجة المقام تكون النهاية 0.",
          },
        ],
        rule: "عند ±∞ نهاية الدالة الناطقة هي نهاية حاصل قسمة حدها الأعلى درجة في البسط على حدها الأعلى درجة في المقام: درجة البسط أصغر ← 0، متساويتان ← حاصل قسمة المعاملين، أكبر ← ±∞.",
      },
    },
    {
      key: "limits_at_point",
      name: "النهاية عند عدد حقيقي",
      prerequisites: ["rational_limits_infinity"],
      explanation:
        "إذا كانت الدالة معرفة ومستمرة عند a فإن نهايتها عند a هي f(a). أما عند قيمة ممنوعة يؤول فيها المقام إلى 0 والبسط إلى عدد غير معدوم، فالنهاية ±∞ وتُحدَّد الإشارة بدراسة إشارة المقام على يمين a وعلى يساره (0⁺ أو 0⁻).",
      example: {
        problem: "احسب lim f(x) عندما x → 2 و x > 2، حيث f(x) = (x + 1)/(x − 2).",
        steps: ["نهاية البسط: 2 + 1 = 3", "لما x > 2 يكون x − 2 > 0، فالمقام يؤول إلى 0⁺", "3 على 0⁺ يعطي +∞"],
        answer: "+∞",
      },
      dialogue: {
        opening: "خذ الدالة f(x) = 3/(x − 2). العدد 2 ممنوع لأن المقام ينعدم فيه. لن نعوّض بـ 2، بل سنقترب منه شيئاً فشيئاً ونراقب ما يحدث.",
        steps: [
          {
            ask: "احسب f(2,1).",
            answer: "30",
            hint: "المقام هو 2,1 − 2، ثم اقسم 3 عليه.",
          },
          {
            ask: "اقترب أكثر: احسب f(2,001).",
            answer: "3000",
            hint: "احسب المقام أولاً: صار صغيراً جداً وموجباً، والقسمة على عدد صغير تعطي عدداً كبيراً.",
            then: "كلما اقترب x من 2 من اليمين كبرت القيم بلا حدود: النهاية +∞.",
          },
          {
            ask: "الآن من اليسار: احسب f(1,999).",
            answer: "−3000",
            accept: ["-3000"],
            hint: "احسب 1,999 − 2 أولاً، وانتبه لإشارته.",
          },
          {
            ask: "لما x < 2، ما إشارة المقام x − 2: موجبة أم سالبة؟",
            answer: "سالبة",
            accept: ["سالب"],
            hint: "عدد أصغر من 2 ننقص منه 2.",
            then: "المقام يؤول إلى 0⁻، فـ 3/0⁻ = −∞.",
          },
          {
            ask: "أما عند x → 5، فالمقام لا ينعدم. كم تساوي النهاية؟",
            answer: "1",
            hint: "الدالة معرفة عند هذا العدد: عوّض مباشرة.",
          },
        ],
        rule: "عند عدد a تكون فيه f معرفة ومستمرة: lim f(x) = f(a). وعند قيمة ممنوعة يؤول فيها المقام إلى 0 والبسط إلى عدد k ≠ 0، النهاية ±∞ وإشارتها حسب إشارة k وإشارة المقام (0⁺ أو 0⁻).",
      },
    },
    {
      key: "indeterminate_forms",
      name: "إزالة حالات عدم التعيين",
      prerequisites: ["limits_at_point"],
      explanation:
        "حالات عدم التعيين هي ∞ − ∞ و 0 × ∞ و ∞/∞ و 0/0، ولا يمكن الحكم عليها مباشرة. نزيلها بالتحليل واختزال العامل المشترك (مثل x² − a² = (x − a)(x + a))، أو بالضرب في المرافق عندما تظهر جذور تربيعية، أو بإخراج الحد الأعلى درجة عاملاً مشتركاً.",
      example: {
        problem: "احسب lim (x → 3) (x² − 9)/(x − 3).",
        steps: ["بالتعويض نجد 0/0", "x² − 9 = (x − 3)(x + 3)", "من أجل x ≠ 3: f(x) = x + 3", "النهاية 3 + 3 = 6"],
        answer: "6",
      },
      dialogue: {
        opening: "تعرف أن تحسب نهاية بالتعويض المباشر. لنجرّب ذلك مع f(x) = (x² − 9)/(x − 3) لما x → 3.",
        steps: [
          {
            ask: "عوّض x بـ 3 في البسط x² − 9. ماذا تجد؟",
            answer: "0",
            hint: "احسب مربع 3 ثم اطرح 9.",
          },
          {
            ask: "وعوّض x بـ 3 في المقام x − 3. ماذا تجد؟",
            answer: "0",
            hint: "اطرح 3 من 3.",
            then: "وجدنا 0/0: حالة عدم تعيين. التعويض المباشر لا يكفي، يجب أن نغيّر شكل العبارة.",
          },
          {
            ask: "x² − 9 متطابقة شهيرة: x² − 9 = (x − 3)(…). ما العامل الناقص؟",
            answer: "x + 3",
            hint: "فرق مربعين: a² − b² = (a − b)(a + b).",
          },
          {
            ask: "بعد اختزال العامل المشترك (x − 3)، يصبح f(x) = x + 3 من أجل x ≠ 3. كم تساوي النهاية لما x → 3؟",
            answer: "6",
            hint: "العبارة الجديدة لا مقام فيها: عوّض الآن.",
          },
        ],
        rule: "∞ − ∞ و 0 × ∞ و ∞/∞ و 0/0 حالات عدم تعيين: لا نحكم عليها مباشرة، بل نغيّر شكل العبارة (تحليل واختزال، ضرب في المرافق، إخراج الحد الأعلى درجة عاملاً) ثم نحسب النهاية.",
      },
    },
    {
      key: "asymptotes",
      name: "المستقيمات المقاربة",
      prerequisites: ["rational_limits_infinity", "limits_at_point"],
      explanation:
        "إذا كانت lim (x → ±∞) f(x) = b فالمستقيم y = b مقارب أفقي، وإذا كانت نهاية f عند a تساوي ±∞ فالمستقيم x = a مقارب عمودي. وإذا كانت lim [f(x) − (ax + b)] = 0 عند ±∞ فالمستقيم y = ax + b مقارب مائل.",
      example: {
        problem: "f(x) = (2x + 1)/(x − 3). عيّن المستقيمين المقاربين.",
        steps: [
          "lim (x → ±∞) f(x) = 2/1 = 2 إذن y = 2 مقارب أفقي",
          "المقام ينعدم عند x = 3 والبسط يساوي 7 ≠ 0، فالنهاية ±∞",
          "إذن x = 3 مقارب عمودي",
        ],
        answer: "y = 2 و x = 3",
      },
      dialogue: {
        opening: "أنت تحسب الآن النهايات عند ±∞ وعند القيم الممنوعة. لنرَ ما تعنيه هندسياً مع f(x) = (2x + 1)/(x − 3).",
        steps: [
          {
            ask: "احسب lim (x → +∞) f(x).",
            answer: "2",
            hint: "حاصل قسمة الحدين الأعليين درجة في البسط والمقام.",
            then: "لما x يكبر يقترب ترتيب كل نقطة من (C) من هذا العدد: المنحنى يلتصق بمستقيم أفقي.",
          },
          {
            ask: "ما معادلة هذا المستقيم الأفقي؟",
            answer: "y = 2",
            accept: ["y=2"],
            hint: "مستقيم أفقي: كل نقاطه لها نفس الترتيب، وهو النهاية التي وجدتها.",
          },
          {
            ask: "ما هي القيمة الممنوعة التي تعدم المقام x − 3؟",
            answer: "3",
            hint: "حل المعادلة: المقام = 0.",
            then: "عندها البسط لا ينعدم، فالنهاية لانهائية: المنحنى يصعد أو ينزل بمحاذاة مستقيم عمودي.",
          },
          {
            ask: "ما معادلة هذا المستقيم العمودي؟",
            answer: "x = 3",
            accept: ["x=3"],
            hint: "مستقيم عمودي: كل نقاطه لها نفس الفاصلة.",
          },
          {
            ask: "وإذا كانت g(x) = 2x + 1 + 1/x، فإن g(x) − (2x + 1) = 1/x يؤول إلى 0 عند +∞. ما معادلة المستقيم المائل الذي يقترب منه منحنى g؟",
            answer: "y = 2x + 1",
            accept: ["y=2x+1"],
            hint: "هو الجزء الذي بقي بعد أن «اختفى» الحد الذي يؤول إلى 0.",
          },
        ],
        rule: "lim (x → ±∞) f(x) = b ← y = b مقارب أفقي. lim (x → a) f(x) = ±∞ ← x = a مقارب عمودي. lim (x → ±∞) [f(x) − (ax + b)] = 0 ← y = ax + b مقارب مائل.",
      },
    },
    {
      key: "continuity_ivt",
      name: "الاستمرارية ومبرهنة القيم المتوسطة",
      prerequisites: ["limits_at_point"],
      explanation:
        "تكون f مستمرة عند a إذا كانت lim (x → a) f(x) = f(a). مبرهنة القيم المتوسطة: إذا كانت f مستمرة على [a ; b] وكان k محصوراً بين f(a) و f(b) فإن المعادلة f(x) = k تقبل حلاً على الأقل في [a ; b]، وإذا كانت f زيادة على ذلك رتيبة تماماً فالحل وحيد.",
      example: {
        problem: "بيّن أن المعادلة x³ + x − 1 = 0 تقبل حلاً وحيداً α في ]0 ; 1[.",
        steps: [
          "f(x) = x³ + x − 1 مستمرة ومتزايدة تماماً على ℝ (f′(x) = 3x² + 1 > 0)",
          "f(0) = −1 < 0 و f(1) = 1 > 0",
          "حسب مبرهنة القيم المتوسطة يوجد حل وحيد α ∈ ]0 ; 1[",
        ],
        answer: "α ∈ ]0 ; 1[",
      },
      dialogue: {
        opening: "تخيّل متسلقاً ينطلق من نقطة تحت مستوى البحر ويصل إلى نقطة فوقه، دون أن يقفز. لا بد أنه مرّ بمستوى البحر! لنطبّق هذه الفكرة على f(x) = x³ + x − 1 في المجال [0 ; 1].",
        steps: [
          {
            ask: "احسب f(0).",
            answer: "−1",
            accept: ["-1"],
            hint: "عوّض x بالعدد صفر: يبقى الحد الثابت فقط.",
          },
          {
            ask: "احسب f(1).",
            answer: "1",
            hint: "عوّض x بالعدد الذي يلي الصفر، وتذكّر أن قوى هذا العدد كلها تساويه.",
            then: "f مستمرة (كثير حدود) وانتقلت من قيمة سالبة إلى قيمة موجبة: لا بد أنها مرت بالصفر. هذه مبرهنة القيم المتوسطة.",
          },
          {
            ask: "لنعرف كم مرة تمر بالصفر. احسب f′(x).",
            answer: "3x² + 1",
            hint: "اشتق كل حد على حدة.",
            then: "3x² + 1 > 0 دائماً، فالدالة f متزايدة تماماً: لا تعود إلى الوراء.",
          },
          {
            ask: "إذن كم حلاً للمعادلة f(x) = 0 في المجال ]0 ; 1[؟",
            answer: "1",
            hint: "دالة مستمرة ومتزايدة تماماً تمر من قيمة سالبة إلى قيمة موجبة: كم مرة يمكنها أن تقطع محور الفواصل؟",
          },
        ],
        rule: "مبرهنة القيم المتوسطة: إذا كانت f مستمرة على [a ; b] وكان k محصوراً بين f(a) و f(b) فإن f(x) = k تقبل حلاً على الأقل في [a ; b]؛ وإذا كانت f زيادة على ذلك رتيبة تماماً فالحل وحيد.",
      },
    },
  ],
  misconceptions: {
    constant_term_instead_of_leading: "أخذ الحد الثابت بدل الحد الأعلى درجة عند حساب النهاية عند ±∞",
    leading_sign_error: "خطأ في الإشارة: إهمال إشارة المعامل أو زوجية الأس عند −∞",
    inf_minus_inf_zero: "اعتبار ∞ − ∞ = 0",
    inf_over_inf_one: "اعتبار ∞/∞ = 1",
    degree_comparison_error: "خطأ في مقارنة درجتي البسط والمقام في الدالة الناطقة",
    ignore_zero_denominator: "إهمال المقام المنعدم والاكتفاء بقيمة البسط",
    number_over_zero_zero: "اعتبار أن عدداً غير معدوم مقسوماً على 0 يساوي 0",
    denominator_sign_forgotten: "نسيان دراسة إشارة المقام (0⁺ أو 0⁻) عند القيمة الممنوعة",
    square_sign_change: "اعتبار أن المقام (x − a)² يغيّر إشارته عند a",
    zero_over_zero_value: "اعتبار 0/0 عدداً معيناً دون إزالة عدم التعيين",
    factorisation_error: "خطأ في التحليل أو في إشارة العامل المتبقي بعد الاختزال",
    conjugate_error: "خطأ في الضرب بالمرافق أو في التبسيط بعده",
    asymptote_type_confusion: "الخلط بين المستقيم المقارب الأفقي والعمودي (أو المائل)",
    asymptote_ratio_inverted: "قلب حاصل قسمة المعاملين عند تعيين المقارب الأفقي",
    asymptote_sign_error: "خطأ في الإشارة عند حل المعادلة «المقام = 0»",
    asymptote_numerator_root: "أخذ القيمة التي تعدم البسط بدل التي تعدم المقام",
    oblique_constant_forgotten: "نسيان الحد الثابت في معادلة المقارب المائل",
    ivt_no_sign_change: "تطبيق مبرهنة القيم المتوسطة دون التحقق من أن k محصور بين f(a) و f(b)",
    ivt_uniqueness_confusion: "الخلط بين وجود الحل ووحدانيته (إهمال الرتابة التامة)",
    ivt_no_continuity: "تطبيق مبرهنة القيم المتوسطة على دالة غير مستمرة",
  },
  remedies: {
    constant_term_instead_of_leading:
      "عند ±∞ الحد الذي يتحكم في النهاية هو الحد الأعلى درجة، أما الحد الثابت فيصبح مهملاً.",
    leading_sign_error:
      "حدّد الإشارة بخطوتين: إشارة xⁿ عند −∞ (موجبة إذا كان n زوجياً وسالبة إذا كان فردياً)، ثم اضرب في إشارة المعامل.",
    inf_minus_inf_zero:
      "∞ − ∞ حالة عدم تعيين وليست 0: أخرج الحد الأعلى درجة عاملاً مشتركاً أو استعمل المرافق.",
    inf_over_inf_one:
      "∞/∞ حالة عدم تعيين وليست 1: قارن الحدين الأعليين درجة في البسط والمقام.",
    degree_comparison_error:
      "قارن الدرجتين: درجة البسط أصغر ← النهاية 0، متساويتان ← حاصل قسمة المعاملين، أكبر ← ±∞.",
    ignore_zero_denominator:
      "لا يمكن إهمال مقام يؤول إلى 0: عدد غير معدوم على 0 يعطي ±∞.",
    number_over_zero_zero:
      "القسمة على عدد يقترب من 0 تعطي قيماً كبيرة جداً بالقيمة المطلقة: k/0⁺ = ±∞ وليست 0.",
    denominator_sign_forgotten:
      "ادرس إشارة المقام على يمين القيمة الممنوعة وعلى يسارها (0⁺ أو 0⁻) ثم طبّق قاعدة الإشارات.",
    square_sign_change:
      "المربع (x − a)² موجب دائماً، فهو يؤول إلى 0⁺ من الجهتين والنهاية لها نفس الإشارة من اليمين ومن اليسار.",
    zero_over_zero_value:
      "0/0 حالة عدم تعيين: حلّل البسط والمقام واختزل العامل المشترك قبل التعويض.",
    factorisation_error:
      "إذا انعدم البسط عند a فهو يقبل القسمة على (x − a)؛ تحقق من التحليل بالنشر قبل الاختزال.",
    conjugate_error:
      "المرافق يحوّل (√A − B)(√A + B) إلى A − B²؛ لا تنس أن المقام يصبح √A + B وأن نهايته تضاعف القيمة.",
    asymptote_type_confusion:
      "النهاية عند ±∞ تعطي مقارباً أفقياً y = b، والنهاية اللانهائية عند عدد a تعطي مقارباً عمودياً x = a.",
    asymptote_ratio_inverted:
      "المقارب الأفقي هو معامل الحد الأعلى درجة في البسط مقسوماً على معامل الحد الأعلى درجة في المقام، بهذا الترتيب.",
    asymptote_sign_error:
      "حل المعادلة cx + d = 0 يعطي x = −d/c: انتبه لتغير الإشارة عند النقل.",
    asymptote_numerator_root:
      "المقارب العمودي يكون عند القيمة التي تعدم المقام (وليس البسط).",
    oblique_constant_forgotten:
      "المقارب المائل هو y = ax + b كاملاً: تحقق أن f(x) − (ax + b) يؤول إلى 0.",
    ivt_no_sign_change:
      "قبل تطبيق مبرهنة القيم المتوسطة تحقق أن k محصور بين f(a) و f(b) (أو أن f(a) × f(b) < 0 عندما k = 0).",
    ivt_uniqueness_confusion:
      "الاستمرارية مع k بين f(a) و f(b) تضمن وجود حل على الأقل، والرتابة التامة هي التي تضمن وحدانيته.",
    ivt_no_continuity:
      "مبرهنة القيم المتوسطة تشترط استمرار f على كامل المجال؛ بدونه قد تقفز الدالة فوق القيمة k.",
  },
  bank: [],
  generators: limitsGenerators,
  problems: limitsProblems,
};
