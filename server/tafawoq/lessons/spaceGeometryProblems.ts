// BAC-style problems for "الهندسة في الفضاء" (see ../problems.ts for the pattern).
//
// Both problems are built backwards from the answers: the normal / direction
// vector and the projection point are drawn first, then the given points are
// placed around them, so every coordinate, d, t and distance is an integer
// (or a simple √-form) as in a real BAC exercise.
//
// Note: the helpers come from ./spaceGeometry.ts, which imports this file to
// wire `problems`; they are only called inside generate(), never at load.
import { frac, join, mul, num, paren, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";
import {
  add,
  collinear,
  distinct,
  dot,
  draw,
  lineText,
  norm2,
  overSqrt,
  planeText,
  productsText,
  pt,
  quotientText,
  scale,
  shuffleSigns,
  sqrtChain,
  sqrtText,
  squaresText,
  sub,
  tri,
  vec,
  type V,
} from "./spaceGeometry";

/** Non-zero integer vectors with components in [−max ; max] (zeros allowed) orthogonal to n. */
function orthogonalTo(n: V, max: number): V[] {
  const found: V[] = [];
  for (let x = -max; x <= max; x += 1)
    for (let y = -max; y <= max; y += 1)
      for (let z = -max; z <= max; z += 1) {
        const w: V = [x, y, z];
        if ((x || y || z) && dot(w, n) === 0) found.push(w);
      }
  return found;
}

const nonZeroCoordinates = (v: V) => v.every(c => c !== 0);

/** (√n)/2 simplified: "3", "√3/2", "3√2/2", "2√5". */
function halfSqrt(n: number): string {
  let c = 1;
  for (let d = 2; d * d <= n; d += 1) if (n % (d * d) === 0) c = d;
  const r = n / (c * c);
  if (r === 1) return frac(c, 2);
  if (c % 2 === 0) return `${c / 2 === 1 ? "" : num(c / 2)}√${r}`;
  return `${c === 1 ? "" : num(c)}√${r}/2`;
}

/** "2×(−1) + 3×4 − 6 = 0"-style substitution of a point in a plane's left side. */
const substitution = (n: V, p: V, d: number) => `${productsText(n, p)} + ${paren(num(d))}`;

const NORMAL_BASES: V[] = [
  [1, 2, 2],
  [1, 1, 1],
  [1, 1, 2],
  [1, 2, 3],
];

export const spaceGeometryProblems: ProblemGenerator[] = [
  {
    id: "space-plane-abc",
    title: "مستو معيّن بثلاث نقط، مسافة ومسقط عمودي",
    generate(rng: Rng) {
      const { n, A, v, w, H, k } = draw(
        rng,
        r => {
          const n = shuffleSigns(r, r.pick(NORMAL_BASES));
          const A: V = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
          const pool = orthogonalTo(n, 3);
          const v = r.pick(pool);
          const w = r.pick(pool);
          const H = add(A, r.pick([v, w, scale(-1, v), scale(-1, w), add(v, w), sub(v, w)]));
          const k = r.pick([-2, -1, 1, 2]);
          return { n, A, v, w, H, k };
        },
        ({ n, A, v, w, H, k }) => {
          if (v[2] === 0 || collinear(v, w)) return false;
          const D = add(H, scale(k, n));
          const N = norm2(n);
          const H1 = add(D, scale(k, n));
          const H2 = sub(D, scale(k * N, n));
          const H3: V = [H[0], H[1], D[2]];
          const B = add(A, v);
          return (
            nonZeroCoordinates(D) &&
            [A, B, add(A, w), D].every(P => P.every(c => Math.abs(c) <= 9)) &&
            dot(n, A) !== 0 &&
            distinct(tri(H), tri(H1), tri(H2), tri(H3)) &&
            distinct(
              lineText(D, n),
              lineText(n, D),
              lineText(scale(-1, D), n),
              lineText(D, [n[0], n[1], 0])
            ) &&
            distinct(tri(sub(B, A)), tri(sub(A, B)), tri(add(A, B)), tri([v[0], v[1], -v[2]]))
          );
        }
      );
      const B = add(A, v);
      const C = add(A, w);
      const N = norm2(n);
      const d = -dot(n, A);
      const D = add(H, scale(k, n));
      const value = dot(n, D) + d; // = k·N
      const distance = overSqrt(Math.abs(value), N);
      const t = -k;
      const plane = planeText(n, d);
      return {
        statement: [
          "الفضاء منسوب إلى معلم متعامد ومتجانس (O ; i⃗ ; j⃗ ; k⃗).",
          `نعتبر النقط ${pt("A", A)} و ${pt("B", B)} و ${pt("C", C)} و ${pt("D", D)}.`,
        ].join("\n"),
        parts: [
          {
            skill: "vector_coordinates",
            difficulty: 1,
            type: "mcq",
            prompt: "ما إحداثيات الشعاع AB⃗؟",
            answer: tri(v),
            distractors: [
              { option: tri(sub(A, B)), misconception: "ab_reversed" },
              { option: tri(add(A, B)), misconception: "vector_sum" },
              { option: tri([v[0], v[1], -v[2]]), misconception: "forget_coordinate" },
            ],
            steps: [
              "AB⃗(x_B − x_A ; y_B − y_A ; z_B − z_A): النهاية ناقص البداية",
              `AB⃗${tri(v)}، وبالمثل AC⃗${tri(w)}`,
              "الشعاعان AB⃗ و AC⃗ غير مرتبطين خطياً (إحداثياتهما غير متناسبة)، إذن النقط A و B و C ليست على استقامة واحدة وتعيّن مستوياً (ABC)",
            ],
          },
          {
            skill: "dot_product",
            difficulty: 2,
            type: "short",
            prompt: `نعتبر الشعاع n⃗${tri([n[0], n[1], "m"])} حيث m عدد حقيقي. عيّن m حتى يكون n⃗ عمودياً على AB⃗.`,
            answer: num(n[2]),
            steps: [
              "n⃗ ⊥ AB⃗ يعني n⃗·AB⃗ = 0",
              `n⃗·AB⃗ = ${paren(num(n[0]))}×${paren(num(v[0]))} + ${paren(num(n[1]))}×${paren(num(v[1]))} + m×${paren(num(v[2]))} = ${join(num(n[0] * v[0] + n[1] * v[1]), mul(v[2], "m"))}`,
              `${mul(v[2], "m")} = ${num(-(n[0] * v[0] + n[1] * v[1]))} إذن m = ${num(n[2])}`,
              `ونتحقق أن n⃗·AC⃗ = ${productsText(n, w)} = 0: الشعاع ${vec("n", n)} ناظمي للمستوي (ABC)`,
            ],
          },
          {
            skill: "plane_equation",
            difficulty: 2,
            type: "short",
            prompt: `استنتج أن معادلة ديكارتية للمستوي (ABC) من الشكل ${planeText(n, 0).replace(" = 0", " + d = 0")}، ثم عيّن العدد الحقيقي d.`,
            answer: num(d),
            steps: [
              `${vec("n", n)} ناظمي لـ (ABC)، إذن (ABC): ${planeText(n, 0).replace(" = 0", " + d = 0")}`,
              `A ∈ (ABC): ${productsText(n, A)} + d = 0`,
              `${num(dot(n, A))} + d = 0 إذن d = ${num(d)}`,
              `(ABC): ${plane}`,
            ],
          },
          {
            skill: "point_plane_distance",
            difficulty: 2,
            type: "short",
            prompt: "احسب المسافة بين النقطة D والمستوي (ABC) (أعط النتيجة على أبسط شكل).",
            answer: distance,
            steps: [
              "d(D ; (ABC)) = |ax_D + by_D + cz_D + d| / √(a² + b² + c²)",
              `|${substitution(n, D, d)}| = |${num(value)}| = ${num(Math.abs(value))}`,
              `√(${squaresText(n)}) = √${N}`,
              `d(D ; (ABC)) = ${quotientText(Math.abs(value), N)}`,
            ],
          },
          {
            skill: "parametric_line",
            difficulty: 2,
            type: "mcq",
            prompt: "(Δ) هو المستقيم الذي يشمل D ويعامد المستوي (ABC). تمثيل وسيطي لـ (Δ) هو:",
            answer: lineText(D, n),
            distractors: [
              { option: lineText(n, D), misconception: "line_point_as_direction" },
              { option: lineText(scale(-1, D), n), misconception: "line_point_sign" },
              { option: lineText(D, [n[0], n[1], 0]), misconception: "forget_coordinate" },
            ],
            steps: [
              `(Δ) ⊥ (ABC)، إذن الشعاع الناظمي ${vec("n", n)} شعاع توجيه لـ (Δ)`,
              "الحدود الثابتة هي إحداثيات D، ومعاملات t هي إحداثيات n⃗",
              `(Δ): ${lineText(D, n)}`,
            ],
          },
          {
            skill: "parametric_line",
            difficulty: 3,
            type: "mcq",
            prompt: "المستقيم (Δ) يقطع المستوي (ABC) في النقطة H (المسقط العمودي للنقطة D على (ABC)). ما إحداثيات H؟",
            answer: tri(H),
            distractors: [
              { option: tri(add(D, scale(k, n))), misconception: "transpose_sign" },
              { option: tri(sub(D, scale(k * N, n))), misconception: "forget_coefficient" },
              { option: tri([H[0], H[1], D[2]]), misconception: "forget_coordinate" },
            ],
            steps: [
              "نعوّض x و y و z من التمثيل الوسيطي لـ (Δ) في معادلة (ABC)",
              `${join(num(dot(n, D)), `${N}t`, num(d))} = 0، أي ${join(`${N}t`, num(value))} = 0`,
              `${N}t = ${num(-value)} إذن t = ${num(t)}`,
              `نعوّض t = ${num(t)} في التمثيل الوسيطي لـ (Δ): H${tri(H)}`,
              `للتحقق: DH = ${sqrtText(norm2(sub(D, H)))} وهي المسافة d(D ; (ABC)) المحسوبة سابقاً`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "space-line-projection",
    title: "مستقيم معرّف وسيطياً، تعامد ومسقط عمودي",
    generate(rng: Rng) {
      const { B, u, tH, w, tE } = draw(
        rng,
        r => {
          const u: V = [r.nonZero(-2, 2), r.nonZero(-2, 2), r.nonZero(-2, 2)];
          const B: V = [r.nonZero(-4, 4), r.nonZero(-4, 4), r.nonZero(-4, 4)];
          const tH = r.pick([-2, -1, 1, 2]);
          const w = r.pick(orthogonalTo(u, 3).filter(nonZeroCoordinates));
          const tE = r.pick([-2, -1, 1, 2, 3].filter(value => value !== tH));
          return { B, u, tH, w, tE };
        },
        ({ B, u, tH, w, tE }) => {
          const H = add(B, scale(tH, u));
          const A = add(H, w);
          const E = add(B, scale(tE, u));
          const N = norm2(u);
          return (
            [H, A, E].every(P => P.every(c => Math.abs(c) <= 10)) &&
            dot(u, A) !== 0 &&
            distinct(
              tri(H),
              tri(sub(B, scale(tH, u))),
              tri(add(B, scale(tH * N, u))),
              tri(add(u, scale(tH, B)))
            )
          );
        }
      );
      const H = add(B, scale(tH, u));
      const A = add(H, w);
      const E = add(B, scale(tE, u));
      const N = norm2(u);
      const d = -dot(u, A);
      const AH2 = norm2(w);
      const BH2 = tH * tH * N;
      const area = halfSqrt(AH2 * BH2);
      const xEquation = `${join(num(B[0]), mul(u[0], "t"))} = ${num(E[0])}`;
      return {
        statement: [
          "الفضاء منسوب إلى معلم متعامد ومتجانس (O ; i⃗ ; j⃗ ; k⃗).",
          `نعتبر النقطة ${pt("A", A)} والمستقيم (D) المعرّف بالتمثيل الوسيطي: ${lineText(B, u)}`,
          `ولتكن B${tri(B)} النقطة من (D) الموافقة للوسيط t = 0.`,
        ].join("\n"),
        parts: [
          {
            skill: "parametric_line",
            difficulty: 1,
            type: "short",
            prompt: `النقطة ${pt("E", E)} تنتمي إلى (D). عيّن قيمة الوسيط t الموافقة لها.`,
            answer: num(tE),
            steps: [
              `من المعادلة الأولى: ${xEquation}`,
              `${mul(u[0], "t")} = ${num(E[0] - B[0])} إذن t = ${num(tE)}`,
              `نتحقق في المعادلتين الأخريين: y = ${num(E[1])} و z = ${num(E[2])} ✓`,
            ],
          },
          {
            skill: "plane_equation",
            difficulty: 2,
            type: "short",
            prompt: `(P) هو المستوي الذي يشمل A ويعامد (D). معادلة ديكارتية لـ (P) من الشكل ${planeText(u, 0).replace(" = 0", " + d = 0")}. عيّن العدد الحقيقي d.`,
            answer: num(d),
            steps: [
              `شعاع توجيه (D) هو ${vec("u", u)} (معاملات t)، وبما أن (P) ⊥ (D) فإن u⃗ ناظمي لـ (P)`,
              `A ∈ (P): ${productsText(u, A)} + d = 0`,
              `${num(dot(u, A))} + d = 0 إذن d = ${num(d)}`,
              `(P): ${planeText(u, d)}`,
            ],
          },
          {
            skill: "parametric_line",
            difficulty: 2,
            type: "short",
            prompt: "المستقيم (D) يقطع المستوي (P) في النقطة H. عيّن قيمة الوسيط t الموافقة للنقطة H.",
            answer: num(tH),
            steps: [
              "نعوّض x و y و z من التمثيل الوسيطي لـ (D) في معادلة (P)",
              `${join(num(dot(u, B)), `${N}t`, num(d))} = 0، أي ${join(`${N}t`, num(dot(u, B) + d))} = 0`,
              `${N}t = ${num(-(dot(u, B) + d))} إذن t = ${num(tH)}`,
            ],
          },
          {
            skill: "parametric_line",
            difficulty: 2,
            type: "mcq",
            prompt: "استنتج إحداثيات النقطة H، المسقط العمودي للنقطة A على المستقيم (D).",
            answer: tri(H),
            distractors: [
              { option: tri(sub(B, scale(tH, u))), misconception: "transpose_sign" },
              { option: tri(add(B, scale(tH * N, u))), misconception: "forget_coefficient" },
              { option: tri(add(u, scale(tH, B))), misconception: "line_point_as_direction" },
            ],
            steps: [
              `نعوّض t = ${num(tH)} في التمثيل الوسيطي لـ (D)`,
              `H${tri(H)}`,
              `H ∈ (D) و (AH) ⊂ (P) ⊥ (D)، إذن H هي المسقط العمودي لـ A على (D)`,
            ],
          },
          {
            skill: "norm_distance",
            difficulty: 2,
            type: "short",
            prompt: "احسب المسافة AH، أي المسافة بين النقطة A والمستقيم (D) (أعط النتيجة على أبسط شكل).",
            answer: sqrtText(AH2),
            steps: [
              `AH⃗${tri(sub(H, A))}`,
              `AH = √(${squaresText(sub(H, A))}) = ${sqrtChain(AH2)}`,
            ],
          },
          {
            skill: "norm_distance",
            difficulty: 3,
            type: "short",
            prompt: "احسب مساحة المثلث ABH (أعط النتيجة على أبسط شكل).",
            answer: area,
            steps: [
              `BH⃗ = (${num(tH)})·u⃗، إذن BH⃗${tri(sub(H, B))} و AH⃗·BH⃗ = ${productsText(sub(H, A), sub(H, B))} = 0: المثلث ABH قائم في H`,
              `BH = √(${squaresText(sub(H, B))}) = ${sqrtChain(BH2)}`,
              `مساحة ABH = (AH × BH) / 2 = √(${AH2} × ${BH2}) / 2 = √${AH2 * BH2} / 2`,
              `مساحة ABH = ${area}`,
            ],
          },
        ],
      };
    },
  },
];
