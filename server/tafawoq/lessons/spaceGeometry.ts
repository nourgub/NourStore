// BAC lesson "الهندسة في الفضاء" — skill graph, misconceptions and parametric
// generators (pattern: ./derivativesGenerators.ts).
//
// Grading note: coordinate triples (2 ; −1 ; 3), plane equations "… = 0"
// and parametric systems cannot be graded as typed expressions (the grader
// reads only what follows the last "="), so every item whose answer is one
// of those is a multiple choice; typed items always ask for a single number
// (a dot product, a distance, d, m, t), written exactly or in √-form.
import type { Lesson } from "../curriculum";
import { frac, gcd, join, mul, num, paren, type Generator, type Rng } from "../generators/core";

/** Re-draws until `valid` holds — keeps generators free of degenerate cases. */
function draw<T>(rng: Rng, make: (rng: Rng) => T, valid: (value: T) => boolean): T {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = make(rng);
    if (valid(value)) return value;
  }
  throw new Error("generator could not find valid parameters");
}

const distinct = (...values: string[]) => new Set(values).size === values.length;

/** Numeric values pairwise different (so no option can be equivalent to another). */
const distinctValues = (...values: number[]) =>
  values.every((value, i) => values.every((other, j) => i === j || Math.abs(value - other) > 1e-9));

type V = readonly [number, number, number];

const AXES = ["x", "y", "z"] as const;

/** (2 ; −1 ; 3) */
const tri = (v: readonly (number | string)[]) =>
  `(${v.map(c => (typeof c === "number" ? num(c) : c)).join(" ; ")})`;
