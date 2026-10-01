// BAC lesson "الأعداد المركبة" — skill graph, misconceptions and parametric
// generators (pattern: ./derivativesGenerators.ts).
//
// Grading note: the expression grader treats `i` as an ordinary variable
// (it does not know i² = −1), so every typed key is written in simplified
// algebraic form a + bi — then any reordering the student types is still
// recognised as equal, and a wrong complex number never is.
import type { Lesson } from "../curriculum";
import { frac, gcd, join, mul, num, paren, poly, sup, type Generator, type Rng } from "../generators/core";

/** Re-draws until `valid` holds — keeps generators free of degenerate cases. */
function draw<T>(rng: Rng, make: (rng: Rng) => T, valid: (value: T) => boolean): T {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = make(rng);
    if (valid(value)) return value;
  }
  throw new Error("generator could not find valid parameters");
}

const distinct = (...values: string[]) => new Set(values).size === values.length;

/** Imaginary part (p/q)·i: "3i", "−i", "(2/5)i", "−(3/4)i", or "0". */
function imText(p: number, q = 1): string {
  if (p === 0) return "0";
  if (q < 0) {
    p = -p;
    q = -q;
  }
  if (p % q === 0) return mul(p / q, "i");
  const sign = p < 0 ? "−" : "";
  return `${sign}(${frac(Math.abs(p), q)})i`;
}

/** Complex number (a + bi)/q in algebraic form: "3 − 2i", "−i", "4", "1/5 + (2/5)i". */
function cx(a: number, b: number, q = 1): string {
  return join(frac(a, q), imText(b, q));
}

/** √n simplified: 5, √13, 2√7. */
function sqrtText(n: number): string {
  let k = 1;
  for (let d = 2; d * d <= n; d += 1) if (n % (d * d) === 0) k = d;
  const m = n / (k * k);
  if (m === 1) return num(k);
  return k === 1 ? `√${m}` : `${k}√${m}`;
}

/** Angle (p/q)·π: "π/4", "−3π/4", "π". */
function piText(p: number, q: number): string {
  const g = gcd(p, q);
  p /= g;
  q /= g;
  if (p === 0) return "0";
  const sign = p < 0 ? "−" : "";
  const coefficient = Math.abs(p) === 1 ? "" : String(Math.abs(p));
  return `${sign}${coefficient}π${q === 1 ? "" : `/${q}`}`;
}

/** Exponential form r·e^(iθ) with θ = (p/q)π: "2e^(iπ/3)", "√2·e^(−3iπ/4)". */
function expForm(modulus: string, p: number, q: number): string {
  const g = gcd(p, q);
  p /= g;
  q /= g;
  const sign = p < 0 ? "−" : "";
  const coefficient = Math.abs(p) === 1 ? "" : String(Math.abs(p));
  const exponent = `${sign}${coefficient}iπ${q === 1 ? "" : `/${q}`}`;
  const prefix = modulus === "1" ? "" : modulus.includes("√") ? `${modulus}·` : modulus;
  return `${prefix}e^(${exponent})`;
}

/** Real number c·√root (root 1 or 3): "2", "−√3", "3√3". */
function surd(c: number, root: 1 | 3): string {
  if (root === 1) return num(c);
  if (c === 1) return "√3";
  if (c === -1) return "−√3";
  return `${num(c)}√3`;
}

/** Imaginary c·√root·i: "2i", "i√3", "−2i√3". */
function surdI(c: number, root: 1 | 3): string {
  if (root === 1) return mul(c, "i");
  return mul(c, "i√3");
}

/**
 * A "remarkable" complex number k·(cos θ + i sin θ)·(scale) whose reference
 * angle is π/6, π/4 or π/3, in quadrant (sx, sy). Returns its algebraic
 * text, modulus text, modulus², and θ = (p/q)·π in ]−π ; π].
 */
function remarkable(rng: Rng) {
  const q = rng.pick([6, 4, 3] as const);
  const k = rng.int(1, 3);
  const sx = rng.pick([1, -1]);
  const sy = rng.pick([1, -1]);
  const re = q === 6 ? surd(sx * k, 3) : surd(sx * k, 1);
  const im = q === 3 ? surdI(sy * k, 3) : surdI(sy * k, 1);
  const modulus = q === 4 ? (k === 1 ? "√2" : `${k}√2`) : num(2 * k);
  const modulusSquared = q === 4 ? 2 * k * k : 4 * k * k;
  // Reference angle 1/q of π; place it in the right quadrant.
  const p = sx > 0 ? (sy > 0 ? 1 : -1) : sy > 0 ? q - 1 : -(q - 1);
  const cosText = q === 6 ? "√3/2" : q === 4 ? "√2/2" : "1/2";
  const sinText = q === 6 ? "1/2" : q === 4 ? "√2/2" : "√3/2";
  return { q, k, sx, sy, z: join(re, im), modulus, modulusSquared, p, cosText, sinText };
}

