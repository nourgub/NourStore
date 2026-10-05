// BAC-style problems for "الموافقات والحساب" (see ../problems.ts for the pattern).
// The integer helpers live here (and are re-used by ./arithmetic.ts) so the
// lesson can import this file without a circular import.
import { join, mul, num, sup, type Rng } from "../generators/core";
import type { ProblemGenerator } from "../problems";

/** Remainder of the Euclidean division of a by n: always 0 ≤ r < n. */
export const mod = (a: number, n: number) => ((a % n) + n) % n;

/** aᵉ modulo n, by repeated multiplication (exponents stay in the thousands). */
export function modPow(a: number, e: number, n: number): number {
  let result = 1 % n;
  const base = mod(a, n);
  for (let i = 0; i < e; i += 1) result = (result * base) % n;
  return result;
}

/** Smallest p ≥ 1 with aᵖ ≡ 1 [n] (a and n coprime). */
export function order(a: number, n: number): number {
  let value = mod(a, n);
  for (let p = 1; p <= n; p += 1) {
    if (value === 1) return p;
    value = (value * mod(a, n)) % n;
  }
  throw new Error(`${a} has no order modulo ${n}`);
}

/** The remainders of a⁰, a¹, …, aᵖ⁻¹ modulo n, as "a⁰ ≡ 1 [n]" lines. */
export function cycleLines(a: number, n: number): string[] {
  const p = order(a, n);
  return Array.from({ length: p + 1 }, (_, k) => `${a}${sup(k)} ≡ ${modPow(a, k, n)} [${n}]`);
}

/** "a = b × q + r", the "+ r" dropped when r = 0. q is wrapped when negative. */
export const divLine = (a: number | string, b: number, q: number, r: number) =>
  `${typeof a === "number" ? num(a) : a} = ${b} × ${q < 0 ? `(${num(q)})` : num(q)}${r ? ` + ${r}` : ""}`;

/** "pk + j" (or "pk" when j = 0). */
export const caseForm = (p: number, j: number, letter = "k") => join(`${p}${letter}`, num(j));

/** Bases a and moduli m with a small period (3 or 4) of aⁿ modulo m. */
const CYCLES: Array<readonly [number, number]> = [
  [2, 7], [4, 7], [2, 5], [3, 5], [4, 9], [7, 9], [5, 13], [8, 13], [3, 13], [9, 13], [2, 15], [7, 10], [3, 10],
];

/** Coprime pairs (a′, b′) for the Diophantine equation. */
function coprime(a: number, b: number): boolean {
  while (b) [a, b] = [b, a % b];
  return a === 1;
}

