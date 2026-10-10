// BAC lesson "الموافقات والحساب" (Algerian curriculum): Euclidean division in ℤ,
// congruences, remainders of powers, divisibility, PGCD and ax + by = c.
// Remainders, periods and last digits are typed integers; the case of n
// (n = pk + j) and the general solution of an equation are mcq.
import type { Lesson } from "../curriculum";
import { answersMatch } from "../grading";
import { expressionsEquivalent } from "../mathExpr";
import { join, mul, num, poly, sup, type Generator, type Rng } from "../generators/core";
import { arithmeticProblems, caseForm, cycleLines, divLine, mod, modPow, order } from "./arithmeticProblems";

/** Re-draws until `valid` holds — keeps generators free of degenerate cases. */
function draw<T>(rng: Rng, make: (rng: Rng) => T, valid: (value: T) => boolean): T {
  for (let attempt = 0; attempt < 500; attempt += 1) {
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

const coprime = (a: number, b: number) => {
  while (b) [a, b] = [b, a % b];
  return a === 1;
};

/** A negative number between parentheses: "(−9)", "4". */
const p_ = (value: number) => (value < 0 ? `(${num(value)})` : num(value));

/** Euclid's algorithm, one line per division. */
function euclidLines(a: number, b: number): string[] {
  const lines: string[] = [];
  for (let [u, v] = [a, b]; v; [u, v] = [v, u % v]) lines.push(divLine(u, v, Math.floor(u / v), u % v));
  return lines;
}

/** a ≡ b [n] */
const cong = (a: number | string, b: number | string, n: number) =>
  `${typeof a === "number" ? num(a) : a} ≡ ${typeof b === "number" ? num(b) : b} [${n}]`;

/** Bases a modulo m (coprime) with a period of at most 6. */
const PAIRS: Array<readonly [number, number]> = [
  [2, 5], [3, 5], [2, 7], [3, 7], [4, 7], [5, 7], [2, 9], [4, 9], [5, 9], [7, 9],
  [3, 11], [4, 11], [5, 11], [9, 11], [3, 13], [4, 13], [5, 13], [8, 13], [9, 13], [10, 13],
];
const LONG_PAIRS = PAIRS.filter(([a, m]) => order(a, m) >= 3);
/** Even periods: −1 is a power of a, so aⁿ ≡ c and aⁿ ≡ −c both have solutions. */
const EVEN_PAIRS = PAIRS.filter(([a, m]) => order(a, m) % 2 === 0 && order(a, m) >= 4);

/** Writes aᴺ ≡ aˢ [m] from the period p. */
function bigPowerSteps(a: number, N: number, m: number, base = a): string[] {
  const p = order(a, m);
  const q = Math.floor(N / p);
  const s = N % p;
  const value = modPow(a, N, m);
  return [
    `${a}${sup(p)} ≡ 1 [${m}] (الدور ${p})`,
    divLine(N, p, q, s),
    s === 0
      ? `${base}${sup(N)} ≡ (${a}${sup(p)})${sup(q)} ≡ 1 [${m}]`
      : `${base}${sup(N)} ≡ (${a}${sup(p)})${sup(q)} × ${a}${sup(s)} ≡ ${a}${sup(s)} ≡ ${value} [${m}]`,
  ];
}

const generators: Generator[] = [
  // ------------------------------------------------------ Euclidean division
  {
    id: "euclid-positive",
    skill: "euclid_division",
    difficulty: 1,
    generate: rng => {
      const a = rng.int(100, 2500);
      const b = rng.int(3, 19);
      const q = Math.floor(a / b);
      const r = a % b;
      const askRemainder = rng.chance(0.6);
      return {
        type: "short",
        prompt: `احسب ${askRemainder ? "باقي" : "حاصل"} القسمة الإقليدية للعدد ${a} على ${b}.`,
        answer: String(askRemainder ? r : q),
        steps: [
          `${b} × ${q} = ${b * q} و ${b} × ${q + 1} = ${b * (q + 1)}، و ${b * q} ≤ ${a} < ${b * (q + 1)}`,
          `${divLine(a, b, q, r)} مع 0 ≤ ${r} < ${b}`,
          askRemainder ? `الباقي هو ${r}` : `حاصل القسمة هو ${q}`,
        ],
      };
    },
  },
  {
    id: "euclid-negative-remainder",
    skill: "euclid_division",
    difficulty: 2,
    generate: rng => {
      const [A, b] = draw(
        rng,
        g => [g.int(20, 300), g.int(3, 12)] as const,
        ([A, b]) => {
          const r1 = A % b;
          const q = -(Math.floor(A / b) + 1);
          return r1 !== 0 && allDifferent(num(b - r1), num(-r1), num(r1), num(q));
        }
      );
      const k = Math.floor(A / b);
      const r1 = A % b;
      const q = -(k + 1);
      const r = b - r1;
      return {
        type: "mcq",
        prompt: `ما باقي القسمة الإقليدية للعدد ${num(-A)} على ${b}؟`,
        answer: num(r),
        distractors: [
          { option: num(-r1), misconception: "negative_remainder" },
          { option: num(r1), misconception: "neg_dividend_sign" },
          { option: num(q), misconception: "remainder_quotient_swap" },
        ],
        steps: [
          `${A} = ${b} × ${k} + ${r1} إذن ${num(-A)} = ${b} × ${p_(-k)} − ${r1}`,
          `الباقي لا يكون سالباً: نطرح ${b} من الحاصل ونضيفه إلى الباقي`,
          `${num(-A)} = ${b} × ${p_(q)} + ${r} مع 0 ≤ ${r} < ${b}، إذن الباقي ${r}`,
        ],
      };
    },
  },
  {
    id: "euclid-negative-quotient",
    skill: "euclid_division",
    difficulty: 3,
    generate: rng => {
      const A = rng.int(30, 999);
      const b = rng.int(4, 25);
      const q = Math.floor(-A / b);
      const r = -A - b * q;
      return {
        type: "short",
        prompt: `اكتب القسمة الإقليدية للعدد ${num(-A)} على ${b} على الشكل ${num(-A)} = ${b}q + r مع 0 ≤ r < ${b}. ما قيمة q؟`,
        answer: num(q),
        steps: [
          divLine(A, b, Math.floor(A / b), A % b),
          r === 0
            ? `الباقي معدوم إذن ${num(-A)} = ${b} × ${p_(q)}`
            : `${num(-A)} = ${b} × ${p_(-Math.floor(A / b))} − ${A % b} = ${b} × ${p_(q)} + ${r}`,
          `0 ≤ ${r} < ${b} إذن q = ${num(q)}`,
        ],
      };
    },
  },
  // ------------------------------------------------------------ congruences
  {
    id: "congruence-reduce",
    skill: "congruence_def",
    difficulty: 1,
    generate: rng => {
      const a = rng.chance(0.3) ? -rng.int(5, 300) : rng.int(30, 3000);
      const n = rng.int(3, 13);
      const r = mod(a, n);
      const q = (a - r) / n;
      return {
        type: "short",
        prompt: `عيّن العدد الطبيعي r حيث 0 ≤ r < ${n} و ${cong(a, "r", n)}.`,
        answer: String(r),
        steps: [
          `${divLine(a, n, q, r)} مع 0 ≤ ${r} < ${n}`,
          r === 0 ? `${num(a)} مضاعف لـ ${n}` : `${num(a)} − ${r} = ${num(a - r)} مضاعف لـ ${n}`,
          `إذن ${cong(a, r, n)} و r = ${r}`,
        ],
      };
    },
  },
  {
    id: "congruence-negative-mcq",
    skill: "congruence_def",
    difficulty: 1,
    generate: rng => {
      const [A, n] = draw(
        rng,
        g => [g.int(3, 99), g.int(3, 12)] as const,
        ([A, n]) => A % n !== 0 && allDifferent(num(mod(-A, n)), num(-(A % n)), num(A % n), num(mod(-A, n) + n))
      );
      const r = mod(-A, n);
      const k = (r + A) / n;
      return {
        type: "mcq",
        prompt: `ما العدد الطبيعي r الأصغر من ${n} الذي يحقق ${cong(-A, "r", n)}؟`,
        answer: num(r),
        distractors: [
          { option: num(-(A % n)), misconception: "negative_remainder" },
          { option: num(A % n), misconception: "neg_dividend_sign" },
          { option: num(r + n), misconception: "remainder_too_big" },
        ],
        steps: [
          `نضيف إلى ${num(-A)} مضاعفاً لـ ${n}: ${num(-A)} + ${n * k} = ${r}`,
          `${n * k} = ${n} × ${k} مضاعف لـ ${n}، إذن ${cong(-A, r, n)}`,
          `و 0 ≤ ${r} < ${n} إذن r = ${r}`,
        ],
      };
    },
  },
  {
    id: "congruence-in-interval",
    skill: "congruence_def",
    difficulty: 2,
    generate: rng => {
      const n = rng.int(4, 15);
      const r = rng.int(0, n - 1);
      const given = r + n * rng.int(-1, 2);
      const A = rng.int(20, 400);
      const x = A + mod(r - A, n);
      return {
        type: "short",
        prompt: `عيّن العدد الصحيح x حيث ${A} ≤ x < ${A + n} و ${cong("x", given, n)}.`,
        answer: String(x),
        steps: [
          given === r ? `x ≡ ${r} [${n}] إذن x = ${join(`${n}k`, num(r))} مع k ∈ ℤ` : `${num(given)} ≡ ${r} [${n}] إذن x = ${join(`${n}k`, num(r))} مع k ∈ ℤ`,
          divLine(A, n, Math.floor(A / n), A % n),
          `بين ${A} و ${A + n - 1} يوجد عدد وحيد باقيه ${r}: x = ${n} × ${(x - r) / n}${r ? ` + ${r}` : ""} = ${x}`,
        ],
      };
    },
  },
  // -------------------------------------------------- operations on congruences
  {
    id: "congruence-sum-product",
    skill: "congruence_ops",
    difficulty: 1,
    generate: rng => {
      const n = rng.int(4, 13);
      const [a, b] = draw(
        rng,
        g => [g.int(50, 999), g.int(20, 999)] as const,
        ([a, b]) => b < a && a % n !== 0 && b % n !== 0
      );
      const op = rng.pick(["+", "×", "−"] as const);
      const [ra, rb] = [a % n, b % n];
      const raw = op === "+" ? ra + rb : op === "×" ? ra * rb : ra - rb;
      const answer = mod(raw, n);
      return {
        type: "short",
        prompt: `دون حساب العدد ${a} ${op} ${b}، عيّن باقي قسمته الإقليدية على ${n}.`,
        answer: String(answer),
        steps: [
          `${cong(a, ra, n)} و ${cong(b, rb, n)}`,
          `${a} ${op} ${b} ≡ ${ra} ${op} ${rb} ≡ ${num(raw)} [${n}]`,
          raw === answer ? `الباقي هو ${answer}` : `${cong(raw, answer, n)} إذن الباقي هو ${answer}`,
        ],
      };
    },
  },
  {
    id: "congruence-polynomial",
    skill: "congruence_ops",
    difficulty: 2,
    generate: rng => {
      const [n, r, k, m] = draw(
        rng,
        g => [g.int(5, 13), g.int(2, 12), g.int(2, 6), g.int(1, 9)] as const,
        ([n, r, k, m]) =>
          r < n &&
          k * r * r + m >= n &&
          allDifferent(
            num(mod(k * r * r + m, n)),
            num(k * r * r + m),
            num(mod(2 * k * r + m, n)),
            num(mod(k + r * r + m, n))
          )
      );
      const raw = k * r * r + m;
      const answer = mod(raw, n);
      return {
        type: "mcq",
        prompt: `x عدد صحيح يحقق ${cong("x", r, n)}. ما باقي قسمة ${poly([[2, k], [0, m]])} على ${n}؟`,
        answer: num(answer),
        distractors: [
          { option: num(raw), misconception: "remainder_too_big" },
          { option: num(mod(2 * k * r + m, n)), misconception: "power_as_product" },
          { option: num(mod(k + r * r + m, n)), misconception: "product_as_sum" },
        ],
        steps: [
          `${cong("x", r, n)} إذن ${cong("x²", r * r, n)}`,
          `${poly([[2, k], [0, m]])} ≡ ${k} × ${r * r} + ${m} ≡ ${raw} [${n}]`,
          `${divLine(raw, n, Math.floor(raw / n), answer)} إذن الباقي ${answer}`,
        ],
      };
    },
  },
  {
    id: "congruence-power-sum",
    skill: "congruence_ops",
    difficulty: 3,
    generate: rng => {
      const n = rng.pick([7, 9, 11, 13]);
      const A = rng.int(1000, 9999);
      const B = rng.int(100, 999);
      const k = rng.pick([2, 3, 4]);
      const ra = A % n;
      const rb = B % n;
      const power = modPow(ra, k, n);
      const answer = mod(power + rb, n);
      return {
        type: "short",
        prompt: `ما باقي القسمة الإقليدية للعدد ${A}${sup(k)} + ${B} على ${n}؟`,
        answer: String(answer),
        steps: [
          `${cong(A, ra, n)} إذن ${cong(`${A}${sup(k)}`, `${ra}${sup(k)}`, n)} و ${ra}${sup(k)} = ${ra ** k} ≡ ${power} [${n}]`,
          `${cong(B, rb, n)}`,
          `${A}${sup(k)} + ${B} ≡ ${join(String(power), String(rb))} ≡ ${answer} [${n}]`,
        ],
      };
    },
  },
  // ------------------------------------------------------ remainders of powers
  {
    id: "power-period",
    skill: "power_remainders",
    difficulty: 1,
    generate: rng => {
      const [a, n] = rng.pick(PAIRS);
      const base = rng.chance(0.4) ? a + n * rng.int(1, 4) : a;
      const p = order(a, n);
      return {
        type: "short",
        prompt: `عيّن أصغر عدد طبيعي غير معدوم p يحقق ${cong(`${base}ᵖ`, 1, n)}.`,
        answer: String(p),
        steps: [
          ...(base === a ? [] : [`${cong(base, a, n)} فندرس قوى ${a}`]),
          ...cycleLines(a, n).slice(1),
          `أول قوة غير معدومة توافق 1 هي القوة ${p}، إذن p = ${p}`,
        ],
      };
    },
  },
  {
    id: "power-big-remainder",
    skill: "power_remainders",
    difficulty: 2,
    generate: rng => {
      const [a, n] = rng.pick(PAIRS);
      const N = rng.int(100, 2100);
      return {
        type: "short",
        prompt: `ما باقي القسمة الإقليدية للعدد ${a}${sup(N)} على ${n}؟`,
        answer: String(modPow(a, N, n)),
        steps: [...bigPowerSteps(a, N, n), `الباقي هو ${modPow(a, N, n)}`],
      };
    },
  },
  {
    id: "power-case-mcq",
    skill: "power_remainders",
    difficulty: 2,
    generate: rng => {
      const [[a, m], j] = draw(
        rng,
        g => [g.pick(LONG_PAIRS), g.int(0, 5)] as const,
        ([[a, m], j]) => {
          const p = order(a, m);
          return (
            j < p &&
            allDifferent(
              num(modPow(a, j, m)),
              num(modPow(a, (j + 1) % p, m)),
              num(mod(a * j, m)),
              num(j)
            )
          );
        }
      );
      const p = order(a, m);
      const answer = modPow(a, j, m);
      return {
        type: "mcq",
        prompt: `n عدد طبيعي يكتب n = ${caseForm(p, j)} حيث k عدد طبيعي، ونعلم أن ${cong(`${a}${sup(p)}`, 1, m)}. ما باقي قسمة ${a}ⁿ على ${m}؟`,
        answer: num(answer),
        distractors: [
          { option: num(modPow(a, (j + 1) % p, m)), misconception: "cycle_index_shift" },
          { option: num(mod(a * j, m)), misconception: "power_as_product" },
          { option: num(j), misconception: "exponent_as_remainder" },
        ],
        steps: [
          j === 0 ? `${a}ⁿ = (${a}${sup(p)})ᵏ` : `${a}ⁿ = (${a}${sup(p)})ᵏ × ${a}${sup(j)}`,
          `(${a}${sup(p)})ᵏ ≡ 1ᵏ ≡ 1 [${m}]`,
          j === 0 ? `إذن ${cong(`${a}ⁿ`, 1, m)}` : `إذن ${cong(`${a}ⁿ`, `${a}${sup(j)}`, m)} أي الباقي ${answer}`,
        ],
      };
    },
  },
  {
    id: "power-big-base-mcq",
    skill: "power_remainders",
    difficulty: 3,
    generate: rng => {
      const [[a, m], t, N] = draw(
        rng,
        g => [g.pick(LONG_PAIRS), g.int(80, 300), g.int(100, 2100)] as const,
        ([[a, m], t, N]) => {
          const p = order(a, m);
          return (
            allDifferent(
              num(modPow(a, N, m)),
              num(modPow(a, N % m, m)),
              num(modPow(a, (N % p) + 1, m)),
              num(mod(a * N, m))
            ) && a + m * t > 1000
          );
        }
      );
      const B = a + m * t;
      const p = order(a, m);
      const answer = modPow(a, N, m);
      return {
        type: "mcq",
        prompt: `ما باقي القسمة الإقليدية للعدد ${B}${sup(N)} على ${m}؟`,
        answer: num(answer),
        distractors: [
          { option: num(modPow(a, N % m, m)), misconception: "exponent_mod_n" },
          { option: num(modPow(a, (N % p) + 1, m)), misconception: "cycle_index_shift" },
          { option: num(mod(a * N, m)), misconception: "power_as_product" },
        ],
        steps: [
          `${B} = ${m} × ${t} + ${a} إذن ${cong(B, a, m)} و ${cong(`${B}${sup(N)}`, `${a}${sup(N)}`, m)}`,
          ...bigPowerSteps(a, N, m, B),
          `الباقي هو ${answer}`,
        ],
      };
    },
  },
  // --------------------------------------------------------------- divisibility
  {
    id: "last-digit",
    skill: "divisibility",
    difficulty: 1,
    generate: rng => {
      const u = rng.pick([2, 3, 4, 7, 8, 9]);
      const b = u + 10 * rng.int(0, 9);
      const N = rng.int(50, 2100);
      const p = u === 4 || u === 9 ? 2 : 4;
      const s = N % p;
      const answer = modPow(u, N, 10);
      return {
        type: "short",
        prompt: `ما رقم آحاد العدد ${b}${sup(N)}؟`,
        answer: String(answer),
        steps: [
          `رقم الآحاد هو الباقي بترديد 10، و ${cong(b, u, 10)}`,
          `${cong(`${u}${sup(p)}`, 1, 10)} لأن ${u}${sup(p)} = ${u ** p}`,
          `${divLine(N, p, Math.floor(N / p), s)} إذن ${cong(`${b}${sup(N)}`, s === 0 ? 1 : `${u}${sup(s)}`, 10)}`,
          `رقم الآحاد هو ${answer}`,
        ],
      };
    },
  },
  {
    id: "divisible-set-mcq",
    skill: "divisibility",
    difficulty: 2,
    generate: rng => {
      const [a, m] = rng.pick(EVEN_PAIRS);
      const p = order(a, m);
      const j = rng.int(0, p - 1);
      const c = mod(-modPow(a, j, m), m);
      const sign = (j + p / 2) % p;
      const form = (period: number, rest: number) => `n = ${caseForm(period, rest)}`;
      return {
        type: "mcq",
        prompt: `عيّن قيم العدد الطبيعي n التي يكون من أجلها العدد ${a}ⁿ + ${c} قابلاً للقسمة على ${m}، حيث k عدد طبيعي.`,
        answer: form(p, j),
        distractors: [
          { option: form(m, j), misconception: "period_is_modulus" },
          { option: form(p, (j + 1) % p), misconception: "cycle_index_shift" },
          { option: form(p, sign), misconception: "divisible_sign" },
        ],
        steps: [
          `${m} يقسم ${a}ⁿ + ${c} يعني ${cong(`${a}ⁿ`, -c, m)} أي ${cong(`${a}ⁿ`, modPow(a, j, m), m)}`,
          `بواقي ${a}ⁿ تتكرر بدور ${p}: ${cycleLines(a, m).slice(0, p).join("، ")}`,
          `الباقي ${modPow(a, j, m)} يظهر فقط لما n ≡ ${j} [${p}]، إذن ${form(p, j)}`,
        ],
      };
    },
  },
  {
    id: "divisible-smallest",
    skill: "divisibility",
    difficulty: 3,
    generate: rng => {
      const [a, m] = rng.pick(PAIRS);
      const p = order(a, m);
      const j = rng.int(0, p - 1);
      const c = mod(-modPow(a, j, m), m);
      const N0 = rng.int(10, 60);
      const n = N0 + mod(j - N0, p);
      return {
        type: "short",
        prompt: `عيّن أصغر عدد طبيعي n يحقق n ≥ ${N0} ويكون من أجله ${m} يقسم ${a}ⁿ + ${c}.`,
        answer: String(n),
        steps: [
          `${m} يقسم ${a}ⁿ + ${c} يعني ${cong(`${a}ⁿ`, modPow(a, j, m), m)}`,
          `الدور ${p} و ${cong(`${a}${sup(j)}`, modPow(a, j, m), m)}، إذن n = ${caseForm(p, j)} مع k ∈ ℕ`,
          `أصغر عدد من هذا الشكل لا يقل عن ${N0} هو ${n}`,
        ],
      };
    },
  },
  // ------------------------------------------------------- PGCD and Bézout
  {
    id: "gcd-euclid",
    skill: "gcd_bezout",
    difficulty: 1,
    generate: rng => {
      const [d, a, b] = draw(
        rng,
        g => [g.int(2, 15), g.int(3, 30), g.int(2, 29)] as const,
        ([, a, b]) => a > b && coprime(a, b)
      );
      return {
        type: "short",
        prompt: `احسب PGCD(${d * a} ; ${d * b}) باستعمال خوارزمية إقليدس.`,
        answer: String(d),
        steps: [...euclidLines(d * a, d * b), `آخر باقٍ غير معدوم هو ${d}، إذن PGCD(${d * a} ; ${d * b}) = ${d}`],
      };
    },
  },
  {
    id: "general-solution-mcq",
    skill: "gcd_bezout",
    difficulty: 2,
    generate: rng => {
      const [d, a, b, x0, y0] = draw(
        rng,
        g => [g.int(2, 4), g.int(2, 9), g.int(2, 9), g.int(-4, 5), g.int(-4, 5)] as const,
        ([d, a, b, x0, y0]) => a !== b && coprime(a, b) && d * (a * x0 + b * y0) > 0
      );
      const [A, B, C] = [d * a, d * b, d * (a * x0 + b * y0)];
      const sol = (dx: number, dy: number) => `x = ${join(num(x0), mul(dx, "k"))} و y = ${join(num(y0), mul(dy, "k"))}`;
      return {
        type: "mcq",
        prompt: `نعتبر في ℤ² المعادلة ${A}x + ${B}y = ${C}. الثنائية (${num(x0)} ; ${num(y0)}) حل خاص لها. ما حلولها حيث k ∈ ℤ؟`,
        answer: sol(b, -a),
        distractors: [
          { option: sol(b, a), misconception: "general_solution_sign" },
          { option: sol(B, -A), misconception: "general_solution_undivided" },
          { option: sol(a, -b), misconception: "general_solution_swap" },
        ],
        steps: [
          `PGCD(${A} ; ${B}) = ${d}: نقسم على ${d} فنجد ${a}x + ${b}y = ${a * x0 + b * y0}`,
          `بالطرح من ${a} × ${p_(x0)} + ${b} × ${p_(y0)} = ${a * x0 + b * y0}: ${a}(${join("x", num(-x0))}) = −${b}(${join("y", num(-y0))})`,
          `PGCD(${a} ; ${b}) = 1 فحسب مبرهنة غوص ${b} يقسم ${join("x", num(-x0))}: x = ${join(num(x0), `${b}k`)}`,
          `بالتعويض: ${sol(b, -a)}`,
        ],
      };
    },
  },
  {
    id: "smallest-natural-solution",
    skill: "gcd_bezout",
    difficulty: 3,
    generate: rng => {
      const [d, a, b, x0, y0] = draw(
        rng,
        g => [g.int(1, 3), g.int(2, 11), g.int(3, 11), g.int(-6, 9), g.int(-6, 9)] as const,
        ([d, a, b, x0, y0]) => a !== b && coprime(a, b) && d * (a * x0 + b * y0) > 0
      );
      const c = a * x0 + b * y0;
      const [A, B, C] = [d * a, d * b, d * c];
      const x = mod(x0, b);
      const y = (c - a * x) / b;
      return {
        type: "short",
        prompt: `عيّن أصغر عدد طبيعي x يكون من أجله (x ; y) حلاً للمعادلة ${A}x + ${B}y = ${C} مع y عدد صحيح.`,
        answer: String(x),
        steps: [
          d === 1 ? `PGCD(${A} ; ${B}) = 1` : `PGCD(${A} ; ${B}) = ${d}: المعادلة تكافئ ${a}x + ${b}y = ${c}`,
          `${a}x + ${b}y = ${c} تعطي ${cong(`${a}x`, c, b)}`,
          `الحل الخاص (${num(x0)} ; ${num(y0)}) يعطي x = ${join(num(x0), `${b}k`)} مع k ∈ ℤ، أي ${cong("x", x, b)}`,
          `أصغر عدد طبيعي هو x = ${x} ومعه y = ${num(y)}`,
        ],
      };
    },
  },
];

export const arithmeticLesson: Lesson = {
  key: "math-arithmetic",
  curriculum: "dz",
  subject: "math",
  title: "الموافقات والحساب",
  levels: ["bac"],
  skills: [
    {
      key: "euclid_division",
      name: "القسمة الإقليدية في ℤ",
      prerequisites: [],
      explanation:
        "من أجل كل عدد صحيح a وكل عدد طبيعي غير معدوم b توجد ثنائية وحيدة (q ; r) من الأعداد الصحيحة بحيث a = bq + r و 0 ≤ r < b. نسمي q حاصل القسمة و r الباقي. الباقي موجب دائماً، حتى لما يكون a سالباً: نختار q بحيث يكون bq أصغر من a أو يساويه.",
      example: {
        problem: "عيّن حاصل وباقي القسمة الإقليدية للعدد −47 على 5.",
        steps: [
          "47 = 5 × 9 + 2 إذن −47 = 5 × (−9) − 2، والباقي −2 سالب فلا يصلح",
          "نأخذ q = −10: 5 × (−10) = −50 ≤ −47",
          "−47 = 5 × (−10) + 3 مع 0 ≤ 3 < 5",
        ],
        answer: "q = −10 و r = 3",
      },
      dialogue: {
        opening: "عندك 47 حبة تمر توزعها بالتساوي على 5 أطفال، وما يبقى تحتفظ به لنفسك.",
        steps: [
          {
            ask: "كم حبة يأخذ كل طفل؟",
            answer: "9",
            hint: "ابحث عن أكبر عدد إذا ضربته في عدد الأطفال لم يتجاوز ما عندك.",
          },
          {
            ask: "وكم حبة تبقى عندك؟",
            answer: "2",
            hint: "اطرح من العدد الكلي ما أخذه الأطفال جميعاً.",
            then: "إذن 47 = 5 × 9 + 2، والباقي أصغر من عدد الأطفال.",
          },
          {
            ask: "الآن نقسم −47 على 5 ونكتب −47 = 5q + r مع 0 ≤ r < 5. لو أخذنا q = −9 لوجدنا r = −2 وهو سالب. ما القيمة الصحيحة لـ q؟",
            answer: "−10",
            hint: "الباقي يجب أن يكون موجباً: اجعل الجداء 5q أصغر قليلاً من العدد المقسوم.",
          },
          {
            ask: "وما هو الباقي r إذن؟",
            answer: "3",
            hint: "احسب العدد المقسوم ناقص جداء القاسم في حاصل القسمة الجديد.",
            then: "لاحظ: باقي −47 ليس −2 ولا 2.",
          },
        ],
        rule: "القسمة الإقليدية لعدد صحيح a على عدد طبيعي غير معدوم b: a = bq + r مع 0 ≤ r < b، والثنائية (q ; r) وحيدة. الباقي لا يكون سالباً أبداً: إذا كان a سالباً ننقص الحاصل بواحد ونضيف b إلى الباقي.",
      },
    },
    {
      key: "congruence_def",
      name: "الموافقات بترديد n",
      prerequisites: ["euclid_division"],
      explanation:
        "n عدد طبيعي أكبر من 1. نقول إن a يوافق b بترديد n ونكتب a ≡ b [n] إذا كان لـ a و b نفس الباقي في القسمة على n، أي إذا كان n يقسم a − b. كل عدد صحيح a يوافق بترديد n عدداً وحيداً r حيث 0 ≤ r < n: هو باقي قسمة a على n.",
      example: {
        problem: "عيّن العدد الطبيعي r حيث 0 ≤ r < 7 و −23 ≡ r [7].",
        steps: ["−23 = 7 × (−4) + 5 مع 0 ≤ 5 < 7", "أو: −23 + 28 = 5 و 28 مضاعف لـ 7", "إذن −23 ≡ 5 [7]"],
        answer: "r = 5",
      },
      dialogue: {
        opening: "عقارب الساعة تعود إلى نفس الموضع كل 12 ساعة: الساعة تحسب بترديد 12.",
        steps: [
          {
            ask: "ما باقي قسمة 30 على 12؟",
            answer: "6",
            hint: "انزع من العدد أكبر عدد ممكن من الدورات الكاملة.",
          },
          {
            ask: "إذن بعد 30 ساعة يتقدم العقرب كأنه تقدّم 6 ساعات فقط. إذا كانت الساعة تشير الآن إلى 9، فإلى أي ساعة تشير بعد 30 ساعة؟",
            answer: "3",
            hint: "أضف التقدم الحقيقي إلى الساعة الحالية، ثم انزع دورة كاملة إن تجاوزت.",
          },
          {
            ask: "نقول إن 38 و 2 متوافقان بترديد 12 لأن لهما نفس الباقي. احسب الفرق 38 − 2.",
            answer: "36",
            hint: "اطرح العددين مباشرة.",
            then: "36 مضاعف لـ 12: هذا هو معنى الموافقة.",
          },
          {
            ask: "ما العدد الطبيعي r الأصغر من 7 بحيث 23 ≡ r [7]؟",
            answer: "2",
            hint: "اقسم على الترديد وخذ الباقي.",
          },
          {
            ask: "وللعدد السالب: ما العدد الطبيعي r الأصغر من 7 بحيث −3 ≡ r [7]؟",
            answer: "4",
            hint: "أضف الترديد إلى العدد السالب حتى يصير موجباً.",
          },
        ],
        rule: "a ≡ b [n] تعني أن لـ a و b نفس الباقي في القسمة على n، أي أن n يقسم a − b. وكل عدد صحيح يوافق بترديد n باقيه r حيث 0 ≤ r < n.",
      },
    },
    {
      key: "congruence_ops",
      name: "العمليات على الموافقات",
      prerequisites: ["congruence_def"],
      explanation:
        "إذا كان a ≡ b [n] و c ≡ d [n] فإن a + c ≡ b + d [n] و a − c ≡ b − d [n] و a × c ≡ b × d [n]، ومن أجل كل عدد طبيعي k: aᵏ ≡ bᵏ [n]. لحساب باقي عبارة كبيرة نعوّض كل عدد بباقيه، ثم نحسب ونختزل النتيجة بين 0 و n − 1.",
      example: {
        problem: "عيّن باقي قسمة 2027 × 1450 + 33 على 7.",
        steps: ["2027 ≡ 4 [7] و 1450 ≡ 1 [7] و 33 ≡ 5 [7]", "2027 × 1450 + 33 ≡ 4 × 1 + 5 ≡ 9 [7]", "9 ≡ 2 [7]"],
        answer: "الباقي 2",
      },
      dialogue: {
        opening: "نعرف أن 17 ≡ 2 [5] و 14 ≡ 4 [5]. هل نحتاج فعلاً إلى العددين الكبيرين لمعرفة البواقي؟",
        steps: [
          {
            ask: "اجمع البواقي 2 + 4 ثم خذ باقي المجموع في القسمة على 5. ماذا تجد؟",
            answer: "1",
            hint: "إذا تجاوز المجموع الترديد فاطرح الترديد منه.",
            then: "وتحقق: 17 + 14 = 31 وباقيه على 5 هو نفسه.",
          },
          {
            ask: "الآن الجداء: ما باقي قسمة 2 × 4 على 5؟",
            answer: "3",
            hint: "احسب الجداء ثم انزع منه مضاعفاً للترديد.",
          },
          {
            ask: "تحقق: 17 × 14 = 238. ما باقي قسمة 238 على 5؟",
            answer: "3",
            hint: "القسمة على خمسة تتعلق برقم الآحاد فقط.",
            then: "نفس النتيجة: يكفي ضرب البواقي.",
          },
          {
            ask: "وللقوى: 17 ≡ 2 [5] إذن 17³ ≡ 2³ [5]. ما باقي قسمة 17³ على 5؟",
            answer: "3",
            hint: "احسب مكعب الباقي ثم اختزله بالترديد.",
          },
        ],
        rule: "الموافقات بترديد n تحافظ على الجمع والطرح والضرب والقوى: إذا كان a ≡ b [n] و c ≡ d [n] فإن a + c ≡ b + d [n] و ac ≡ bd [n] و aᵏ ≡ bᵏ [n]. نعوّض كل عدد بباقيه ثم نحسب.",
      },
    },
    {
      key: "power_remainders",
      name: "بواقي قسمة قوى عدد طبيعي",
      prerequisites: ["congruence_ops"],
      explanation:
        "بواقي قسمة a⁰ و a¹ و a² … على n تتكرر. إذا كان p أصغر عدد طبيعي غير معدوم يحقق aᵖ ≡ 1 [n] (الدور)، نكتب N = pq + s مع 0 ≤ s < p فيكون aᴺ = (aᵖ)^q × aˢ ≡ aˢ [n]. وندرس بواقي aⁿ حسب الحالات n = pk و n = pk + 1 … و n = pk + p − 1.",
      example: {
        problem: "عيّن باقي قسمة 3²⁰²⁵ على 5.",
        steps: ["3¹ ≡ 3 و 3² ≡ 4 و 3³ ≡ 2 و 3⁴ ≡ 1 [5]: الدور 4", "2025 = 4 × 506 + 1", "3²⁰²⁵ = (3⁴)⁵⁰⁶ × 3 ≡ 1 × 3 ≡ 3 [5]"],
        answer: "الباقي 3",
      },
      dialogue: {
        opening: "نريد باقي قسمة 2²⁰²⁶ على 7. هذا العدد ضخم جداً، لكن بواقي قوى 2 تتكرر.",
        steps: [
          {
            ask: "ما باقي قسمة 2³ على 7؟",
            answer: "1",
            hint: "احسب المكعب ثم اطرح منه الترديد.",
          },
          {
            ask: "اكتب 2⁴ = 2³ × 2 واستعمل ما وجدته. ما باقي قسمة 2⁴ على 7؟",
            answer: "2",
            hint: "القوة الثالثة توافق الواحد، فماذا يبقى من الجداء؟",
            then: "البواقي تعود من جديد: كل ثلاث قوى تتكرر الدورة.",
          },
          {
            ask: "نكتب 2026 = 3q + s. ما باقي قسمة 2026 على 3؟",
            answer: "1",
            hint: "اجمع أرقام العدد وانظر إلى قابلية قسمة المجموع على ثلاثة.",
          },
          {
            ask: "إذن 2²⁰²⁶ = (2³)⁶⁷⁵ × 2. ما باقي قسمته على 7؟",
            answer: "2",
            hint: "القوة بين القوسين توافق الواحد مهما كان أسها، فيبقى العامل الأخير.",
          },
        ],
        rule: "لإيجاد باقي قسمة aᴺ على n: نبحث عن الدور p، أي أصغر عدد طبيعي غير معدوم يحقق aᵖ ≡ 1 [n]، ثم نقسم الأس N على p: إذا كان N = pq + s فإن aᴺ ≡ aˢ [n].",
      },
    },
    {
      key: "divisibility",
      name: "قابلية القسمة ورقم الآحاد",
      prerequisites: ["power_remainders"],
      explanation:
        "يقسم n العدد A إذا وفقط إذا كان A ≡ 0 [n]. لتعيين قيم n التي يقبل من أجلها aⁿ + c القسمة على m، نكتب الشرط aⁿ ≡ −c [m] ونبحث في جدول البواقي عن الحالة المناسبة (n = pk + j). ورقم آحاد عدد طبيعي هو باقي قسمته على 10.",
      example: {
        problem: "عيّن الأعداد الطبيعية n التي من أجلها 7 يقسم 2ⁿ + 3.",
        steps: ["2ⁿ + 3 ≡ 0 [7] يعني 2ⁿ ≡ 4 [7]", "بواقي 2ⁿ بترديد 7: 1، 2، 4 بدور 3", "2ⁿ ≡ 4 [7] لما n = 3k + 2"],
        answer: "n = 3k + 2 مع k ∈ ℕ",
      },
      dialogue: {
        opening: "رقم آحاد عدد طبيعي هو باقي قسمته على 10. نبحث عن رقم آحاد 3²⁰²⁶ دون حسابه.",
        steps: [
          {
            ask: "ما باقي قسمة 3⁴ على 10؟",
            answer: "1",
            hint: "احسب القوة ثم انظر إلى رقمها الأخير.",
          },
          {
            ask: "ما باقي قسمة 2026 على 4؟",
            answer: "2",
            hint: "يكفي النظر إلى العدد المكوّن من آخر رقمين.",
          },
          {
            ask: "إذن 3²⁰²⁶ ≡ 3² [10]. ما رقم آحاد 3²⁰²⁶؟",
            answer: "9",
            hint: "احسب مربع الأساس فقط.",
          },
          {
            ask: "الآن نعلم أن 2³ᵏ ≡ 1 [7]. ما باقي قسمة 2³ᵏ + 13 على 7؟",
            answer: "0",
            hint: "عوّض القوة بباقيها ثم أضف العدد الثابت واختزل.",
            then: "الباقي معدوم: إذن 7 يقسم 2³ᵏ + 13 من أجل كل عدد طبيعي k.",
          },
        ],
        rule: "يقسم n العدد A إذا وفقط إذا كان A ≡ 0 [n]. لدراسة قابلية قسمة aⁿ + c على m ندرس بواقي aⁿ حسب قيم n في الدور ونختار الحالات التي تعطي aⁿ ≡ −c [m]. ورقم الآحاد هو الباقي بترديد 10.",
      },
    },
    {
      key: "gcd_bezout",
      name: "القاسم المشترك الأكبر والمعادلة ax + by = c",
      prerequisites: ["euclid_division"],
      explanation:
        "PGCD(a ; b) هو آخر باقٍ غير معدوم في خوارزمية إقليدس. المعادلة ax + by = c تقبل حلولاً في ℤ² إذا وفقط إذا كان d = PGCD(a ; b) يقسم c. نقسم على d لنحصل على a′x + b′y = c′ مع a′ و b′ أوليين فيما بينهما، نجد حلاً خاصاً (x₀ ; y₀)، ثم بمبرهنة غوص: x = x₀ + b′k و y = y₀ − a′k مع k ∈ ℤ.",
      example: {
        problem: "حل في ℤ² المعادلة 14x + 6y = 4.",
        steps: [
          "PGCD(14 ; 6) = 2 يقسم 4: المعادلة تكافئ 7x + 3y = 2",
          "حل خاص: 7 × 2 + 3 × (−4) = 2 أي (2 ; −4)",
          "7(x − 2) = −3(y + 4) و PGCD(7 ; 3) = 1: حسب غوص 3 يقسم x − 2",
          "x = 2 + 3k و y = −4 − 7k مع k ∈ ℤ",
        ],
        answer: "x = 2 + 3k و y = −4 − 7k",
      },
      dialogue: {
        opening: "نبحث عن PGCD(84 ; 30) بخوارزمية إقليدس: نقسم، ثم نقسم القاسم على الباقي، وهكذا.",
        steps: [
          {
            ask: "ما باقي قسمة 84 على 30؟",
            answer: "24",
            hint: "انزع من العدد الأكبر ضعفي العدد الأصغر.",
          },
          {
            ask: "نواصل بقسمة 30 على 24. ما الباقي؟",
            answer: "6",
            hint: "العدد الأصغر يدخل مرة واحدة فقط في الأكبر.",
          },
          {
            ask: "ثم 24 على 6 يعطي باقياً معدوماً. ما هو PGCD(84 ; 30)؟",
            answer: "6",
            hint: "هو آخر باقٍ غير معدوم ظهر في الخوارزمية.",
          },
          {
            ask: "الآن المعادلة 7x + 3y = 1: الثنائية (1 ; −2) حل خاص لها. إذا كتبنا x = 1 + 3k، فما عبارة y بدلالة k؟",
            answer: "−2 − 7k",
            accept: ["-7k-2"],
            hint: "عوّض x في المعادلة، ثم بسّط حتى تعزل y.",
            then: "كلما زاد x بمعامل y نقص y بمعامل x: هكذا يبقى المجموع ثابتاً.",
          },
        ],
        rule: "PGCD(a ; b) هو آخر باقٍ غير معدوم في خوارزمية إقليدس. إذا كان a′ و b′ أوليين فيما بينهما و (x₀ ; y₀) حلاً خاصاً للمعادلة a′x + b′y = c′، فإن حلولها هي x = x₀ + b′k و y = y₀ − a′k مع k ∈ ℤ (مبرهنة غوص).",
      },
    },
  ],
  misconceptions: {
    negative_remainder: "قبول باقٍ سالب في قسمة عدد سالب (−47 = 5 × (−9) − 2 فالباقي −2)",
    neg_dividend_sign: "إهمال إشارة العدد السالب: أخذ باقي قسمة |a| على أنه باقي قسمة a",
    remainder_quotient_swap: "الخلط بين حاصل القسمة والباقي",
    remainder_too_big: "إعطاء باقٍ أكبر من القاسم أو يساويه (عدم الاختزال)",
    power_as_product: "حساب aⁿ بترديد m على أنه n × a",
    product_as_sum: "تعويض الجداء بالمجموع عند حساب الموافقات",
    cycle_index_shift: "خطأ بواحد في دورة البواقي: أخذ باقي aʲ⁺¹ بدل aʲ",
    exponent_mod_n: "اختزال الأس بترديد m بدل اختزاله بالدور p",
    exponent_as_remainder: "اعتبار باقي الأس على الدور هو باقي القوة نفسها",
    period_is_modulus: "اعتبار الترديد m هو دور البواقي بدل p",
    divisible_sign: "حل aⁿ ≡ c [m] بدل aⁿ ≡ −c [m] لما نريد أن يقسم m العدد aⁿ + c",
    general_solution_sign: "خطأ في الإشارة في الحل العام: y = y₀ + a′k بدل y = y₀ − a′k",
    general_solution_undivided: "عدم القسمة على PGCD(a ; b) قبل كتابة الحل العام",
    general_solution_swap: "تبديل المعاملين في الحل العام: x = x₀ + a′k بدل x = x₀ + b′k",
  },
  remedies: {
    negative_remainder: "الباقي يحقق دائماً 0 ≤ r < b. إذا ظهر باقٍ سالب ننقص الحاصل بواحد ونضيف b: −47 = 5 × (−10) + 3.",
    neg_dividend_sign: "باقي −a ليس باقي a: إذا كان باقي a هو r ≠ 0 فإن باقي −a هو b − r. مثلاً 47 ≡ 2 [5] لكن −47 ≡ 3 [5].",
    remainder_quotient_swap: "في a = bq + r: q هو عدد المرات (حاصل القسمة) و r ما يبقى (الباقي) مع 0 ≤ r < b.",
    remainder_too_big: "بعد الحساب اختزل دائماً: الباقي بترديد n عدد بين 0 و n − 1. مثلاً 9 ≡ 2 [7].",
    power_as_product: "aⁿ هو a مضروب في نفسه n مرة، وليس n × a: 3⁴ = 81 ≡ 1 [5] وليس 12.",
    product_as_sum: "الموافقة تحافظ على كل عملية كما هي: باقي الجداء من جداء البواقي، وباقي المجموع من مجموع البواقي.",
    cycle_index_shift: "اكتب الجدول من a⁰ ≡ 1: إذا كان n = pk + j فإن aⁿ ≡ aʲ، والحالة j = 0 تعطي الباقي 1.",
    exponent_mod_n: "الأس لا يُختزل بالترديد بل بالدور: اقسم N على p حيث aᵖ ≡ 1 [n].",
    exponent_as_remainder: "باقي قسمة الأس على الدور يحدد الحالة فقط؛ بعد ذلك احسب aʲ بترديد m.",
    period_is_modulus: "الدور هو أصغر p غير معدوم حيث aᵖ ≡ 1 [m]، وقد يختلف عن m: 2³ ≡ 1 [7] فالدور 3 لا 7.",
    divisible_sign: "m يقسم aⁿ + c يعني aⁿ + c ≡ 0 أي aⁿ ≡ −c [m]؛ حوّل −c إلى باقٍ موجب قبل البحث في الجدول.",
    general_solution_sign: "من a′x + b′y = c′ نجد a′(x − x₀) = −b′(y − y₀): إذا زاد x بـ b′k نقص y بـ a′k. تحقق بالتعويض.",
    general_solution_undivided: "اقسم أولاً على d = PGCD(a ; b): بدون ذلك تفقد حلولاً، لأن المعاملين لا يكونان أوليين فيما بينهما.",
    general_solution_swap: "x يزيد بمعامل y و y ينقص بمعامل x: في 7x + 3y = 1 نكتب x = x₀ + 3k و y = y₀ − 7k.",
  },
  bank: [],
  generators,
  problems: arithmeticProblems,
};