const complexGenerators: Generator[] = [
  // ---------------------------------------------------------------- algebraic
  {
    id: "sum-difference",
    skill: "algebraic_form",
    difficulty: 1,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.nonZero(-7, 7), r.nonZero(-7, 7), r.nonZero(-7, 7), r.nonZero(-7, 7)] as const,
        ([a, b, c, d]) => a !== c || b !== d
      );
      const minus = rng.chance(0.5);
      const re = minus ? a - c : a + c;
      const im = minus ? b - d : b + d;
      return {
        type: "short",
        prompt: `z₁ = ${cx(a, b)} و z₂ = ${cx(c, d)}. اكتب العدد z₁ ${minus ? "−" : "+"} z₂ على الشكل الجبري.`,
        answer: cx(re, im),
        steps: [
          `نجمع (أو نطرح) الأجزاء الحقيقية معاً والأجزاء التخيلية معاً`,
          `الجزء الحقيقي: ${num(a)} ${minus ? "−" : "+"} ${paren(num(c))} = ${num(re)}`,
          `الجزء التخيلي: ${num(b)} ${minus ? "−" : "+"} ${paren(num(d))} = ${num(im)}`,
          `z₁ ${minus ? "−" : "+"} z₂ = ${cx(re, im)}`,
        ],
      };
    },
  },
  {
    id: "powers-of-i",
    skill: "algebraic_form",
    difficulty: 1,
    generate: rng => {
      const n = rng.int(3, 31);
      const values = ["1", "i", "−1", "−i"];
      const answer = values[n % 4];
      const naive = n % 2 === 0 ? "1" : "i"; // what i² = 1 would give
      return {
        type: "mcq",
        prompt: `ما قيمة i${sup(n)}؟`,
        answer,
        distractors: values
          .filter(value => value !== answer)
          .map(value => ({
            option: value,
            misconception: value === naive ? "i_squared_positive" : "i_power_cycle",
          })),
        steps: [
          "i² = −1 و i⁴ = 1، إذن قوى i دورية ودورها 4",
          n % 4 === 0
            ? `${n} = 4 × ${n / 4}، إذن i${sup(n)} = (i⁴)${sup(n / 4)} = 1`
            : `${n} = 4 × ${Math.floor(n / 4)} + ${n % 4}، إذن i${sup(n)} = (i⁴)${sup(Math.floor(n / 4))} × i${n % 4 === 1 ? "" : sup(n % 4)}`,
          `i${sup(n)} = ${answer}`,
        ],
      };
    },
  },
  {
    id: "product-mcq",
    skill: "algebraic_form",
    difficulty: 2,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.nonZero(-5, 5), r.nonZero(-5, 5), r.nonZero(-5, 5)] as const,
        ([a, b, c, d]) =>
          distinct(
            cx(a * c - b * d, a * d + b * c),
            cx(a * c + b * d, a * d + b * c),
            cx(a * c, b * d),
            num(a * c - b * d)
          )
      );
      const answer = cx(a * c - b * d, a * d + b * c);
      return {
        type: "mcq",
        prompt: `ما الشكل الجبري للعدد z = ${paren(cx(a, b))}${paren(cx(c, d))}؟`,
        answer,
        distractors: [
          { option: cx(a * c + b * d, a * d + b * c), misconception: "i_squared_positive" },
          { option: cx(a * c, b * d), misconception: "product_termwise" },
          { option: num(a * c - b * d), misconception: "product_termwise" },
        ],
        steps: [
          "ننشر كل حد في كل حد ثم نعوّض i² بـ −1",
          `z = ${join(num(a * c), mul(a * d, "i"), mul(b * c, "i"), mul(b * d, "i²"))}`,
          `z = ${join(num(a * c), mul(a * d + b * c, "i"), num(-b * d))}`,
          `z = ${answer}`,
        ],
      };
    },
  },
  {
    id: "square-short",
    skill: "algebraic_form",
    difficulty: 2,
    generate: rng => {
      const [a, b] = draw(
        rng,
        r => [r.nonZero(-5, 5), r.nonZero(-5, 5)] as const,
        ([a, b]) => Math.abs(a) !== Math.abs(b)
      );
      const answer = cx(a * a - b * b, 2 * a * b);
      return {
        type: "short",
        prompt: `اكتب العدد z = ${paren(cx(a, b))}² على الشكل الجبري.`,
        answer,
        steps: [
          `نستعمل (x + y)² = x² + 2xy + y² مع (${mul(b, "i")})² = ${num(b * b)}i² = ${num(-b * b)}`,
          `z = ${join(num(a * a), mul(2 * a * b, "i"), num(-b * b))}`,
          `z = ${answer}`,
        ],
      };
    },
  },
  // -------------------------------------------------------- conjugate/modulus
  {
    id: "conjugate-mcq",
    skill: "conjugate_modulus",
    difficulty: 1,
    generate: rng => {
      const [a, b] = draw(
        rng,
        r => [r.nonZero(-9, 9), r.nonZero(-9, 9)] as const,
        ([a, b]) => distinct(cx(a, -b), cx(-a, b), cx(-a, -b), cx(b, a))
      );
      return {
        type: "mcq",
        prompt: `z = ${cx(a, b)}. ما هو مرافقه z̄؟`,
        answer: cx(a, -b),
        distractors: [
          { option: cx(-a, b), misconception: "conjugate_real_sign" },
          { option: cx(-a, -b), misconception: "conjugate_opposite" },
          { option: cx(b, a), misconception: "conjugate_swap" },
        ],
        steps: [
          "مرافق z = a + bi هو z̄ = a − bi: الجزء الحقيقي لا يتغير ونغيّر إشارة الجزء التخيلي فقط",
          `z̄ = ${cx(a, -b)}`,
        ],
      };
    },
  },
  {
    id: "modulus-mcq",
    skill: "conjugate_modulus",
    difficulty: 1,
    generate: rng => {
      const [x, y, r] = rng.pick([
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
      ] as const);
      const scale = rng.chance(0.5);
      const [p, q] = scale ? [x, y] : [y, x];
      const a = p * rng.pick([1, -1]);
      const b = q * rng.pick([1, -1]);
      return {
        type: "mcq",
        prompt: `ما طويلة العدد المركب z = ${cx(a, b)}؟`,
        answer: num(r),
        distractors: [
          { option: num(Math.abs(a) + Math.abs(b)), misconception: "modulus_sum" },
          { option: num(a * a + b * b), misconception: "modulus_no_sqrt" },
          { option: sqrtText(Math.abs(a * a - b * b)), misconception: "modulus_difference" },
        ],
        steps: [
          "|a + bi| = √(a² + b²)",
          `|z| = √(${paren(num(a))}² + ${paren(num(b))}²) = √(${a * a} + ${b * b})`,
          `|z| = √${a * a + b * b} = ${r}`,
        ],
      };
    },
  },
  {
    id: "modulus-short",
    skill: "conjugate_modulus",
    difficulty: 2,
    generate: rng => {
      const a = rng.nonZero(-6, 6);
      const b = rng.nonZero(-6, 6);
      const n = a * a + b * b;
      return {
        type: "short",
        prompt: `احسب طويلة العدد المركب z = ${cx(a, b)}.`,
        answer: sqrtText(n),
        steps: [
          `|z| = √(${paren(num(a))}² + ${paren(num(b))}²) = √(${a * a} + ${b * b})`,
          `|z| = √${n}${sqrtText(n) === `√${n}` ? "" : ` = ${sqrtText(n)}`}`,
        ],
      };
    },
  },
  {
    id: "modulus-product",
    skill: "conjugate_modulus",
    difficulty: 3,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.nonZero(-4, 4), r.nonZero(-4, 4), r.nonZero(-4, 4), r.nonZero(-4, 4)] as const,
        ([a, b, c, d]) => a * c - b * d !== 0 && a * d + b * c !== 0
      );
      const n1 = a * a + b * b;
      const n2 = c * c + d * d;
      const answer = sqrtText(n1 * n2);
      return {
        type: "short",
        prompt: `z = ${paren(cx(a, b))}${paren(cx(c, d))}. احسب |z| دون نشر الجداء.`,
        answer,
        steps: [
          "طويلة الجداء هي جداء الطويلتين: |z₁·z₂| = |z₁|·|z₂|",
          `|${cx(a, b)}| = √${n1} و |${cx(c, d)}| = √${n2}`,
          `|z| = √${n1} × √${n2} = √${n1 * n2}${answer === `√${n1 * n2}` ? "" : ` = ${answer}`}`,
        ],
      };
    },
  },
  {
    id: "conjugate-equation",
    skill: "conjugate_modulus",
    difficulty: 3,
    generate: rng => {
      const [x, y, k] = draw(
        rng,
        r => [r.nonZero(-4, 4), r.nonZero(-4, 4), r.pick([2, 3, -2, -3])] as const,
        () => true
      );
      const A = (1 + k) * x;
      const B = (1 - k) * y;
      return {
        type: "short",
        prompt: `عيّن العدد المركب z الذي يحقق: z ${k < 0 ? "−" : "+"} ${Math.abs(k)}z̄ = ${cx(A, B)} (أعط z على الشكل الجبري).`,
        answer: cx(x, y),
        steps: [
          `نضع z = x + iy مع x و y حقيقيين، إذن z̄ = x − iy`,
          `z ${k < 0 ? "−" : "+"} ${Math.abs(k)}z̄ = ${join(mul(1 + k, "x"), mul(1 - k, "iy"))}`,
          `بالمطابقة: ${mul(1 + k, "x")} = ${num(A)} و ${mul(1 - k, "y")} = ${num(B)}`,
          `x = ${num(x)} و y = ${num(y)}، إذن z = ${cx(x, y)}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------------ quotient
  {
    id: "quotient-mcq",
    skill: "quotient",
    difficulty: 2,
    generate: rng => {
      const pick = draw(
        rng,
        r => [r.nonZero(-3, 3), r.nonZero(-3, 3), r.nonZero(-3, 3), r.nonZero(-3, 3)] as const,
        ([p, q, c, d]) => {
          const a1 = p * c - q * d;
          const b1 = p * d + q * c;
          const n = c * c + d * d;
          return (
            a1 !== 0 &&
            b1 !== 0 &&
            distinct(
              cx(p, q),
              join(frac(a1, c), imText(b1, d)),
              cx(p * n, q * n),
              cx(a1 * c - b1 * d, a1 * d + b1 * c, n)
            )
          );
        }
      );
      const [p, q, c, d] = pick;
      const a1 = p * c - q * d;
      const b1 = p * d + q * c;
      const n = c * c + d * d;
      return {
        type: "mcq",
        prompt: `ما الشكل الجبري للعدد z = ${paren(cx(a1, b1))}/${paren(cx(c, d))}؟`,
        answer: cx(p, q),
        distractors: [
          { option: join(frac(a1, c), imText(b1, d)), misconception: "quotient_partwise" },
          { option: cx(p * n, q * n), misconception: "quotient_denominator" },
          { option: cx(a1 * c - b1 * d, a1 * d + b1 * c, n), misconception: "quotient_conjugate" },
        ],
        steps: [
          `نضرب البسط والمقام في مرافق المقام ${cx(c, -d)}`,
          `المقام: ${paren(cx(c, d))}${paren(cx(c, -d))} = ${c * c} + ${d * d} = ${n}`,
          `البسط: ${paren(cx(a1, b1))}${paren(cx(c, -d))} = ${cx(p * n, q * n)}`,
          `z = ${paren(cx(p * n, q * n))}/${n} = ${cx(p, q)}`,
        ],
      };
    },
  },
  {
    id: "quotient-short",
    skill: "quotient",
    difficulty: 3,
    generate: rng => {
      const [p, q, c, d] = draw(
        rng,
        r => [r.int(-4, 4), r.int(-4, 4), r.nonZero(-3, 3), r.nonZero(-3, 3)] as const,
        ([p, q, c, d]) => (p !== 0 || q !== 0) && p * c - q * d !== 0 && p * d + q * c !== 0
      );
      const a1 = p * c - q * d;
      const b1 = p * d + q * c;
      const n = c * c + d * d;
      return {
        type: "short",
        prompt: `اكتب على الشكل الجبري العدد z = ${paren(cx(a1, b1))}/${paren(cx(c, d))}.`,
        answer: cx(p, q),
        steps: [
          `نضرب البسط والمقام في ${cx(c, -d)} (مرافق المقام)`,
          `المقام يصبح ${c * c} + ${d * d} = ${n}`,
          `البسط يصبح ${cx(p * n, q * n)}`,
          `z = ${paren(cx(p * n, q * n))}/${n} = ${cx(p, q)}`,
        ],
      };
    },
  },
  {
    id: "inverse-short",
    skill: "quotient",
    difficulty: 2,
    generate: rng => {
      const [a, b] = draw(
        rng,
        r => [r.nonZero(-4, 4), r.nonZero(-4, 4)] as const,
        () => true
      );
      const n = a * a + b * b;
      const answer = cx(a, -b, n);
      return {
        type: "short",
        prompt: `اكتب مقلوب العدد z = ${cx(a, b)} أي 1/z على الشكل الجبري.`,
        answer,
        steps: [
          `1/z = z̄/(z·z̄) = ${paren(cx(a, -b))}/(${a * a} + ${b * b})`,
          `1/z = ${paren(cx(a, -b))}/${n}`,
          `1/z = ${answer}`,
        ],
      };
    },
  },
  // ----------------------------------------------------------------- equations
  {
    id: "discriminant",
    skill: "quadratic_equation",
    difficulty: 1,
    generate: rng => {
      const [a, b, c] = draw(
        rng,
        r => [r.int(1, 3), r.int(-6, 6), r.int(1, 12)] as const,
        ([a, b, c]) => b * b - 4 * a * c < 0
      );
      const delta = b * b - 4 * a * c;
      return {
        type: "short",
        prompt: `احسب مميز المعادلة ${poly([[2, a], [1, b], [0, c]], "z")} = 0.`,
        answer: num(delta),
        steps: [
          `Δ = b² − 4ac مع a = ${a} و b = ${num(b)} و c = ${c}`,
          `Δ = ${paren(num(b))}² − 4 × ${a} × ${c} = ${b * b} − ${4 * a * c} = ${num(delta)}`,
          "Δ < 0، إذن للمعادلة في ℂ حلان مركبان مترافقان",
        ],
      };
    },
  },
  {
    id: "quadratic-roots-mcq",
    skill: "quadratic_equation",
    difficulty: 2,
    generate: rng => {
      const p = rng.nonZero(-4, 4);
      const q = rng.int(1, 4);
      const b = -2 * p;
      const c = p * p + q * q;
      const delta = -4 * q * q;
      const pair = (x: string, y: string) => `{${x} ; ${y}}`;
      return {
        type: "mcq",
        prompt: `ما مجموعة حلول المعادلة ${poly([[2, 1], [1, b], [0, c]], "z")} = 0 في ℂ؟`,
        answer: pair(cx(p, -q), cx(p, q)),
        distractors: [
          { option: pair(num(p - q), num(p + q)), misconception: "negative_delta_real" },
          { option: pair(cx(-p, -q), cx(-p, q)), misconception: "root_formula_error" },
          { option: pair(cx(2 * p, -2 * q), cx(2 * p, 2 * q)), misconception: "root_formula_error" },
        ],
        steps: [
          `Δ = ${paren(num(b))}² − 4 × ${c} = ${num(delta)} = (${mul(2 * q, "i")})²`,
          `z₁ = (${num(-b)} − ${mul(2 * q, "i")})/2 = ${cx(p, -q)}`,
          `z₂ = (${num(-b)} + ${mul(2 * q, "i")})/2 = ${cx(p, q)}`,
        ],
      };
    },
  },
  {
    id: "quadratic-root-short",
    skill: "quadratic_equation",
    difficulty: 3,
    generate: rng => {
      const a = rng.int(1, 3);
      const p = rng.int(-3, 3);
      const q = rng.int(1, 3);
      const b = -2 * a * p;
      const c = a * (p * p + q * q);
      const delta = b * b - 4 * a * c;
      const root = 2 * a * q;
      return {
        type: "short",
        prompt: `حل في ℂ المعادلة ${poly([[2, a], [1, b], [0, c]], "z")} = 0، ثم أعط الحل الذي جزؤه التخيلي موجب.`,
        answer: cx(p, q),
        steps: [
          `Δ = ${paren(num(b))}² − 4 × ${a} × ${c} = ${num(delta)} < 0`,
          `Δ = (${mul(root, "i")})²، إذن الحلان: z = (${num(-b)} ± ${mul(root, "i")})/${2 * a}`,
          `الحل ذو الجزء التخيلي الموجب: z = ${cx(p, q)} (والآخر مرافقه ${cx(p, -q)})`,
        ],
      };
    },
  },
  // --------------------------------------------------- trigonometric/exponential
  {
    id: "argument-mcq",
    skill: "trig_exponential_form",
    difficulty: 2,
    generate: rng => {
      const z = remarkable(rng);
      const { q, p } = z;
      const reflectY = p > 0 ? q - p : -(q + p); // π − θ (same sign)
      const swapQ = q === 6 ? 3 : 6; // swapping cos/sin turns π/6 into π/3 and back
      let third: { option: string; misconception: string };
      if (q === 4) {
        const opposite = p > 0 ? p - q : p + q; // θ ± π
        third = { option: piText(opposite, q), misconception: "argument_quadrant" };
      } else {
        const pp = z.sx > 0 ? (z.sy > 0 ? 1 : -1) : z.sy > 0 ? swapQ - 1 : -(swapQ - 1);
        third = { option: piText(pp, swapQ), misconception: "argument_cos_sin_swap" };
      }
      return {
        type: "mcq",
        prompt: `ما عمدة العدد المركب z = ${z.z} (في المجال ]−π ; π])؟`,
        answer: piText(p, q),
        distractors: [
          { option: piText(-p, q), misconception: "argument_quadrant" },
          { option: piText(reflectY, q), misconception: "argument_quadrant" },
          third,
        ],
        steps: [
          `|z| = ${z.modulus}`,
          `cos θ = ${z.sx < 0 ? "−" : ""}${z.cosText} و sin θ = ${z.sy < 0 ? "−" : ""}${z.sinText}`,
          `إشارتا cos θ و sin θ تحددان الربع، إذن arg(z) = ${piText(p, q)}`,
        ],
      };
    },
  },
  {
    id: "exponential-form-mcq",
    skill: "trig_exponential_form",
    difficulty: 3,
    generate: rng => {
      const z = remarkable(rng);
      const { q, p } = z;
      const opposite = p > 0 ? p - q : p + q;
      return {
        type: "mcq",
        prompt: `ما الشكل الأسي للعدد المركب z = ${z.z}؟`,
        answer: expForm(z.modulus, p, q),
        distractors: [
          { option: expForm(num(z.modulusSquared), p, q), misconception: "modulus_no_sqrt" },
          { option: expForm(z.modulus, -p, q), misconception: "argument_quadrant" },
          { option: expForm(z.modulus, opposite, q), misconception: "argument_quadrant" },
        ],
        steps: [
          `|z| = √(a² + b²) = √${z.modulusSquared} = ${z.modulus}`,
          `cos θ = ${z.sx < 0 ? "−" : ""}${z.cosText} و sin θ = ${z.sy < 0 ? "−" : ""}${z.sinText}، إذن θ = ${piText(p, q)}`,
          `z = |z|·e^(iθ) = ${expForm(z.modulus, p, q)}`,
        ],
      };
    },
  },
  {
    id: "trig-to-algebraic",
    skill: "trig_exponential_form",
    difficulty: 2,
    generate: rng => {
      const z = remarkable(rng);
      const r = z.modulus;
      const angle = piText(z.p, z.q);
      const prefix = r === "1" ? "" : r;
      return {
        type: "short",
        prompt: `اكتب على الشكل الجبري العدد z = ${prefix}(cos(${angle}) + i sin(${angle})).`,
        answer: z.z,
        steps: [
          `cos(${angle}) = ${z.sx < 0 ? "−" : ""}${z.cosText} و sin(${angle}) = ${z.sy < 0 ? "−" : ""}${z.sinText}`,
          `z = ${r} × (${z.sx < 0 ? "−" : ""}${z.cosText}) + i × ${r} × (${z.sy < 0 ? "−" : ""}${z.sinText})`,
          `z = ${z.z}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------------ geometry
  {
    id: "vector-affix",
    skill: "geometry",
    difficulty: 1,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.int(-6, 6), r.int(-6, 6), r.int(-6, 6), r.int(-6, 6)] as const,
        ([a, b, c, d]) => (a !== c || b !== d) && (a !== 0 || b !== 0) && (c !== 0 || d !== 0)
      );
      return {
        type: "short",
        prompt: `في المستوي المركب، A و B نقطتان لاحقتاهما z_A = ${cx(a, b)} و z_B = ${cx(c, d)}. ما لاحقة الشعاع AB⃗؟`,
        answer: cx(c - a, d - b),
        steps: [
          "لاحقة الشعاع AB⃗ هي z_B − z_A (النهاية ناقص البداية)",
          `z_B − z_A = ${paren(cx(c, d))} − ${paren(cx(a, b))}`,
          `= ${cx(c - a, d - b)}`,
        ],
      };
    },
  },
  {
    id: "midpoint-mcq",
    skill: "geometry",
    difficulty: 1,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.int(-6, 6), r.int(-6, 6), r.int(-6, 6), r.int(-6, 6)] as const,
        ([a, b, c, d]) =>
          (a + c) % 2 === 0 &&
          (b + d) % 2 === 0 &&
          (a + c !== 0 || b + d !== 0) &&
          distinct(
            cx((a + c) / 2, (b + d) / 2),
            cx(a + c, b + d),
            cx((c - a) / 2, (d - b) / 2),
            cx(c - a, d - b)
          ) &&
          (a !== 0 || b !== 0) &&
          (c !== 0 || d !== 0)
      );
      return {
        type: "mcq",
        prompt: `z_A = ${cx(a, b)} و z_B = ${cx(c, d)}. ما لاحقة النقطة I منتصف القطعة [AB]؟`,
        answer: cx((a + c) / 2, (b + d) / 2),
        distractors: [
          { option: cx(a + c, b + d), misconception: "midpoint_no_half" },
          { option: cx((c - a) / 2, (d - b) / 2), misconception: "midpoint_difference" },
          { option: cx(c - a, d - b), misconception: "midpoint_difference" },
        ],
        steps: [
          "z_I = (z_A + z_B)/2",
          `z_A + z_B = ${cx(a + c, b + d)}`,
          `z_I = ${paren(cx(a + c, b + d))}/2 = ${cx((a + c) / 2, (b + d) / 2)}`,
        ],
      };
    },
  },
  {
    id: "distance-mcq",
    skill: "geometry",
    difficulty: 2,
    generate: rng => {
      const [a, b, c, d] = draw(
        rng,
        r => [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)] as const,
        ([a, b, c, d]) => {
          const dx = c - a;
          const dy = d - b;
          if (dx === 0 || dy === 0) return false;
          const values = [
            Math.sqrt(dx * dx + dy * dy),
            Math.abs(dx) + Math.abs(dy),
            dx * dx + dy * dy,
            Math.sqrt((a + c) ** 2 + (b + d) ** 2),
          ].map(v => v.toFixed(6));
          return new Set(values).size === 4 && (a !== 0 || b !== 0) && (c !== 0 || d !== 0);
        }
      );
      const dx = c - a;
      const dy = d - b;
      const n = dx * dx + dy * dy;
      return {
        type: "mcq",
        prompt: `A و B نقطتان من المستوي المركب لاحقتاهما z_A = ${cx(a, b)} و z_B = ${cx(c, d)}. ما المسافة AB؟`,
        answer: sqrtText(n),
        distractors: [
          { option: num(Math.abs(dx) + Math.abs(dy)), misconception: "modulus_sum" },
          { option: num(n), misconception: "modulus_no_sqrt" },
          { option: sqrtText((a + c) ** 2 + (b + d) ** 2), misconception: "distance_sum" },
        ],
        steps: [
          "AB = |z_B − z_A|",
          `z_B − z_A = ${cx(dx, dy)}`,
          `AB = √(${paren(num(dx))}² + ${paren(num(dy))}²) = √${n}${sqrtText(n) === `√${n}` ? "" : ` = ${sqrtText(n)}`}`,
        ],
      };
    },
  },
];