export const arithmeticProblems: ProblemGenerator[] = [
  {
    id: "power-remainders-divisibility",
    title: "بواقي قوى عدد طبيعي وقابلية القسمة",
    generate(rng: Rng) {
      const [a, m] = rng.pick(CYCLES);
      const p = order(a, m);
      const j = rng.int(1, p - 1);
      const t = rng.int(Math.ceil((1000 - a) / m), Math.floor((2100 - a) / m));
      const B = a + m * t;
      const N = rng.int(1000, 2100);
      const target = rng.int(0, p - 1);
      const c = mod(-modPow(a, target, m), m);
      const L = rng.int(50, 300);
      const count = Math.floor((L - target) / p) + 1;
      const s = N % p;
      const q = Math.floor(N / p);
      return {
        statement: [
          `n عدد طبيعي. نهتم ببواقي القسمة الإقليدية للعدد ${a}ⁿ على ${m}.`,
          `ونعتبر العددين A = ${B}${sup(N)} و Sₙ = ${a}ⁿ + ${c}.`,
        ].join("\n"),
        parts: [
          {
            skill: "power_remainders",
            difficulty: 1,
            type: "short",
            prompt: `احسب بواقي قسمة ${a}⁰ و ${a}¹ و ${a}² … على ${m}. ما أصغر عدد طبيعي غير معدوم p يحقق ${a}ᵖ ≡ 1 [${m}]؟`,
            answer: String(p),
            steps: [...cycleLines(a, m), `أول قوة غير معدومة توافق 1 هي ${a}${sup(p)}، إذن p = ${p}: البواقي تتكرر بدور ${p}`],
          },
          {
            skill: "power_remainders",
            difficulty: 2,
            type: "short",
            prompt: `استنتج باقي قسمة ${a}ⁿ على ${m} لما n = ${caseForm(p, j)} حيث k عدد طبيعي.`,
            answer: String(modPow(a, j, m)),
            steps: [
              `${a}ⁿ = (${a}${sup(p)})ᵏ × ${a}${sup(j)}`,
              `${a}${sup(p)} ≡ 1 [${m}] إذن (${a}${sup(p)})ᵏ ≡ 1 [${m}]`,
              `${a}ⁿ ≡ ${a}${sup(j)} ≡ ${modPow(a, j, m)} [${m}]`,
            ],
          },
          {
            skill: "congruence_ops",
            difficulty: 2,
            type: "short",
            prompt: `بيّن أن ${B} ≡ ${a} [${m}]، ثم استنتج باقي قسمة A على ${m}.`,
            answer: String(modPow(a, N, m)),
            steps: [
              `${B} = ${m} × ${t} + ${a} إذن ${B} ≡ ${a} [${m}] ومنه A ≡ ${a}${sup(N)} [${m}]`,
              divLine(N, p, q, s),
              s === 0
                ? `${a}${sup(N)} = (${a}${sup(p)})${sup(q)} ≡ 1 [${m}]`
                : `${a}${sup(N)} = (${a}${sup(p)})${sup(q)} × ${a}${sup(s)} ≡ ${a}${sup(s)} [${m}]`,
              `إذن باقي قسمة A على ${m} هو ${modPow(a, N, m)}`,
            ],
          },
          {
            skill: "divisibility",
            difficulty: 2,
            type: "short",
            prompt: `عيّن قيم العدد الطبيعي n التي يكون من أجلها Sₙ قابلاً للقسمة على ${m}. اكتب n بدلالة العدد الطبيعي k.`,
            answer: caseForm(p, target),
            accept: [`n = ${caseForm(p, target)}`],
            steps: [
              `Sₙ ≡ 0 [${m}] يعني ${a}ⁿ ≡ −${c} [${m}] أي ${a}ⁿ ≡ ${modPow(a, target, m)} [${m}]`,
              `حسب جدول البواقي: ${a}${sup(target)} ≡ ${modPow(a, target, m)} [${m}] وهو الباقي الوحيد المناسب في الدور`,
              `إذن n = ${caseForm(p, target)} مع k ∈ ℕ`,
            ],
          },
          {
            skill: "divisibility",
            difficulty: 3,
            type: "short",
            prompt: `كم عدداً طبيعياً n يحقق 0 ≤ n ≤ ${L} ويكون من أجله ${m} يقسم Sₙ؟`,
            answer: String(count),
            steps: [
              `n = ${caseForm(p, target)} و 0 ≤ ${caseForm(p, target)} ≤ ${L}`,
              `0 ≤ k ≤ ${L - target}/${p} أي 0 ≤ k ≤ ${Math.floor((L - target) / p)}`,
              `عدد القيم الممكنة لـ k هو ${Math.floor((L - target) / p)} + 1 = ${count}`,
            ],
          },
        ],
      };
    },
  },
  {
    id: "diophantine-equation",
    title: "معادلة ديوفانتية من الشكل ax − by = c",
    streams: ["math"],
    generate(rng: Rng) {
      let [a, b, d, x0, y0] = [3, 2, 1, 1, 1];
      for (;;) {
        a = rng.int(3, 13);
        b = rng.int(2, 11);
        d = rng.pick([1, 2, 3]);
        x0 = rng.int(1, 7);
        y0 = rng.int(1, 6);
        if (a !== b && coprime(a, b) && a * x0 - b * y0 > 0) break;
      }
      const c = a * x0 - b * y0;
      const [A, B, C] = [d * a, d * b, d * c];
      const k = rng.int(3, 15);
      const sum = x0 + y0 + (a + b) * k;
      const T = sum - rng.int(0, a + b - 1);
      const xAt = x0 + b * k;
      const yAt = y0 + a * k;
      const euclid: string[] = [];
      for (let [u, v] = [A, B]; v; [u, v] = [v, u % v]) euclid.push(divLine(u, v, Math.floor(u / v), u % v));
      const reduced =
        d === 1
          ? `${a} × ${x0} − ${b} × ${y0} = ${c}`
          : `بالقسمة على ${d}: (E) تكافئ ${a}x − ${b}y = ${c}، و ${a} × ${x0} − ${b} × ${y0} = ${c}`;
      return {
        statement: `نعتبر في ℤ² المعادلة (E) ذات المجهول (x ; y): ${A}x − ${B}y = ${C}.`,
        parts: [
          {
            skill: "gcd_bezout",
            difficulty: 1,
            type: "short",
            prompt: `احسب PGCD(${A} ; ${B}).`,
            answer: String(d),
            steps: [...euclid, `آخر باقٍ غير معدوم هو ${d}، إذن PGCD(${A} ; ${B}) = ${d}`],
          },
          {
            skill: "gcd_bezout",
            difficulty: 2,
            type: "short",
            prompt: `عيّن العدد الصحيح y₀ الذي تكون من أجله الثنائية (${x0} ; y₀) حلاً للمعادلة (E).`,
            answer: String(y0),
            steps: [
              `${A} × ${x0} − ${B}y₀ = ${C}`,
              `${B}y₀ = ${A * x0} − ${C} = ${B * y0}`,
              `y₀ = ${B * y0}/${B} = ${y0}`,
            ],
          },
          {
            skill: "gcd_bezout",
            difficulty: 2,
            type: "short",
            prompt: `حل المعادلة (E): إذا كتبنا x = ${join(num(x0), `${b}k`)} مع k ∈ ℤ، فاكتب y بدلالة k.`,
            answer: join(num(y0), mul(a, "k")),
            accept: [`y = ${join(num(y0), mul(a, "k"))}`],
            steps: [
              reduced,
              `بالطرح: ${a}(x − ${x0}) = ${b}(y − ${y0})`,
              `${b} يقسم ${a}(x − ${x0}) و PGCD(${a} ; ${b}) = 1، إذن حسب مبرهنة غوص ${b} يقسم x − ${x0}: x = ${join(num(x0), `${b}k`)}`,
              `بالتعويض: ${a} × ${b}k = ${b}(y − ${y0}) ومنه y = ${join(num(y0), mul(a, "k"))}`,
            ],
          },
          {
            skill: "congruence_def",
            difficulty: 2,
            type: "short",
            prompt: `استنتج أنه إذا كانت (x ; y) حلاً للمعادلة (E) فإن x ≡ r [${b}]. ما العدد الطبيعي r الأصغر من ${b}؟`,
            answer: String(mod(x0, b)),
            steps: [
              `x = ${join(num(x0), `${b}k`)} إذن x ≡ ${x0} [${b}]`,
              x0 < b ? `0 ≤ ${x0} < ${b} إذن r = ${x0}` : `${divLine(x0, b, Math.floor(x0 / b), mod(x0, b))} إذن r = ${mod(x0, b)}`,
            ],
          },
          {
            skill: "gcd_bezout",
            difficulty: 3,
            type: "short",
            prompt: `عيّن الحل (x ; y) للمعادلة (E) الذي يحقق ${T} ≤ x + y ≤ ${T + a + b - 1}، ثم اكتب قيمة x.`,
            answer: String(xAt),
            steps: [
              `x + y = ${join(num(x0), `${b}k`)} + ${join(num(y0), mul(a, "k"))} = ${join(num(x0 + y0), `${a + b}k`)}`,
              `${T} ≤ ${join(num(x0 + y0), `${a + b}k`)} ≤ ${T + a + b - 1} يعطي ${T - x0 - y0}/${a + b} ≤ k ≤ ${T + a + b - 1 - x0 - y0}/${a + b}، والعدد الصحيح الوحيد هو k = ${k}`,
              `x = ${x0} + ${b} × ${k} = ${xAt} و y = ${y0} + ${a} × ${k} = ${yAt}`,
            ],
          },
        ],
      };
    },
  },
];