const vec = (name: string, v: V) => `${name}⃗${tri(v)}`;
const pt = (name: string, v: V) => `${name}${tri(v)}`;

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (k: number, a: V): V => [k * a[0], k * a[1], k * a[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm2 = (a: V) => dot(a, a);
const same = (a: V, b: V) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const collinear = (a: V, b: V) =>
  a[1] * b[2] - a[2] * b[1] === 0 && a[2] * b[0] - a[0] * b[2] === 0 && a[0] * b[1] - a[1] * b[0] === 0;
/** Line P + t·u equals line Q + t·v. */
const sameLine = (p: V, u: V, q: V, v: V) => collinear(u, v) && collinear(sub(q, p), u);
const onLine = (m: V, p: V, u: V) => collinear(sub(m, p), u);

const randomVector = (rng: Rng, max: number): V => [rng.nonZero(-max, max), rng.nonZero(-max, max), rng.nonZero(-max, max)];

/** Every vector with non-zero integer components in [−max ; max] satisfying `keep`. */
function vectorsWhere(max: number, keep: (w: V) => boolean): V[] {
  const found: V[] = [];
  for (let x = -max; x <= max; x += 1)
    for (let y = -max; y <= max; y += 1)
      for (let z = -max; z <= max; z += 1) {
        if (!x || !y || !z) continue;
        const w: V = [x, y, z];
        if (keep(w)) found.push(w);
      }
  return found;
}

/** Every point with integer coordinates in [−max ; max] satisfying `keep`. */
function pointsWhere(max: number, keep: (w: V) => boolean): V[] {
  const found: V[] = [];
  for (let x = -max; x <= max; x += 1)
    for (let y = -max; y <= max; y += 1)
      for (let z = -max; z <= max; z += 1) {
        const w: V = [x, y, z];
        if (keep(w)) found.push(w);
      }
  return found;
}

/** "2×3 − 1×(−4) + 5×2" — the written form of a·b component by component. */
const productsText = (a: V, b: readonly number[]) =>
  a.map((c, i) => `${paren(num(c))}×${paren(num(b[i]))}`).join(" + ");

/** "(−2)² + 3² + 1²" */
const squaresText = (a: readonly number[]) => a.map(c => `${paren(num(c))}²`).join(" + ");

/** "x_B − x_A = 4 − (−1) = 5" style differences, one per axis. */
const differenceText = (to: V, from: V, b: string, a: string) =>
  AXES.map((axis, i) => `${axis}_${b} − ${axis}_${a} = ${num(to[i])} − ${paren(num(from[i]))} = ${num(to[i] - from[i])}`).join(" ، ");

/** √n simplified: 5, √13, 2√7. */
function sqrtText(n: number): string {
  let k = 1;
  for (let d = 2; d * d <= n; d += 1) if (n % (d * d) === 0) k = d;
  const m = n / (k * k);
  if (m === 1) return num(k);
  return k === 1 ? `√${m}` : `${k}√${m}`;
}

/** "√n = 2√7" or just "√n" when it does not simplify. */
const sqrtChain = (n: number) => (sqrtText(n) === `√${n}` ? `√${n}` : `√${n} = ${sqrtText(n)}`);

/** p/√k in simplest form with a rational denominator: "5/3", "√6", "4√3/3", "−(2√6/3)". */
function overSqrt(p: number, k: number): string {
  if (p < 0) {
    return `−${overSqrt(-p, k)}`;
  }
  let s = 1;
  for (let d = 2; d * d <= k; d += 1) if (k % (d * d) === 0) s = d;
  const m = k / (s * s);
  if (m === 1) return frac(p, s);
  const g = gcd(p, s * m);
  const top = p / g;
  const bottom = (s * m) / g;
  return `${top === 1 ? "" : num(top)}√${m}${bottom === 1 ? "" : `/${bottom}`}`;
}

/** "4/9", "9/3 = 3" or "7/√6 = 7√6/6" — the last step of a point–plane distance. */
function quotientText(p: number, k: number): string {
  const root = sqrtText(k);
  const written = root.includes("√") ? `${p}/√${k}` : `${p}/${root}`;
  const result = overSqrt(p, k);
  return written === result ? result : `${written} = ${result}`;
}

/** a·x + b·y + c·z + d */
const planeLhs = (n: V, d: number | string) =>
  join(mul(n[0], "x"), mul(n[1], "y"), mul(n[2], "z"), typeof d === "number" ? num(d) : d);
const planeText = (n: V, d: number) => `${planeLhs(n, d)} = 0`;

/** Parametric system of the line through p directed by u. */
const lineText = (p: V, u: V) =>
  `${AXES.map((axis, i) => `${axis} = ${join(num(p[i]), u[i] === 0 ? "0" : mul(u[i], "t"))}`).join(" ; ")} ; t ∈ ℝ`;

/** Normals for clean distances: integer norms, plus a few √-norms. */
const INTEGER_NORMALS: Array<[V, number]> = [
  [[1, 2, 2], 3],
  [[2, 3, 6], 7],
  [[1, 4, 8], 9],
  [[4, 4, 7], 9],
  [[2, 6, 9], 11],
];
const SQRT_NORMALS: V[] = [
  [1, 1, 1],
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 1],
  [1, 3, 1],
];

/** A random signed permutation of a base normal. */
function shuffleSigns(rng: Rng, base: V): V {
  const [x, y, z] = rng.shuffle(base);
  return [x * rng.pick([1, -1]), y * rng.pick([1, -1]), z * rng.pick([1, -1])];
}

const spaceGenerators: Generator[] = [
  // --------------------------------------------------------- vector coordinates
  {
    id: "vector-ab-mcq",
    skill: "vector_coordinates",
    difficulty: 1,
    generate: rng => {
      const [A, B] = draw(
        rng,
        r => [randomVector(r, 6), randomVector(r, 6)] as const,
        ([A, B]) => {
          const ab = sub(B, A);
          return (
            ab[2] !== 0 &&
            distinct(tri(ab), tri(sub(A, B)), tri(add(A, B)), tri([ab[0], ab[1], -ab[2]]))
          );
        }
      );
      const ab = sub(B, A);
      return {
        type: "mcq",
        prompt: `في معلم متعامد ومتجانس للفضاء، نعتبر النقطتين ${pt("A", A)} و ${pt("B", B)}. ما إحداثيات الشعاع AB⃗؟`,
        answer: tri(ab),
        distractors: [
          { option: tri(sub(A, B)), misconception: "ab_reversed" },
          { option: tri(add(A, B)), misconception: "vector_sum" },
          { option: tri([ab[0], ab[1], -ab[2]]), misconception: "forget_coordinate" },
        ],
        steps: [
          "إحداثيات AB⃗ هي إحداثيات النهاية B ناقص إحداثيات البداية A: (x_B − x_A ; y_B − y_A ; z_B − z_A)",
          differenceText(B, A, "B", "A"),
          `AB⃗${tri(ab)}`,
        ],
      };
    },
  },
  {
    id: "parallelogram-mcq",
    skill: "vector_coordinates",
    difficulty: 2,
    generate: rng => {
      const [A, B, C] = draw(
        rng,
        r => [randomVector(r, 5), randomVector(r, 5), randomVector(r, 5)] as const,
        ([A, B, C]) => {
          const D = add(A, sub(C, B));
          return (
            !collinear(sub(B, A), sub(C, A)) &&
            sub(C, B).every(c => c !== 0) &&
            distinct(tri(D), tri(add(A, sub(B, C))), tri(add(B, sub(C, A))), tri([D[0], D[1], A[2]]))
          );
        }
      );
      const bc = sub(C, B);
      const D = add(A, bc);
      return {
        type: "mcq",
        prompt: `نعتبر النقط ${pt("A", A)} و ${pt("B", B)} و ${pt("C", C)}. ما إحداثيات النقطة D حتى يكون الرباعي ABCD متوازي أضلاع؟`,
        answer: tri(D),
        distractors: [
          { option: tri(add(A, sub(B, C))), misconception: "ab_reversed" },
          { option: tri(add(B, sub(C, A))), misconception: "parallelogram_order" },
          { option: tri([D[0], D[1], A[2]]), misconception: "forget_coordinate" },
        ],
        steps: [
          "ABCD متوازي أضلاع يعني AD⃗ = BC⃗",
          `BC⃗ = ${tri(bc)} (C ناقص B)`,
          `D = A + BC⃗: x_D = ${num(A[0])} + ${paren(num(bc[0]))} ، y_D = ${num(A[1])} + ${paren(num(bc[1]))} ، z_D = ${num(A[2])} + ${paren(num(bc[2]))}`,
          `${pt("D", D)}`,
        ],
      };
    },
  },
  // ------------------------------------------------- dot product & orthogonality
  {
    id: "dot-short",
    skill: "dot_product",
    difficulty: 1,
    generate: rng => {
      const u = randomVector(rng, 5);
      const v = randomVector(rng, 5);
      const answer = dot(u, v);
      return {
        type: "short",
        prompt: `في معلم متعامد ومتجانس، ${vec("u", u)} و ${vec("v", v)}. احسب الجداء السلمي u⃗·v⃗.`,
        answer: num(answer),
        steps: [
          "u⃗·v⃗ = xx′ + yy′ + zz′ (نضرب الإحداثيات المتناظرة ثم نجمع النواتج)",
          `u⃗·v⃗ = ${productsText(u, v)}`,
          `u⃗·v⃗ = ${join(...u.map((c, i) => num(c * v[i])))} = ${num(answer)}`,
        ],
      };
    },
  },
  {
    id: "dot-mcq",
    skill: "dot_product",
    difficulty: 1,
    generate: rng => {
      const [u, v] = draw(
        rng,
        r => [randomVector(r, 4), randomVector(r, 4)] as const,
        ([u, v]) =>
          distinctValues(dot(u, v), u[0] * v[0] + u[1] * v[1], u[0] + v[0] + u[1] + v[1] + u[2] + v[2])
      );
      const answer = dot(u, v);
      const products: V = [u[0] * v[0], u[1] * v[1], u[2] * v[2]];
      return {
        type: "mcq",
        prompt: `${vec("u", u)} و ${vec("v", v)}. ما قيمة الجداء السلمي u⃗·v⃗؟`,
        answer: num(answer),
        distractors: [
          { option: tri(products), misconception: "dot_componentwise" },
          { option: num(u[0] * v[0] + u[1] * v[1]), misconception: "forget_coordinate" },
          { option: num(u[0] + v[0] + u[1] + v[1] + u[2] + v[2]), misconception: "dot_sum" },
        ],
        steps: [
          "الجداء السلمي عدد حقيقي وليس شعاعاً: u⃗·v⃗ = xx′ + yy′ + zz′",
          `u⃗·v⃗ = ${productsText(u, v)}`,
          `u⃗·v⃗ = ${join(...products.map(num))} = ${num(answer)}`,
        ],
      };
    },
  },
  {
    id: "dot-points-short",
    skill: "dot_product",
    difficulty: 2,
    generate: rng => {
      const [A, B, C] = draw(
        rng,
        r => [randomVector(r, 5), randomVector(r, 5), randomVector(r, 5)] as const,
        ([A, B, C]) => sub(B, A).every(c => c !== 0) && sub(C, A).every(c => c !== 0)
      );
      const ab = sub(B, A);
      const ac = sub(C, A);
      const answer = dot(ab, ac);
      return {
        type: "short",
        prompt: `نعتبر النقط ${pt("A", A)} و ${pt("B", B)} و ${pt("C", C)}. احسب الجداء السلمي AB⃗·AC⃗.`,
        answer: num(answer),
        steps: [
          `AB⃗ = ${tri(ab)} (B ناقص A)`,
          `AC⃗ = ${tri(ac)} (C ناقص A)`,
          `AB⃗·AC⃗ = ${productsText(ab, ac)}`,
          `AB⃗·AC⃗ = ${join(...ab.map((c, i) => num(c * ac[i])))} = ${num(answer)}`,
        ],
      };
    },
  },
  {
    id: "orthogonal-parameter-mcq",
    skill: "dot_product",
    difficulty: 2,
    generate: rng => {
      const { u, v, slot } = draw(
        rng,
        r => {
          const slot = r.int(0, 2);
          const u = randomVector(r, 5);
          const v = randomVector(r, 5);
          return { u, v, slot };
        },
        ({ u, v, slot }) => {
          const k = u[slot];
          const rest = dot(u, v) - u[slot] * v[slot];
          if (Math.abs(k) < 2 || rest === 0 || rest % k !== 0) return false;
          const other = (slot + 1) % 3;
          return distinct(
            frac(-rest, k),
            frac(rest, k),
            num(-rest),
            frac(-(rest - u[other] * v[other]), k)
          ) && distinctValues(-rest / k, rest / k, -rest, -(rest - u[other] * v[other]) / k);
        }
      );
      const k = u[slot];
      const rest = dot(u, v) - u[slot] * v[slot];
      const other = (slot + 1) % 3;
      const m = -rest / k;
      const vText = tri(v.map((c, i) => (i === slot ? "m" : c)));
      const productTerms = v.map((c, i) => (i === slot ? mul(u[i], "m") : `${paren(num(u[i]))}×${paren(num(c))}`));
      return {
        type: "mcq",
        prompt: `${vec("u", u)} و v⃗${vText} حيث m عدد حقيقي. ما قيمة m التي يكون من أجلها الشعاعان u⃗ و v⃗ متعامدين؟`,
        answer: num(m),
        distractors: [
          { option: frac(rest, k), misconception: "transpose_sign" },
          { option: num(-rest), misconception: "forget_coefficient" },
          { option: frac(-(rest - u[other] * v[other]), k), misconception: "forget_coordinate" },
        ],
        steps: [
          "u⃗ ⊥ v⃗ يعني u⃗·v⃗ = 0",
          `u⃗·v⃗ = ${join(...productTerms)} = ${join(mul(k, "m"), num(rest))}`,
          `${join(mul(k, "m"), num(rest))} = 0 إذن ${mul(k, "m")} = ${num(-rest)}`,
          `m = ${num(-rest)}/${paren(num(k))} = ${num(m)}`,
        ],
      };
    },
  },
  {
    id: "orthogonal-vector-mcq",
    skill: "dot_product",
    difficulty: 3,
    generate: rng => {
      const { u, answer, partial, signError, parallel } = draw(
        rng,
        r => {
          const u = randomVector(r, 3);
          const orthogonal = vectorsWhere(4, w => dot(u, w) === 0);
          const partial = vectorsWhere(4, w => u[0] * w[0] + u[1] * w[1] === 0 && dot(u, w) !== 0);
          const signError = vectorsWhere(
            4,
            w => u[0] * w[0] - u[1] * w[1] + u[2] * w[2] === 0 && dot(u, w) !== 0
          );
          return {
            u,
            answer: orthogonal.length ? r.pick(orthogonal) : null,
            partial: partial.length ? r.pick(partial) : null,
            signError: signError.length ? r.pick(signError) : null,
            parallel: scale(r.pick([2, -1, -2]), u),
          };
        },
        ({ answer, partial, signError, parallel }) =>
          answer !== null &&
          partial !== null &&
          signError !== null &&
          distinct(tri(answer), tri(partial), tri(signError), tri(parallel))
      );
      const w = answer!;
      const other = partial!;
      return {
        type: "mcq",
        prompt: `${vec("u", u)}. أيّ الأشعة التالية عمودي على الشعاع u⃗؟`,
        answer: tri(w),
        distractors: [
          { option: tri(other), misconception: "forget_coordinate" },
          { option: tri(signError!), misconception: "dot_sign" },
          { option: tri(parallel), misconception: "orthogonal_collinear" },
        ],
        steps: [
          "يكون الشعاع w⃗ عمودياً على u⃗ إذا وفقط إذا كان u⃗·w⃗ = 0",
          `من أجل w⃗${tri(w)}: u⃗·w⃗ = ${productsText(u, w)} = 0`,
          `أما ${tri(other)} فيعطي ${productsText(u, other)} = ${num(dot(u, other))} ≠ 0 (يجب حساب الحدود الثلاثة)`,
          `إذن الشعاع العمودي على u⃗ هو ${tri(w)}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------- norm & distance
  {
    id: "norm-short",
    skill: "norm_distance",
    difficulty: 1,
    generate: rng => {
      const u = randomVector(rng, 6);
      const n = norm2(u);
      return {
        type: "short",
        prompt: `${vec("u", u)}. احسب طويلة الشعاع ‖u⃗‖ (أعط النتيجة على أبسط شكل).`,
        answer: sqrtText(n),
        steps: [
          "‖u⃗‖ = √(x² + y² + z²)",
          `‖u⃗‖ = √(${squaresText(u)}) = √(${u.map(c => c * c).join(" + ")})`,
          `‖u⃗‖ = ${sqrtChain(n)}`,
        ],
      };
    },
  },
  {
    id: "distance-short",
    skill: "norm_distance",
    difficulty: 2,
    generate: rng => {
      const [A, B] = draw(
        rng,
        r => [randomVector(r, 6), randomVector(r, 6)] as const,
        ([A, B]) => sub(B, A).every(c => c !== 0)
      );
      const ab = sub(B, A);
      const n = norm2(ab);
      return {
        type: "short",
        prompt: `نعتبر النقطتين ${pt("A", A)} و ${pt("B", B)}. احسب المسافة AB (أعط النتيجة على أبسط شكل).`,
        answer: sqrtText(n),
        steps: [
          "AB = ‖AB⃗‖ = √((x_B − x_A)² + (y_B − y_A)² + (z_B − z_A)²)",
          `AB⃗ = ${tri(ab)}`,
          `AB = √(${squaresText(ab)}) = √(${ab.map(c => c * c).join(" + ")})`,
          `AB = ${sqrtChain(n)}`,
        ],
      };
    },
  },
  {
    id: "distance-mcq",
    skill: "norm_distance",
    difficulty: 2,
    generate: rng => {
      const [A, B] = draw(
        rng,
        r => [randomVector(r, 5), randomVector(r, 5)] as const,
        ([A, B]) => {
          const ab = sub(B, A);
          if (!ab.every(c => c !== 0)) return false;
          const n = norm2(ab);
          return distinctValues(
            Math.sqrt(n),
            n,
            Math.abs(ab[0]) + Math.abs(ab[1]) + Math.abs(ab[2]),
            Math.sqrt(ab[0] ** 2 + ab[1] ** 2)
          );
        }
      );
      const ab = sub(B, A);
      const n = norm2(ab);
      return {
        type: "mcq",
        prompt: `${pt("A", A)} و ${pt("B", B)} نقطتان من الفضاء. ما المسافة AB؟`,
        answer: sqrtText(n),
        distractors: [
          { option: num(n), misconception: "norm_no_sqrt" },
          { option: num(Math.abs(ab[0]) + Math.abs(ab[1]) + Math.abs(ab[2])), misconception: "norm_sum" },
          { option: sqrtText(ab[0] ** 2 + ab[1] ** 2), misconception: "forget_coordinate" },
        ],
        steps: [
          `AB⃗ = ${tri(ab)}`,
          `AB = √(${squaresText(ab)}) = √(${ab.map(c => c * c).join(" + ")})`,
          `AB = ${sqrtChain(n)}`,
        ],
      };
    },
  },
  // ---------------------------------------------------------------------- plane
  {
    id: "point-in-plane-mcq",
    skill: "plane_equation",
    difficulty: 1,
    generate: rng => {
      const picked = draw(
        rng,
        r => {
          const n: V = [r.nonZero(-3, 3), r.nonZero(-3, 3), r.nonZero(-3, 3)];
          const d = r.nonZero(-6, 6);
          const on = pointsWhere(3, p => dot(n, p) + d === 0);
          const signD = pointsWhere(3, p => dot(n, p) - d === 0);
          const noZ = pointsWhere(3, p => n[0] * p[0] + n[1] * p[1] + d === 0 && p[2] !== 0);
          return {
            n,
            d,
            answer: on.length ? r.pick(on) : null,
            signD: signD.length ? r.pick(signD) : null,
            noZ: noZ.length ? r.pick(noZ) : null,
          };
        },
        ({ n, d, answer, signD, noZ }) =>
          answer !== null &&
          signD !== null &&
          noZ !== null &&
          norm2(n) + d !== 0 &&
          distinct(tri(answer), tri(signD), tri(noZ), tri(n))
      );
      const { n, d } = picked;
      const P = picked.answer!;
      const Q = picked.signD!;
      return {
        type: "mcq",
        prompt: `(P) هو المستوي ذو المعادلة ${planeText(n, d)}. أيّ النقط التالية تنتمي إلى المستوي (P)؟`,
        answer: tri(P),
        distractors: [
          { option: tri(Q), misconception: "plane_d_sign" },
          { option: tri(picked.noZ!), misconception: "forget_coordinate" },
          { option: tri(n), misconception: "normal_as_point" },
        ],
        steps: [
          "تنتمي النقطة إلى (P) إذا وفقط إذا حققت إحداثياتها المعادلة، أي إذا انعدم الطرف الأول",
          `من أجل ${tri(P)}: ${join(productsText(n, P), num(d))} = 0 ✓`,
          `أما ${tri(Q)} فتعطي ${join(productsText(n, Q), num(d))} = ${num(dot(n, Q) + d)} ≠ 0`,
          `إذن النقطة ${tri(P)} تنتمي إلى (P)`,
        ],
      };
    },
  },
  {
    id: "normal-vector-mcq",
    skill: "plane_equation",
    difficulty: 1,
    generate: rng => {
      const [n, d] = draw(
        rng,
        r => [[r.nonZero(-5, 5), r.nonZero(-5, 5), r.nonZero(-5, 5)] as V, r.nonZero(-9, 9)] as const,
        ([n, d]) => {
          const positives = n.filter(c => c > 0).length;
          const withD: V = [n[0], n[1], d];
          const shifted: V = [n[1], n[2], d];
          const absolute: V = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])];
          return (
            positives > 0 &&
            positives < 3 &&
            !collinear(n, withD) &&
            !collinear(n, shifted) &&
            !collinear(n, absolute) &&
            distinct(tri(n), tri(withD), tri(shifted), tri(absolute))
          );
        }
      );
      return {
        type: "mcq",
        prompt: `ما إحداثيات شعاع ناظمي n⃗ للمستوي (P) ذي المعادلة ${planeText(n, d)}؟`,
        answer: tri(n),
        distractors: [
          { option: tri([n[0], n[1], d]), misconception: "normal_with_d" },
          { option: tri([n[1], n[2], d]), misconception: "normal_with_d" },
          { option: tri([Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])]), misconception: "normal_sign" },
        ],
        steps: [
          "المستوي ذو المعادلة ax + by + cz + d = 0 يقبل الشعاع n⃗(a ; b ; c) شعاعاً ناظمياً؛ الحد الثابت d لا يدخل فيه",
          `هنا a = ${num(n[0])} و b = ${num(n[1])} و c = ${num(n[2])} (مع إشاراتها)`,
          `${vec("n", n)}`,
        ],
      };
    },
  },
  {
    id: "plane-constant-short",
    skill: "plane_equation",
    difficulty: 2,
    generate: rng => {
      const [n, A] = draw(
        rng,
        r => [randomVector(r, 4), randomVector(r, 4)] as const,
        ([n, A]) => dot(n, A) !== 0
      );
      const d = -dot(n, A);
      return {
        type: "short",
        prompt: `(P) هو المستوي الذي يشمل النقطة ${pt("A", A)} ويقبل ${vec("n", n)} شعاعاً ناظمياً. معادلته من الشكل ${planeLhs(n, "d")} = 0. ما قيمة العدد d؟`,
        answer: num(d),
        steps: [
          "A ∈ (P)، إذن إحداثيات A تحقق معادلة (P)",
          `${join(productsText(n, A), "d")} = 0`,
          `${join(num(dot(n, A)), "d")} = 0 إذن d = ${num(d)}`,
          `(P): ${planeText(n, d)}`,
        ],
      };
    },
  },
  // -------------------------------------------------------- point–plane distance
  {
    id: "point-plane-distance-short",
    skill: "point_plane_distance",
    difficulty: 2,
    generate: rng => {
      const useSqrt = rng.chance(0.35);
      const { n, k, A, d } = draw(
        rng,
        r => {
          const base = useSqrt ? r.pick(SQRT_NORMALS) : r.pick(INTEGER_NORMALS)[0];
          const n = shuffleSigns(r, base);
          const A: V = [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)];
          return { n, k: norm2(n), A, d: r.nonZero(-9, 9) };
        },
        ({ n, A, d }) => dot(n, A) + d !== 0 && A.every(c => c !== 0)
      );
      const N = dot(n, A) + d;
      const answer = overSqrt(Math.abs(N), k);
      return {
        type: "short",
        prompt: `احسب المسافة بين النقطة ${pt("A", A)} والمستوي (P) ذي المعادلة ${planeText(n, d)} (أعط النتيجة على أبسط شكل).`,
        answer,
        steps: [
          "d(A ; (P)) = |ax_A + by_A + cz_A + d| / √(a² + b² + c²)",
          `البسط: |${join(productsText(n, A), num(d))}| = |${num(N)}| = ${Math.abs(N)}`,
          `المقام: √(${squaresText(n)}) = √${k}${sqrtText(k) === `√${k}` ? "" : ` = ${sqrtText(k)}`}`,
          `d(A ; (P)) = ${quotientText(Math.abs(N), k)}`,
        ],
      };
    },
  },
  {
    id: "point-plane-distance-mcq",
    skill: "point_plane_distance",
    difficulty: 3,
    generate: rng => {
      const { n, k, A, d } = draw(
        rng,
        r => {
          const base = r.chance(0.5) ? r.pick(SQRT_NORMALS) : r.pick(INTEGER_NORMALS)[0];
          const n = shuffleSigns(r, base);
          const A: V = [r.nonZero(-4, 4), r.nonZero(-4, 4), r.nonZero(-4, 4)];
          return { n, k: norm2(n), A, d: r.nonZero(-9, 9) };
        },
        // A negative numerator makes "forgot |·|" visible as a negative distance.
        ({ n, A, d, k }) => {
          const N = dot(n, A) + d;
          return N < 0 && distinctValues(-N / Math.sqrt(k), N / Math.sqrt(k), -N / k, -N);
        }
      );
      const N = dot(n, A) + d;
      const answer = overSqrt(-N, k);
      return {
        type: "mcq",
        prompt: `ما المسافة بين النقطة ${pt("A", A)} والمستوي (P): ${planeText(n, d)}؟`,
        answer,
        distractors: [
          { option: overSqrt(N, k), misconception: "pp_no_abs" },
          { option: frac(-N, k), misconception: "pp_no_sqrt" },
          { option: num(-N), misconception: "pp_no_denominator" },
        ],
        steps: [
          "d(A ; (P)) = |ax_A + by_A + cz_A + d| / √(a² + b² + c²)",
          `${join(productsText(n, A), num(d))} = ${num(N)}، والمسافة موجبة فنأخذ القيمة المطلقة: ${-N}`,
          `√(${squaresText(n)}) = √${k}`,
          `d(A ; (P)) = ${quotientText(-N, k)}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------ parametric line
  {
    id: "parametric-line-mcq",
    skill: "parametric_line",
    difficulty: 2,
    generate: rng => {
      const [A, u] = draw(
        rng,
        r => [randomVector(r, 5), randomVector(r, 4)] as const,
        ([A, u]) => {
          const flat: V = [u[0], u[1], 0];
          const minusA = scale(-1, A);
          return (
            !sameLine(A, u, u, A) &&
            !sameLine(A, u, minusA, u) &&
            !sameLine(A, u, A, flat) &&
            !same(A, u) &&
            distinct(lineText(A, u), lineText(u, A), lineText(minusA, u), lineText(A, flat))
          );
        }
      );
      return {
        type: "mcq",
        prompt: `ما التمثيل الوسيطي للمستقيم (D) الذي يشمل النقطة ${pt("A", A)} و ${vec("u", u)} شعاع توجيه له؟`,
        answer: lineText(A, u),
        distractors: [
          { option: lineText(u, A), misconception: "line_point_as_direction" },
          { option: lineText(scale(-1, A), u), misconception: "line_point_sign" },
          { option: lineText(A, [u[0], u[1], 0]), misconception: "forget_coordinate" },
        ],
        steps: [
          "M(x ; y ; z) ∈ (D) ⇔ AM⃗ = t·u⃗ مع t ∈ ℝ",
          "إذن x = x_A + t·a ، y = y_A + t·b ، z = z_A + t·c: إحداثيات النقطة هي الحدود الثابتة وإحداثيات الشعاع هي معاملات t",
          `(D): ${lineText(A, u)}`,
        ],
      };
    },
  },
  {
    id: "point-on-line-mcq",
    skill: "parametric_line",
    difficulty: 1,
    generate: rng => {
      const { A, u, t } = draw(
        rng,
        r => ({ A: randomVector(r, 4), u: randomVector(r, 3), t: r.pick([-2, -1, 2, 3]) }),
        ({ A, u, t }) => {
          const M = add(A, scale(t, u));
          const flat: V = [M[0], M[1], A[2]];
          const signed: V = add(scale(-1, A), scale(t, u));
          return (
            !onLine(u, A, u) &&
            !onLine(signed, A, u) &&
            distinct(tri(M), tri(u), tri(flat), tri(signed))
          );
        }
      );
      const M = add(A, scale(t, u));
      return {
        type: "mcq",
        prompt: `المستقيم (D) معرّف بالتمثيل الوسيطي: ${lineText(A, u)}. أيّ النقط التالية تنتمي إلى (D)؟`,
        answer: tri(M),
        distractors: [
          { option: tri(u), misconception: "line_point_as_direction" },
          { option: tri([M[0], M[1], A[2]]), misconception: "forget_coordinate" },
          { option: tri(add(scale(-1, A), scale(t, u))), misconception: "line_point_sign" },
        ],
        steps: [
          "تنتمي النقطة إلى (D) إذا وُجدت قيمة واحدة للوسيط t تعطي إحداثياتها الثلاث معاً",
          `من أجل t = ${num(t)}: ${AXES.map((axis, i) => `${axis} = ${num(A[i])} + ${paren(num(t))}×${paren(num(u[i]))} = ${num(M[i])}`).join(" ، ")}`,
          `إذن النقطة ${tri(M)} تنتمي إلى (D)`,
        ],
      };
    },
  },
  {
    id: "line-plane-intersection-short",
    skill: "parametric_line",
    difficulty: 3,
    generate: rng => {
      const { A, u, n, t } = draw(
        rng,
        r => ({
          A: randomVector(r, 4),
          u: randomVector(r, 3),
          n: randomVector(r, 3),
          t: r.nonZero(-3, 3),
        }),
        ({ u, n }) => dot(n, u) !== 0
      );
      const d = -(dot(n, A) + t * dot(n, u));
      const lineTerm = (i: number) => `(${join(num(A[i]), mul(u[i], "t"))})`;
      const constant = dot(n, A) + d;
      const slope = dot(n, u);
      return {
        type: "short",
        prompt: `المستقيم (D): ${lineText(A, u)} يقطع المستوي (P): ${planeText(n, d)} في نقطة. ما قيمة الوسيط t الموافقة لنقطة التقاطع؟`,
        answer: num(t),
        steps: [
          "نعوّض x و y و z من التمثيل الوسيطي في معادلة (P)",
          `${join(...n.map((c, i) => mul(c, lineTerm(i))), num(d))} = 0`,
          `بعد النشر والتبسيط: ${join(mul(slope, "t"), num(constant))} = 0`,
          `t = ${num(-constant)}/${paren(num(slope))} = ${num(t)}`,
        ],
      };
    },
  },
];

export const spaceGeometryLesson: Lesson = {
  key: "math-space-geometry",
  curriculum: "dz",
  subject: "math",
  title: "الهندسة في الفضاء",
  levels: ["bac"],
  skills: [
    {
      key: "vector_coordinates",
      name: "إحداثيات شعاع ونقطة",
      prerequisites: [],
      explanation:
        "في معلم متعامد ومتجانس للفضاء، إذا كانت A(x_A ; y_A ; z_A) و B(x_B ; y_B ; z_B) فإن AB⃗(x_B − x_A ; y_B − y_A ; z_B − z_A): النهاية ناقص البداية، في الإحداثيات الثلاث. ومن المساواة الشعاعية AD⃗ = BC⃗ نستخرج إحداثيات نقطة مجهولة، مثل الرأس الرابع لمتوازي أضلاع.",
      example: {
        problem: "A(1 ; −2 ; 3) و B(4 ; 0 ; −1). عيّن إحداثيات الشعاع AB⃗.",
        steps: ["x_B − x_A = 4 − 1 = 3", "y_B − y_A = 0 − (−2) = 2", "z_B − z_A = −1 − 3 = −4"],
        answer: "AB⃗(3 ; 2 ; −4)",
      },
    },
    {
      key: "dot_product",
      name: "الجداء السلمي والتعامد",
      prerequisites: ["vector_coordinates"],
      explanation:
        "في معلم متعامد ومتجانس، الجداء السلمي للشعاعين u⃗(x ; y ; z) و v⃗(x′ ; y′ ; z′) هو العدد الحقيقي u⃗·v⃗ = xx′ + yy′ + zz′. يكون الشعاعان متعامدين إذا وفقط إذا كان u⃗·v⃗ = 0، ويجب حساب الحدود الثلاثة كلها.",
      example: {
        problem: "u⃗(2 ; −1 ; 3) و v⃗(1 ; 5 ; 1). هل الشعاعان متعامدان؟",
        steps: ["u⃗·v⃗ = 2×1 + (−1)×5 + 3×1", "u⃗·v⃗ = 2 − 5 + 3 = 0"],
        answer: "u⃗·v⃗ = 0 إذن u⃗ ⊥ v⃗",
      },
    },
    {
      key: "norm_distance",
      name: "طويلة شعاع والمسافة بين نقطتين",
      prerequisites: ["vector_coordinates"],
      explanation:
        "طويلة الشعاع u⃗(x ; y ; z) في معلم متعامد ومتجانس هي ‖u⃗‖ = √(x² + y² + z²)، والمسافة بين نقطتين هي طويلة الشعاع الذي يصل بينهما: AB = ‖AB⃗‖. لا ننسى الجذر التربيعي، فـ x² + y² + z² هو مربع المسافة.",
      example: {
        problem: "A(1 ; 2 ; −1) و B(3 ; −1 ; 5). احسب AB.",
        steps: ["AB⃗(2 ; −3 ; 6)", "AB = √(2² + (−3)² + 6²) = √(4 + 9 + 36)", "AB = √49"],
        answer: "AB = 7",
      },
    },
    {
      key: "plane_equation",
      name: "معادلة ديكارتية لمستو",
      prerequisites: ["dot_product"],
      explanation:
        "كل مستو يقبل معادلة من الشكل ax + by + cz + d = 0 حيث n⃗(a ; b ; c) شعاع ناظمي له (الثابت d لا يدخل في الشعاع الناظمي). تنتمي نقطة إلى المستوي إذا وفقط إذا حققت إحداثياتها المعادلة، ولإيجاد d نعوّض إحداثيات نقطة معلومة من المستوي.",
      example: {
        problem: "عيّن معادلة للمستوي (P) الذي يشمل A(1 ; 0 ; 2) و n⃗(2 ; −1 ; 3) ناظمي له.",
        steps: ["(P): 2x − y + 3z + d = 0", "A ∈ (P): 2×1 − 0 + 3×2 + d = 0", "8 + d = 0 إذن d = −8"],
        answer: "(P): 2x − y + 3z − 8 = 0",
      },
    },
    {
      key: "point_plane_distance",
      name: "المسافة بين نقطة ومستو",
      prerequisites: ["plane_equation", "norm_distance"],
      explanation:
        "المسافة بين النقطة A(x_A ; y_A ; z_A) والمستوي (P): ax + by + cz + d = 0 هي d(A ; (P)) = |ax_A + by_A + cz_A + d| / √(a² + b² + c²). البسط يؤخذ بالقيمة المطلقة لأن المسافة موجبة، والمقام هو طويلة الشعاع الناظمي (بالجذر).",
      example: {
        problem: "احسب المسافة بين A(1 ; 2 ; −1) والمستوي (P): x + 2y + 2z − 6 = 0.",
        steps: ["|1 + 4 − 2 − 6| = |−3| = 3", "√(1 + 4 + 4) = √9 = 3", "d(A ; (P)) = 3/3"],
        answer: "d(A ; (P)) = 1",
      },
    },
    {
      key: "parametric_line",
      name: "التمثيل الوسيطي لمستقيم",
      prerequisites: ["vector_coordinates", "plane_equation"],
      explanation:
        "المستقيم (D) الذي يشمل A(x_A ; y_A ; z_A) و u⃗(a ; b ; c) شعاع توجيه له يقبل التمثيل الوسيطي x = x_A + at ، y = y_A + bt ، z = z_A + ct مع t ∈ ℝ: إحداثيات النقطة هي الحدود الثابتة وإحداثيات الشعاع هي معاملات t. لإيجاد تقاطع (D) مع مستو نعوّض x و y و z في معادلته ونحل المعادلة ذات المجهول t.",
      example: {
        problem: "اكتب تمثيلاً وسيطياً للمستقيم الذي يشمل A(2 ; −1 ; 0) و u⃗(1 ; 3 ; −2) شعاع توجيه له.",
        steps: ["x = x_A + t·a = 2 + t", "y = y_A + t·b = −1 + 3t", "z = z_A + t·c = −2t"],
        answer: "x = 2 + t ; y = −1 + 3t ; z = −2t ; t ∈ ℝ",
      },
    },
  ],
  misconceptions: {
    ab_reversed: "حساب إحداثيات AB⃗ بـ A − B بدل B − A (البداية ناقص النهاية)",
    vector_sum: "جمع إحداثيات النقطتين بدل طرحها",
    forget_coordinate: "إهمال إحدى الإحداثيات (غالباً z) أو معاملتها بشكل مختلف عن الأخريين",
    parallelogram_order: "الخطأ في ترتيب رؤوس متوازي الأضلاع (استعمال AB⃗ = DC⃗ بشكل مقلوب)",
    dot_componentwise: "اعتبار الجداء السلمي شعاعاً (xx′ ; yy′ ; zz′) بدل عدد حقيقي",
    dot_sum: "جمع الإحداثيات بدل ضربها في الجداء السلمي",
    dot_sign: "خطأ في الإشارات عند حساب الجداء السلمي",
    transpose_sign: "عدم تغيير الإشارة عند نقل حد إلى الطرف الآخر من المعادلة",
    forget_coefficient: "نسيان القسمة على معامل المجهول عند حل المعادلة",
    orthogonal_collinear: "الخلط بين التعامد والارتباط الخطي (الشعاعان المتوازيان ليسا متعامدين)",
    norm_no_sqrt: "نسيان الجذر التربيعي في حساب الطويلة أو المسافة",
    norm_sum: "حساب الطويلة كمجموع |x| + |y| + |z|",
    plane_d_sign: "تعويض النقطة في ax + by + cz = d بدل ax + by + cz + d = 0 (خطأ في إشارة d)",
    normal_as_point: "الخلط بين الشعاع الناظمي n⃗(a ; b ; c) ونقطة من المستوي",
    normal_with_d: "إدخال الثابت d في إحداثيات الشعاع الناظمي",
    normal_sign: "إهمال إشارات المعاملات عند قراءة الشعاع الناظمي",
    pp_no_abs: "نسيان القيمة المطلقة في دستور المسافة بين نقطة ومستو (مسافة سالبة)",
    pp_no_sqrt: "القسمة على a² + b² + c² بدل √(a² + b² + c²)",
    pp_no_denominator: "نسيان القسمة على طويلة الشعاع الناظمي",
    line_point_as_direction: "تبديل دور النقطة وشعاع التوجيه في التمثيل الوسيطي",
    line_point_sign: "تغيير إشارات إحداثيات النقطة في التمثيل الوسيطي",
  },
  remedies: {
    ab_reversed: "AB⃗ يبدأ من A وينتهي عند B: إحداثياته دائماً «النهاية ناقص البداية» x_B − x_A.",
    vector_sum: "الشعاع AB⃗ فرق بين موقعين: نطرح إحداثيات A من إحداثيات B ولا نجمعها.",
    forget_coordinate: "في الفضاء ثلاث إحداثيات: طبّق القاعدة نفسها على x ثم y ثم z، وتحقق من الحد الثالث دائماً.",
    parallelogram_order: "ABCD متوازي أضلاع يعني AB⃗ = DC⃗ أو AD⃗ = BC⃗؛ ارسم الرباعي بالترتيب A ثم B ثم C ثم D قبل الكتابة.",
    dot_componentwise: "الجداء السلمي عدد: بعد ضرب الإحداثيات المتناظرة نجمع النواتج الثلاثة xx′ + yy′ + zz′.",
    dot_sum: "في الجداء السلمي نضرب x في x′ و y في y′ و z في z′ ثم نجمع النواتج؛ لا نجمع الإحداثيات.",
    dot_sign: "اكتب كل جداء بأقواس حول الأعداد السالبة، مثل 2×(−3)، ثم اجمع الحدود الثلاثة بإشاراتها.",
    transpose_sign: "عند نقل حد من طرف إلى آخر نغيّر إشارته: km + r = 0 تعطي km = −r.",
    forget_coefficient: "بعد الوصول إلى km = −r اقسم الطرفين على k: m = −r/k.",
    orthogonal_collinear: "الشعاعان المتعامدان جداؤهما السلمي 0، أما v⃗ = k·u⃗ فهو موازٍ لـ u⃗ وجداؤهما k‖u⃗‖² ≠ 0.",
    norm_no_sqrt: "x² + y² + z² هو مربع الطويلة؛ الطويلة نفسها هي √(x² + y² + z²).",
    norm_sum: "الطويلة تُحسب بفيثاغورس: √(x² + y² + z²)، وليست مجموع القيم المطلقة.",
    plane_d_sign: "عوّض إحداثيات النقطة في الطرف الأول ax + by + cz + d كما هو بإشاراته، وتنتمي النقطة إذا كانت النتيجة 0.",
    normal_as_point: "n⃗(a ; b ; c) شعاع عمودي على المستوي وليس نقطة منه؛ لاختبار نقطة عوّض إحداثياتها في المعادلة.",
    normal_with_d: "الشعاع الناظمي يتكون من معاملات x و y و z فقط: n⃗(a ; b ; c)؛ الثابت d لا يدخل فيه.",
    normal_sign: "اقرأ المعاملات بإشاراتها: في 2x − 3y + z = 0 المعامل b = −3 وليس 3.",
    pp_no_abs: "المسافة لا تكون سالبة: خذ القيمة المطلقة للبسط |ax_A + by_A + cz_A + d|.",
    pp_no_sqrt: "المقام هو طويلة الشعاع الناظمي √(a² + b² + c²) وليس مربعها.",
    pp_no_denominator: "لا تنسَ القسمة على √(a² + b² + c²): الدستور كاملاً |ax_A + by_A + cz_A + d| / √(a² + b² + c²).",
    line_point_as_direction: "في x = x_A + at الحد الثابت هو إحداثية النقطة، ومعامل t هو إحداثية شعاع التوجيه.",
    line_point_sign: "الحدود الثابتة هي إحداثيات A نفسها بإشاراتها: x = x_A + at وليس x = −x_A + at.",
  },
  bank: [],
  generators: spaceGenerators,
};
