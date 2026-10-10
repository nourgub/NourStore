// BAC-style problems for "الأعداد المركبة" (see ../problems.ts for the pattern).
//
// As in ./complex.ts, every typed key is in simplified algebraic form a + bi
// (the expression grader treats i as a variable). The small formatting
// helpers are repeated here rather than imported from ./complex.ts, which
// imports this file (no import cycle).
import { gcd, join, mul, num, paren, poly, sup, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

/** a + bi with integer parts: "3 − 2i", "−i", "4". */
const cx = (a: number, b: number) => join(num(a), b === 0 ? "0" : mul(b, "i"));

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

/** r·e^(iθ) with θ = (p/q)π: "2e^(iπ/3)", "√2·e^(−3iπ/4)". */
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

/** c·√root as a real part: "1", "−√3". */
const realPart = (c: number, root: 1 | 3) => (root === 1 ? num(c) : c === 1 ? "√3" : c === -1 ? "−√3" : `${num(c)}√3`);
/** c·√root as an imaginary part: "i", "−i√3". */
const imagPart = (c: number, root: 1 | 3) => mul(c, root === 1 ? "i" : "i√3");

const NATURE = "قائم ومتساوي الساقين في C";

export const complexProblems: ProblemGenerator[] = [
  {
    id: "quadratic-triangle",
    title: "معادلة من الدرجة الثانية وطبيعة مثلث",
    generate(rng: Rng) {
      const p = rng.nonZero(-4, 4);
      const q = rng.int(1, 4);
      let d = q * rng.pick([1, -1]); // z_A − z_C = d + qi
      if (p === d) d = -d; // keep C away from O
      const c = p - d;
      const b = -2 * p;
      const k = p * p + q * q;
      const delta = -4 * q * q;
      const equation = `${poly([[2, 1], [1, b], [0, k]], "z")} = 0`;
      const sign = d > 0 ? 1 : -1; // L = sign·i
      const L = sign > 0 ? "i" : "−i";
      const angle = sign > 0 ? "π/2" : "−π/2";
      return {
        statement: [
          `1) نعتبر في مجموعة الأعداد المركبة ℂ المعادلة (E): ${equation}`,
          "2) في المستوي المركب المنسوب إلى معلم متعامد ومتجانس (O ; u⃗ , v⃗) نعتبر النقاط A و B و C حيث:",
          `z_A حل المعادلة (E) الذي جزؤه التخيلي موجب، z_B = z̄_A، و z_C = ${num(c)}.`,
        ].join("\n"),
        parts: [
          {
            skill: "quadratic_equation",
            difficulty: 1,
            type: "short",
            prompt: "احسب مميز المعادلة (E).",
            answer: num(delta),
            steps: [
              `Δ = b² − 4ac مع a = 1 و b = ${num(b)} و c = ${k}`,
              `Δ = ${paren(num(b))}² − 4 × ${k} = ${b * b} − ${4 * k} = ${num(delta)}`,
              "Δ < 0، إذن للمعادلة (E) حلان مركبان مترافقان",
            ],
          },
          {
            skill: "quadratic_equation",
            difficulty: 2,
            type: "short",
            prompt: "حل في ℂ المعادلة (E)، ثم اكتب z_A على الشكل الجبري.",
            answer: cx(p, q),
            steps: [
              `Δ = ${num(delta)} = (${mul(2 * q, "i")})²`,
              `z = (${num(-b)} ± ${mul(2 * q, "i")})/2، أي z₁ = ${cx(p, -q)} و z₂ = ${cx(p, q)}`,
              `الحل ذو الجزء التخيلي الموجب: z_A = ${cx(p, q)}، ومنه z_B = ${cx(p, -q)}`,
            ],
          },
          {
            skill: "geometry",
            difficulty: 1,
            type: "short",
            prompt: "اكتب على الشكل الجبري لاحقة الشعاع CA⃗.",
            answer: cx(d, q),
            steps: [
              "لاحقة الشعاع CA⃗ هي z_A − z_C",
              `z_A − z_C = ${paren(cx(p, q))} − ${paren(num(c))} = ${cx(d, q)}`,
            ],
          },
          {
            skill: "conjugate_modulus",
            difficulty: 2,
            type: "short",
            prompt: "احسب المسافة CA.",
            answer: sqrtText(2 * q * q),
            steps: [
              "CA = |z_A − z_C|",
              `CA = √(${paren(num(d))}² + ${q}²) = √${2 * q * q}${q === 1 ? "" : ` = ${sqrtText(2 * q * q)}`}`,
              `وبنفس الطريقة z_B − z_C = ${cx(d, -q)} مرافق z_A − z_C، فـ CB = CA`,
            ],
          },
          {
            skill: "quotient",
            difficulty: 3,
            type: "short",
            prompt: "اكتب على الشكل الجبري العدد L = (z_A − z_C)/(z_B − z_C).",
            answer: L,
            steps: [
              `L = ${paren(cx(d, q))}/${paren(cx(d, -q))}`,
              `نضرب البسط والمقام في مرافق المقام ${cx(d, q)}`,
              `المقام: ${d * d} + ${q * q} = ${2 * q * q}`,
              `البسط: ${paren(cx(d, q))}² = ${join(num(d * d), mul(2 * d * q, "i"), num(-q * q))} = ${mul(2 * d * q, "i")}`,
              `L = ${paren(mul(2 * d * q, "i"))}/${2 * q * q} = ${L}`,
            ],
          },
          {
            skill: "geometry",
            difficulty: 3,
            type: "mcq",
            prompt: "استنتج طبيعة المثلث ABC:",
            answer: NATURE,
            distractors: [
              { option: "متقايس الأضلاع", misconception: "triangle_nature_argument" },
              { option: "قائم في C وغير متساوي الساقين", misconception: "triangle_nature_modulus" },
              { option: "متساوي الساقين في C وغير قائم", misconception: "triangle_nature_argument" },
            ],
            steps: [
              `L = ${L}، إذن |L| = 1 و arg(L) = ${angle}`,
              "|L| = CA/CB = 1 يعني CA = CB",
              `arg(L) = (CB⃗ ; CA⃗) = ${angle} يعني أن الزاوية في C قائمة`,
              `إذن المثلث ABC ${NATURE}`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "exponential-rotation",
    title: "الشكل الأسي، القوى والدوران",
    generate(rng: Rng) {
      // A remarkable z_A of modulus 2 or √2, reference angle π/6, π/4 or π/3.
      const q = rng.pick([6, 4, 3] as const);
      const sx = rng.pick([1, -1]);
      const sy = rng.pick([1, -1]);
      const re = { c: sx, root: (q === 6 ? 3 : 1) as 1 | 3 };
      const im = { c: sy, root: (q === 3 ? 3 : 1) as 1 | 3 };
      const zA = join(realPart(re.c, re.root), imagPart(im.c, im.root));
      const modulus = q === 4 ? "√2" : "2";
      const modulusSquared = q === 4 ? 2 : 4;
      const p = sx > 0 ? (sy > 0 ? 1 : -1) : sy > 0 ? q - 1 : -(q - 1);
      const cosText = `${sx < 0 ? "−" : ""}${q === 6 ? "√3/2" : q === 4 ? "√2/2" : "1/2"}`;
      const sinText = `${sy < 0 ? "−" : ""}${q === 6 ? "1/2" : q === 4 ? "√2/2" : "√3/2"}`;
      const arg = piText(p, q);
      const exp = expForm(modulus, p, q);
      // z_A^q = r^q·e^(ipπ) = r^q·(−1)^p.
      const rq = q === 4 ? 4 : 2 ** q;
      const power = p % 2 === 0 ? rq : -rq;
      // Smallest n ≥ 1 with nθ ≡ 0 (mod 2π): n = q if p even, 2q if p odd.
      const smallest = p % 2 === 0 ? q : 2 * q;
      // Rotation of centre O and angle ±π/2: z_B = ±i·z_A.
      const turn = rng.pick([1, -1]);
      const zB = join(realPart(-turn * im.c, im.root), imagPart(turn * re.c, re.root));
      const opposite = p > 0 ? p - q : p + q;
      return {
        statement: [
          `نعتبر العدد المركب z_A = ${zA} و A النقطة التي لاحقتها z_A في المستوي المركب المنسوب إلى معلم متعامد ومتجانس (O ; u⃗ , v⃗).`,
          `ليكن r الدوران الذي مركزه O وزاويته ${turn > 0 ? "π/2" : "−π/2"}، و B صورة A بالدوران r.`,
        ].join("\n"),
        parts: [
          {
            skill: "conjugate_modulus",
            difficulty: 1,
            type: "short",
            prompt: "احسب طويلة العدد z_A.",
            answer: modulus,
            steps: [`|z_A| = √(a² + b²) = √${modulusSquared}${modulusSquared === 2 ? "" : ` = ${modulus}`}`],
          },
          {
            skill: "trig_exponential_form",
            difficulty: 2,
            type: "short",
            prompt: "عيّن عمدة العدد z_A في المجال ]−π ; π].",
            answer: arg,
            steps: [
              `cos θ = a/|z_A| = ${cosText} و sin θ = b/|z_A| = ${sinText}`,
              `إشارتا cos θ و sin θ تحددان الربع، إذن arg(z_A) = ${arg}`,
            ],
          },
          {
            skill: "trig_exponential_form",
            difficulty: 2,
            type: "mcq",
            prompt: "الشكل الأسي للعدد z_A هو:",
            answer: exp,
            distractors: [
              { option: expForm(num(modulusSquared), p, q), misconception: "modulus_no_sqrt" },
              { option: expForm(modulus, -p, q), misconception: "argument_quadrant" },
              { option: expForm(modulus, opposite, q), misconception: "argument_quadrant" },
            ],
            steps: [`z_A = |z_A|·e^(iθ) مع |z_A| = ${modulus} و θ = ${arg}`, `z_A = ${exp}`],
          },
          {
            skill: "trig_exponential_form",
            difficulty: 2,
            type: "short",
            prompt: `احسب (z_A)${q === 6 ? "⁶" : q === 4 ? "⁴" : "³"} (أعط النتيجة على الشكل الجبري).`,
            answer: num(power),
            steps: [
              `(z_A)${sup(q)} = ${modulus.includes("√") ? `(${modulus})` : modulus}${sup(q)}·e^(i·${q}·${paren(arg)}) = ${rq}·e^(i·${paren(piText(p, 1))})`,
              `e^(i·${paren(piText(p, 1))}) = cos(${piText(p, 1)}) + i sin(${piText(p, 1)}) = ${p % 2 === 0 ? "1" : "−1"}`,
              `(z_A)${sup(q)} = ${num(power)}`,
            ],
          },
          {
            skill: "geometry",
            difficulty: 2,
            type: "short",
            prompt: "اكتب على الشكل الجبري لاحقة النقطة B.",
            answer: zB,
            steps: [
              `العبارة المركبة للدوران r: z′ = e^(${turn > 0 ? "" : "−"}iπ/2)·z = ${turn > 0 ? "i" : "−i"}·z`,
              `z_B = ${turn > 0 ? "i" : "−i"}${paren(zA)}`,
              `z_B = ${zB}`,
            ],
          },
          {
            skill: "trig_exponential_form",
            difficulty: 3,
            type: "short",
            prompt: "عيّن أصغر عدد طبيعي غير معدوم n يكون من أجله (z_A)ⁿ عدداً حقيقياً موجباً.",
            answer: num(smallest),
            steps: [
              `(z_A)ⁿ = ${modulus.includes("√") ? `(${modulus})` : modulus}ⁿ·e^(i·n·${paren(arg)})`,
              `(z_A)ⁿ حقيقي موجب ⇔ n × ${paren(arg)} = 2kπ (k ∈ ℤ) ⇔ ${p % 2 === 0 ? `n = ${q}k′` : `${mul(Math.abs(p), "n")} = ${2 * q}k`}`,
              p % 2 === 0
                ? `من السؤال السابق (z_A)${sup(q)} = ${num(power)} > 0، وأي n أصغر لا يعطي مضاعفاً لـ 2π`
                : `${Math.abs(p)} و ${2 * q} أوليان فيما بينهما، إذن n مضاعف لـ ${2 * q} (لاحظ أن (z_A)${sup(q)} = ${num(power)} < 0)`,
              `أصغر قيمة: n = ${smallest}`,
            ],
          },
        ],
      };
    },
  },
];