export const complexLesson: Lesson = {
  key: "math-complex",
  curriculum: "dz",
  subject: "math",
  title: "الأعداد المركبة",
  levels: ["bac"],
  skills: [
    {
      key: "algebraic_form",
      name: "الشكل الجبري والعمليات",
      prerequisites: [],
      explanation:
        "كل عدد مركب z يُكتب بشكل وحيد z = a + bi حيث a = Re(z) جزؤه الحقيقي و b = Im(z) جزؤه التخيلي، مع i² = −1. نجمع الأجزاء الحقيقية معاً والتخيلية معاً، ونضرب بالنشر حداً بحد ثم نعوّض i² بـ −1.",
      example: {
        problem: "اكتب z = (2 + 3i)(1 − i) على الشكل الجبري.",
        steps: ["z = 2 − 2i + 3i − 3i²", "i² = −1 إذن −3i² = 3", "z = 2 + 3 + i"],
        answer: "z = 5 + i",
      },
    },
    {
      key: "conjugate_modulus",
      name: "المرافق والطويلة",
      prerequisites: ["algebraic_form"],
      explanation:
        "مرافق z = a + bi هو z̄ = a − bi: نغيّر إشارة الجزء التخيلي فقط. طويلة z هي |z| = √(a² + b²) وهي تساوي √(z·z̄)، وطويلة الجداء هي جداء الطويلتين.",
      example: {
        problem: "z = 3 − 4i. عيّن z̄ ثم احسب |z|.",
        steps: ["z̄ = 3 + 4i", "|z| = √(3² + (−4)²) = √(9 + 16)", "|z| = √25"],
        answer: "z̄ = 3 + 4i و |z| = 5",
      },
    },
    {
      key: "quotient",
      name: "حاصل قسمة عددين مركبين",
      prerequisites: ["conjugate_modulus"],
      explanation:
        "لكتابة z₁/z₂ على الشكل الجبري نضرب البسط والمقام في مرافق المقام z̄₂، فيصبح المقام عدداً حقيقياً هو c² + d². لا يجوز قسمة الجزء الحقيقي على الجزء الحقيقي والتخيلي على التخيلي.",
      example: {
        problem: "اكتب z = (7 + i)/(1 − 2i) على الشكل الجبري.",
        steps: [
          "نضرب البسط والمقام في 1 + 2i",
          "المقام: (1 − 2i)(1 + 2i) = 1 + 4 = 5",
          "البسط: (7 + i)(1 + 2i) = 7 + 14i + i + 2i² = 5 + 15i",
          "z = (5 + 15i)/5",
        ],
        answer: "z = 1 + 3i",
      },
    },
    {
      key: "quadratic_equation",
      name: "حل معادلة من الدرجة الثانية في ℂ",
      prerequisites: ["algebraic_form"],
      explanation:
        "لحل az² + bz + c = 0 (بمعاملات حقيقية) نحسب المميز Δ = b² − 4ac. إذا كان Δ < 0 نكتب Δ = (i√(−Δ))² فيكون للمعادلة حلان مركبان مترافقان z = (−b ± i√(−Δ))/(2a).",
      example: {
        problem: "حل في ℂ المعادلة z² − 2z + 5 = 0.",
        steps: ["Δ = (−2)² − 4 × 5 = −16", "Δ = (4i)²", "z₁ = (2 − 4i)/2 و z₂ = (2 + 4i)/2"],
        answer: "z₁ = 1 − 2i و z₂ = 1 + 2i",
      },
    },
    {
      key: "trig_exponential_form",
      name: "العمدة والشكل المثلثي والأسي",
      prerequisites: ["conjugate_modulus"],
      explanation:
        "إذا كان z ≠ 0 و r = |z| فإن عمدته θ تحقق cos θ = a/r و sin θ = b/r، وإشارتا cos θ و sin θ تحددان الربع. عندئذ z = r(cos θ + i sin θ) = r·e^(iθ).",
      example: {
        problem: "اكتب z = 1 + i√3 على الشكل الأسي.",
        steps: ["|z| = √(1 + 3) = 2", "cos θ = 1/2 و sin θ = √3/2", "θ = π/3"],
        answer: "z = 2e^(iπ/3)",
      },
    },
    {
      key: "geometry",
      name: "التفسير الهندسي",
      prerequisites: ["conjugate_modulus"],
      explanation:
        "في المستوي المركب المنسوب إلى معلم متعامد ومتجانس، النقطة M(a ; b) لاحقتها z = a + bi. لاحقة الشعاع AB⃗ هي z_B − z_A، والمسافة AB = |z_B − z_A|، ولاحقة منتصف [AB] هي (z_A + z_B)/2.",
      example: {
        problem: "z_A = 1 + 2i و z_B = 4 − 2i. احسب المسافة AB.",
        steps: ["z_B − z_A = 3 − 4i", "AB = |3 − 4i| = √(9 + 16)"],
        answer: "AB = 5",
      },
    },
  ],
  misconceptions: {
    i_squared_positive: "اعتبار i² = 1 بدل i² = −1",
    i_power_cycle: "خطأ في دورية قوى i (باقي القسمة على 4)",
    product_termwise: "ضرب الجزأين الحقيقيين والتخيليين فقط: (a + bi)(c + di) = ac + bdi",
    conjugate_real_sign: "تغيير إشارة الجزء الحقيقي عند أخذ المرافق",
    conjugate_opposite: "الخلط بين المرافق z̄ ومعاكس العدد −z",
    conjugate_swap: "تبديل الجزء الحقيقي والجزء التخيلي عند أخذ المرافق",
    modulus_sum: "حساب الطويلة كمجموع |a| + |b|",
    modulus_no_sqrt: "نسيان الجذر التربيعي: |z| = a² + b²",
    modulus_difference: "حساب الطويلة بـ √(a² − b²) بدل √(a² + b²)",
    quotient_partwise: "قسمة الجزء الحقيقي على الحقيقي والتخيلي على التخيلي كلٌّ على حدة",
    quotient_denominator: "نسيان القسمة على c² + d² بعد الضرب في المرافق",
    quotient_conjugate: "الضرب في المقام نفسه بدل مرافقه",
    negative_delta_real: "معاملة √Δ كعدد حقيقي رغم أن Δ < 0",
    root_formula_error: "خطأ في دستور الحلين (إشارة −b أو القسمة على 2a)",
    argument_quadrant: "خطأ في ربع العمدة (إهمال إشارتي cos θ و sin θ)",
    argument_cos_sin_swap: "الخلط بين cos θ و sin θ عند تعيين العمدة",
    midpoint_no_half: "نسيان القسمة على 2 في لاحقة المنتصف",
    midpoint_difference: "استعمال الفرق z_B − z_A بدل المجموع في لاحقة المنتصف",
    distance_sum: "حساب |z_A + z_B| بدل |z_B − z_A| للمسافة",
  },
  remedies: {
    i_squared_positive: "تذكّر أن i² = −1 دائماً: كل i² تظهر بعد النشر تُعوّض بـ −1 فتغيّر الإشارة.",
    i_power_cycle: "قوى i تتكرر كل 4: i⁰ = 1، i¹ = i، i² = −1، i³ = −i؛ اقسم الأس على 4 واستعمل الباقي.",
    product_termwise: "انشر كما في الجبر: كل حد من القوس الأول يُضرب في كل حد من الثاني (أربعة جداءات) ثم عوّض i² بـ −1.",
    conjugate_real_sign: "المرافق لا يمس الجزء الحقيقي: z̄ = a − bi، نغيّر إشارة b فقط.",
    conjugate_opposite: "المعاكس −z يغيّر الإشارتين معاً، أما المرافق z̄ فيغيّر إشارة الجزء التخيلي فقط.",
    conjugate_swap: "الجزء الحقيقي يبقى في مكانه في المرافق: z̄ = a − bi وليس b + ai.",
    modulus_sum: "الطويلة مسافة (فيثاغورس): |a + bi| = √(a² + b²) وليست |a| + |b|.",
    modulus_no_sqrt: "a² + b² هو مربع الطويلة |z|²؛ لا تنسَ أخذ الجذر التربيعي.",
    modulus_difference: "في الطويلة نجمع المربعين دائماً: √(a² + b²)، فـ b² موجب مهما كانت إشارة b.",
    quotient_partwise: "لا نقسم الأجزاء منفصلة؛ نضرب البسط والمقام في مرافق المقام ليصبح المقام حقيقياً.",
    quotient_denominator: "بعد الضرب في المرافق يصبح المقام c² + d²؛ اقسم الجزأين عليه في الأخير.",
    quotient_conjugate: "نضرب في مرافق المقام (نغيّر إشارة جزئه التخيلي) لأن (c + di)(c − di) = c² + d² عدد حقيقي.",
    negative_delta_real: "إذا كان Δ < 0 فإن جذريه التربيعيين تخيليان: Δ = (i√(−Δ))²، فالحلان مركبان مترافقان.",
    root_formula_error: "طبّق الدستور بدقة: z = (−b ± i√(−Δ))/(2a) — لا تنسَ إشارة −b ولا القسمة على 2a.",
    argument_quadrant: "بعد حساب cos θ و sin θ انظر إلى إشارتيهما لتحديد الربع الذي تقع فيه النقطة قبل اختيار θ.",
    argument_cos_sin_swap: "cos θ = a/|z| (الجزء الحقيقي) و sin θ = b/|z| (الجزء التخيلي)؛ لا تبدّل بينهما.",
    midpoint_no_half: "لاحقة المنتصف هي متوسط اللاحقتين: z_I = (z_A + z_B)/2.",
    midpoint_difference: "الفرق z_B − z_A يعطي لاحقة الشعاع AB⃗، أما المنتصف فهو (z_A + z_B)/2.",
    distance_sum: "المسافة AB هي طويلة الشعاع AB⃗: AB = |z_B − z_A| (فرق وليس مجموعاً).",
  },
  bank: [],
  generators: complexGenerators,
};
