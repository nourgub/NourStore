// Tafawoq AI Teacher — free, deterministic step-by-step solver for typed
// BAC maths exercises (Arabic, French, English or Darja, mixed with
// formulas). No model call, no network: the task is recognised from
// keywords, the function is parsed with mathjs, and the worked solution
// is generated rule by rule from the expression structure.
//
// Every answer is computed exactly (rationals, plus e, ln and √ atoms)
// and checked numerically — derivatives and primitives against mathjs'
// own derivative, limits by sampling, integrals by Simpson's rule. When
// a check fails or the exercise is outside what the solver understands,
// solveExercise returns null and a human teacher answers instead.
import { derivative as mjsDerivative, parse as mjsParse } from "mathjs";
import { frac, gcd, join, num, sup } from "./generators/core";

export type SolverKind = "derivative" | "limit" | "equation" | "primitive" | "integral" | "tangent" | "value";
export type Solution = { kind: SolverKind; title: string; steps: string[]; answer: string };

class Unsupported extends Error {}
function fail(): never {
  throw new Unsupported("unsupported");
}

// ---------------------------------------------------------------------------
// Exact rationals
// ---------------------------------------------------------------------------

type Q = { n: number; d: number };
const BIG = 1e12;

function q(n: number, d = 1): Q {
  if (d === 0 || !Number.isInteger(n) || !Number.isInteger(d)) fail();
  if (Math.abs(n) > BIG || Math.abs(d) > BIG) fail();
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g || 0, d: d / g };
}
const Q0 = q(0);
const Q1 = q(1);
const qAdd = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const qSub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const qMul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const qDiv = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
const qNeg = (a: Q) => q(-a.n, a.d);
const qAbs = (a: Q) => q(Math.abs(a.n), a.d);
const qEq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
const qVal = (a: Q) => a.n / a.d;
const qStr = (a: Q) => frac(a.n, a.d);
const isZero = (a: Q) => a.n === 0;
function qPow(a: Q, k: number): Q {
  if (k < 0) return qDiv(Q1, qPow(a, -k));
  let result = Q1;
  for (let i = 0; i < k; i += 1) result = qMul(result, a);
  return result;
}
function qFromNumber(value: number): Q {
  if (!Number.isFinite(value)) fail();
  const text = String(Math.abs(value));
  if (text.includes("e")) fail();
  const decimals = (text.split(".")[1] ?? "").length;
  if (decimals > 6) fail();
  return q(Math.round(value * 10 ** decimals), 10 ** decimals);
}
function qParse(text: string): Q {
  const clean = text.replace(/\s+/g, "").replace(/^\+/, "");
  const [p, r] = clean.split("/");
  const value = qFromNumber(Number(p));
  return r === undefined ? value : qDiv(value, qFromNumber(Number(r)));
}

// ---------------------------------------------------------------------------
// Polynomials with rational coefficients (index = power)
// ---------------------------------------------------------------------------

type Poly = Q[];
function pTrim(p: Poly): Poly {
  const r = [...p];
  while (r.length && isZero(r[r.length - 1])) r.pop();
  return r;
}
const pDeg = (p: Poly) => pTrim(p).length - 1;
const pCoef = (p: Poly, k: number) => p[k] ?? Q0;
const pLead = (p: Poly) => pCoef(p, pDeg(p));
function pAdd(a: Poly, b: Poly): Poly {
  const out: Poly = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) out.push(qAdd(pCoef(a, i), pCoef(b, i)));
  return pTrim(out);
}
const pScale = (p: Poly, k: Q): Poly => pTrim(p.map(c => qMul(c, k)));
const pSub = (a: Poly, b: Poly) => pAdd(a, pScale(b, q(-1)));
function pMul(a: Poly, b: Poly): Poly {
  if (!pTrim(a).length || !pTrim(b).length) return [];
  if (a.length + b.length > 24) fail();
  const out: Poly = Array.from({ length: a.length + b.length - 1 }, () => Q0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] = qAdd(out[i + j], qMul(x, y)))));
  return pTrim(out);
}
function pPow(p: Poly, n: number): Poly {
  let out: Poly = [Q1];
  for (let i = 0; i < n; i += 1) out = pMul(out, p);
  return out;
}
const pDeriv = (p: Poly): Poly => pTrim(p.slice(1).map((c, i) => qMul(c, q(i + 1))));
const pInt = (p: Poly): Poly => pTrim([Q0, ...p.map((c, i) => qDiv(c, q(i + 1)))]);
const pEval = (p: Poly, x: Q) => p.reduceRight((acc, c) => qAdd(qMul(acc, x), c), Q0);
const pEvalN = (p: Poly, x: number) => p.reduceRight((acc, c) => acc * x + qVal(c), 0);
function pDivmod(a: Poly, b: Poly): { quo: Poly; rem: Poly } {
  const divisor = pTrim(b);
  if (!divisor.length) fail();
  let rem = pTrim(a);
  const quo: Poly = [];
  while (rem.length >= divisor.length) {
    const shift = rem.length - divisor.length;
    const factor = qDiv(rem[rem.length - 1], divisor[divisor.length - 1]);
    quo[shift] = factor;
    const sub: Poly = Array.from({ length: shift }, () => Q0).concat(divisor.map(c => qMul(c, factor)));
    rem = pSub(rem, sub);
  }
  for (let i = 0; i < quo.length; i += 1) quo[i] = quo[i] ?? Q0;
  return { quo: pTrim(quo), rem };
}
/** The constant k with a = k·b, or null. */
function pRatioConst(a: Poly, b: Poly): Q | null {
  if (!pTrim(b).length) return null;
  const { quo, rem } = pDivmod(a, b);
  return rem.length === 0 && pDeg(quo) <= 0 ? pCoef(quo, 0) : null;
}
function hasRealRoot(p: Poly): boolean {
  const t = pTrim(p);
  const d = t.length - 1;
  if (d <= 0) return false;
  if (d % 2 === 1) return true;
  if (d === 2) return qVal(t[1]) ** 2 - 4 * qVal(t[2]) * qVal(t[0]) >= 0;
  for (let x = -50; x <= 50; x += 0.01) if (Math.sign(pEvalN(t, x)) !== Math.sign(qVal(t[d]))) return true;
  return false;
}

/** One monomial c·Xᵏ as text without its sign. */
function monoBody(c: Q, k: number, variable = "x", times = false): string {
  const abs = qAbs(c);
  const body = k === 0 ? "" : k === 1 ? variable : `${variable}${sup(k)}`;
  if (!body) return qStr(abs);
  if (qEq(abs, Q1)) return body;
  if (times) return `${qStr(abs)}×${body}`;
  return abs.d === 1 ? `${abs.n}${body}` : `(${qStr(abs)})${body}`;
}
const mono = (c: Q, k: number, variable = "x", times = false) =>
  `${c.n < 0 ? "−" : ""}${monoBody(c, k, variable, times)}`;
function fmtPoly(p: Poly, variable = "x", times = false): string {
  const t = pTrim(p);
  const terms: string[] = [];
  for (let k = t.length - 1; k >= 0; k -= 1) if (!isZero(t[k])) terms.push(mono(t[k], k, variable, times));
  return join(...terms);
}

// ---------------------------------------------------------------------------
// Exact constants: rational + Σ c·atom, atoms being e^r, ln r and √r
// ---------------------------------------------------------------------------

type Atom = { kind: "exp" | "ln" | "sqrt"; arg: Q; c: Q };
type Const = { r: Q; atoms: Atom[] };
const KIND_ORDER: Record<Atom["kind"], number> = { exp: 0, ln: 1, sqrt: 2 };
const cQ = (r: Q): Const => ({ r, atoms: [] });
function cNorm(atoms: Atom[]): Atom[] {
  const merged = new Map<string, Atom>();
  for (const atom of atoms) {
    const key = `${atom.kind}:${atom.arg.n}/${atom.arg.d}`;
    const old = merged.get(key);
    merged.set(key, old ? { ...old, c: qAdd(old.c, atom.c) } : atom);
  }
  return Array.from(merged.values())
    .filter(a => !isZero(a.c))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || qVal(b.arg) - qVal(a.arg));
}
const cIsQ = (a: Const) => a.atoms.length === 0;
const cAdd = (a: Const, b: Const): Const => ({ r: qAdd(a.r, b.r), atoms: cNorm([...a.atoms, ...b.atoms]) });
const cScale = (a: Const, k: Q): Const => ({ r: qMul(a.r, k), atoms: cNorm(a.atoms.map(t => ({ ...t, c: qMul(t.c, k) }))) });
const cNeg = (a: Const) => cScale(a, q(-1));
const cSub = (a: Const, b: Const) => cAdd(a, cNeg(b));
const cVal = (a: Const) =>
  qVal(a.r) +
  a.atoms.reduce((s, t) => s + qVal(t.c) * (t.kind === "exp" ? Math.exp(qVal(t.arg)) : t.kind === "ln" ? Math.log(qVal(t.arg)) : Math.sqrt(qVal(t.arg))), 0);
function cExp(arg: Q): Const {
  return isZero(arg) ? cQ(Q1) : { r: Q0, atoms: [{ kind: "exp", arg, c: Q1 }] };
}
function cLn(arg: Q): Const {
  if (arg.n <= 0) fail();
  if (qEq(arg, Q1)) return cQ(Q0);
  if (arg.n === 1) return { r: Q0, atoms: [{ kind: "ln", arg: q(arg.d), c: q(-1) }] };
  return { r: Q0, atoms: [{ kind: "ln", arg, c: Q1 }] };
}
function cSqrt(arg: Q): Const {
  if (arg.n < 0) fail();
  let m = arg.n * arg.d;
  if (m > 1e9) fail();
  let outside = 1;
  for (let f = 2; f * f <= m; f += 1) {
    while (m % (f * f) === 0) {
      m /= f * f;
      outside *= f;
    }
  }
  if (m === 0) return cQ(Q0);
  const coefficient = q(outside, arg.d);
  return m === 1 ? cQ(coefficient) : { r: Q0, atoms: [{ kind: "sqrt", arg: q(m), c: coefficient }] };
}
const single = (a: Const) => (isZero(a.r) && a.atoms.length === 1 ? a.atoms[0] : null);
function cMul(a: Const, b: Const): Const {
  if (cIsQ(a)) return cScale(b, a.r);
  if (cIsQ(b)) return cScale(a, b.r);
  const x = single(a);
  const y = single(b);
  if (x && y && x.kind === "exp" && y.kind === "exp") return cScale(cExp(qAdd(x.arg, y.arg)), qMul(x.c, y.c));
  if (x && y && x.kind === "sqrt" && y.kind === "sqrt") return cScale(cSqrt(qMul(x.arg, y.arg)), qMul(x.c, y.c));
  return fail();
}
function cInv(a: Const): Const {
  if (cIsQ(a)) {
    if (isZero(a.r)) fail();
    return cQ(qDiv(Q1, a.r));
  }
  const t = single(a);
  if (t?.kind === "exp") return cScale(cExp(qNeg(t.arg)), qDiv(Q1, t.c));
  if (t?.kind === "sqrt") return cScale(cSqrt(t.arg), qDiv(Q1, qMul(t.c, t.arg)));
  return fail();
}
function cPow(a: Const, k: number): Const {
  if (k < 0) return cInv(cPow(a, -k));
  let out = cQ(Q1);
  for (let i = 0; i < k; i += 1) out = cMul(out, a);
  return out;
}
function cLnOf(a: Const): Const {
  if (cIsQ(a)) return cLn(a.r);
  const t = single(a);
  if (t?.kind === "exp" && t.c.n > 0) return cAdd(cLn(t.c), cQ(t.arg));
  return fail();
}
function cExpOf(a: Const): Const {
  if (cIsQ(a)) return cExp(a.r);
  const t = single(a);
  if (t?.kind === "ln" && t.c.d === 1) return cQ(qPow(t.arg, t.c.n));
  return fail();
}
function atomText(t: Atom): string {
  if (t.kind === "exp") {
    if (qEq(t.arg, Q1)) return "e";
    return t.arg.d === 1 ? `e${sup(t.arg.n)}` : `e^(${qStr(t.arg)})`;
  }
  if (t.kind === "ln") return t.arg.d === 1 ? `ln ${t.arg.n}` : `ln(${qStr(t.arg)})`;
  return `√${t.arg.n}`;
}
function cFmt(a: Const): string {
  const parts = a.atoms.map(t => {
    const body = atomText(t);
    const abs = qAbs(t.c);
    const gap = t.kind === "ln" ? " " : "";
    const text = qEq(abs, Q1) ? body : abs.d === 1 ? `${abs.n}${gap}${body}` : `(${qStr(abs)})${gap}${body}`;
    return t.c.n < 0 ? `−${text}` : text;
  });
  if (!isZero(a.r) || !parts.length) parts.push(qStr(a.r));
  return join(...parts);
}
/** (numerator)/den written the way a teacher would: (ln 3 + 1)/2. */
function cOver(numerator: Const, den: Q): string {
  if (cIsQ(numerator) || den.d !== 1 || Math.abs(den.n) === 1) return cFmt(cScale(numerator, qDiv(Q1, den)));
  const top = den.n < 0 ? cNeg(numerator) : numerator;
  const text = cFmt(top);
  const wrapped = single(top) && !text.startsWith("−") ? text : `(${text})`;
  return `${wrapped}/${Math.abs(den.n)}`;
}

// ---------------------------------------------------------------------------
// Expression tree
// ---------------------------------------------------------------------------

type Fn = "exp" | "ln" | "lnabs" | "sqrt";
type E =
  | { t: "num"; v: Q }
  | { t: "x" }
  | { t: "poly"; p: Poly }
  | { t: "add" | "sub" | "mul" | "div" | "pow"; a: E; b: E }
  | { t: "neg"; a: E }
  | { t: "fn"; f: Fn; a: E };

const N = (v: Q | number): E => ({ t: "num", v: typeof v === "number" ? q(v) : v });
const X: E = { t: "x" };
const add = (a: E, b: E): E => ({ t: "add", a, b });
const sub = (a: E, b: E): E => ({ t: "sub", a, b });
const mul = (a: E, b: E): E => ({ t: "mul", a, b });
const div = (a: E, b: E): E => ({ t: "div", a, b });
const pow = (a: E, b: E): E => ({ t: "pow", a, b });
const neg = (a: E): E => ({ t: "neg", a });
const fn = (f: Fn, a: E): E => ({ t: "fn", f, a });
const P = (p: Poly): E => {
  const t = pTrim(p);
  if (t.length <= 1) return N(pCoef(t, 0));
  if (t.length === 2 && isZero(t[0]) && qEq(t[1], Q1)) return X;
  return { t: "poly", p: t };
};
const isNum = (e: E, v?: number) => e.t === "num" && (v === undefined || qEq(e.v, q(v)));

function hasX(e: E): boolean {
  switch (e.t) {
    case "num":
      return false;
    case "x":
      return true;
    case "poly":
      return pDeg(e.p) > 0;
    case "neg":
    case "fn":
      return hasX(e.a);
    default:
      return hasX(e.a) || hasX(e.b);
  }
}
function hasFn(e: E, f?: Fn): boolean {
  if (e.t === "fn") return f === undefined || e.f === f || hasFn(e.a, f);
  if (e.t === "neg") return hasFn(e.a, f);
  if ("b" in e) return hasFn(e.a, f) || hasFn(e.b, f);
  return false;
}

function toPoly(e: E): Poly | null {
  try {
    return toPolyStrict(e);
  } catch {
    return null;
  }
}
function toPolyStrict(e: E): Poly {
  switch (e.t) {
    case "num":
      return pTrim([e.v]);
    case "x":
      return [Q0, Q1];
    case "poly":
      return e.p;
    case "neg":
      return pScale(toPolyStrict(e.a), q(-1));
    case "add":
      return pAdd(toPolyStrict(e.a), toPolyStrict(e.b));
    case "sub":
      return pSub(toPolyStrict(e.a), toPolyStrict(e.b));
    case "mul":
      return pMul(toPolyStrict(e.a), toPolyStrict(e.b));
    case "div": {
      const d = toPolyStrict(e.b);
      if (pDeg(d) !== 0) fail();
      return pScale(toPolyStrict(e.a), qDiv(Q1, d[0]));
    }
    case "pow": {
      const k = toPolyStrict(e.b);
      if (pDeg(k) > 0) fail();
      const n = pCoef(k, 0);
      if (n.d !== 1 || n.n < 0 || n.n > 20) fail();
      return pPow(toPolyStrict(e.a), n.n);
    }
    default:
      return fail();
  }
}
type Rat = { n: Poly; d: Poly };
function toRat(e: E): Rat | null {
  try {
    return toRatStrict(e);
  } catch {
    return null;
  }
}
function toRatStrict(e: E): Rat {
  switch (e.t) {
    case "num":
    case "x":
    case "poly":
      return { n: toPolyStrict(e), d: [Q1] };
    case "neg": {
      const a = toRatStrict(e.a);
      return { n: pScale(a.n, q(-1)), d: a.d };
    }
    case "add":
    case "sub": {
      const a = toRatStrict(e.a);
      const b = toRatStrict(e.b);
      if (pDeg(a.d) === 0 && pDeg(b.d) === 0) {
        const n = e.t === "add" ? pAdd(pScale(a.n, qDiv(Q1, a.d[0])), pScale(b.n, qDiv(Q1, b.d[0]))) : pSub(pScale(a.n, qDiv(Q1, a.d[0])), pScale(b.n, qDiv(Q1, b.d[0])));
        return { n, d: [Q1] };
      }
      if (pDeg(b.d) === 0) return { n: (e.t === "add" ? pAdd : pSub)(a.n, pScale(pMul(b.n, a.d), qDiv(Q1, b.d[0]))), d: a.d };
      if (pDeg(a.d) === 0) return { n: (e.t === "add" ? pAdd : pSub)(pScale(pMul(a.n, b.d), qDiv(Q1, a.d[0])), b.n), d: b.d };
      const n = (e.t === "add" ? pAdd : pSub)(pMul(a.n, b.d), pMul(b.n, a.d));
      return { n, d: pMul(a.d, b.d) };
    }
    case "mul": {
      const a = toRatStrict(e.a);
      const b = toRatStrict(e.b);
      return { n: pMul(a.n, b.n), d: pMul(a.d, b.d) };
    }
    case "div": {
      const a = toRatStrict(e.a);
      const b = toRatStrict(e.b);
      if (!b.n.length) fail();
      return { n: pMul(a.n, b.d), d: pMul(a.d, b.n) };
    }
    case "pow": {
      const k = toPolyStrict(e.b);
      if (pDeg(k) > 0) fail();
      const n = pCoef(k, 0);
      if (n.d !== 1 || Math.abs(n.n) > 12) fail();
      const a = toRatStrict(e.a);
      return n.n >= 0 ? { n: pPow(a.n, n.n), d: pPow(a.d, n.n) } : { n: pPow(a.d, -n.n), d: pPow(a.n, -n.n) };
    }
    default:
      return fail();
  }
}
/** Normalises a rational so the denominator is monic-free of a constant factor. */
function ratNormalize(r: Rat): Rat {
  const lead = pLead(r.d);
  if (pDeg(r.d) === 0) return { n: pScale(r.n, qDiv(Q1, lead)), d: [Q1] };
  return r;
}

function hasPowOfSum(e: E): boolean {
  if (e.t === "pow") {
    const base = toPoly(e.a);
    if (base && base.filter(c => !isZero(c)).length >= 2 && !isNum(e.b, 1)) return true;
    return hasPowOfSum(e.a);
  }
  if (e.t === "neg" || e.t === "fn") return hasPowOfSum(e.a);
  if ("b" in e) return hasPowOfSum(e.a) || hasPowOfSum(e.b);
  return false;
}

function evalN(e: E, x: number): number {
  switch (e.t) {
    case "num":
      return qVal(e.v);
    case "x":
      return x;
    case "poly":
      return pEvalN(e.p, x);
    case "add":
      return evalN(e.a, x) + evalN(e.b, x);
    case "sub":
      return evalN(e.a, x) - evalN(e.b, x);
    case "mul":
      return evalN(e.a, x) * evalN(e.b, x);
    case "div":
      return evalN(e.a, x) / evalN(e.b, x);
    case "pow":
      return evalN(e.a, x) ** evalN(e.b, x);
    case "neg":
      return -evalN(e.a, x);
    case "fn": {
      const v = evalN(e.a, x);
      if (e.f === "exp") return Math.exp(v);
      if (e.f === "ln") return v > 0 ? Math.log(v) : NaN;
      if (e.f === "lnabs") return v !== 0 ? Math.log(Math.abs(v)) : NaN;
      return v >= 0 ? Math.sqrt(v) : NaN;
    }
  }
}

/** Exact value at a rational point, or a thrown Unsupported. */
function evalC(e: E, x: Q): Const {
  switch (e.t) {
    case "num":
      return cQ(e.v);
    case "x":
      return cQ(x);
    case "poly":
      return cQ(pEval(e.p, x));
    case "add":
      return cAdd(evalC(e.a, x), evalC(e.b, x));
    case "sub":
      return cSub(evalC(e.a, x), evalC(e.b, x));
    case "mul":
      return cMul(evalC(e.a, x), evalC(e.b, x));
    case "div":
      return cMul(evalC(e.a, x), cInv(evalC(e.b, x)));
    case "neg":
      return cNeg(evalC(e.a, x));
    case "pow": {
      const k = evalC(e.b, x);
      if (!cIsQ(k)) fail();
      if (k.r.d === 1) return cPow(evalC(e.a, x), k.r.n);
      const base = evalC(e.a, x);
      if (k.r.d === 2 && cIsQ(base)) return cMul(cPow(cSqrt(base.r), 1), cPow(base, (k.r.n - 1) / 2));
      return fail();
    }
    case "fn": {
      const v = evalC(e.a, x);
      if (e.f === "exp") return cExpOf(v);
      if (e.f === "ln") return cLnOf(v);
      if (e.f === "lnabs") return cLnOf(cVal(v) < 0 ? cNeg(v) : v);
      if (!cIsQ(v)) fail();
      return cSqrt(v.r);
    }
  }
}
function tryEvalC(e: E, x: Q): Const | null {
  try {
    const value = evalC(e, x);
    return Number.isFinite(cVal(value)) ? value : null;
  } catch {
    return null;
  }
}

function toMjs(e: E): string {
  switch (e.t) {
    case "num":
      return `(${e.v.n}/${e.v.d})`;
    case "x":
      return "x";
    case "poly":
      return `(${e.p.map((c, k) => `(${c.n}/${c.d})*x^${k}`).join(" + ")})`;
    case "add":
      return `(${toMjs(e.a)} + ${toMjs(e.b)})`;
    case "sub":
      return `(${toMjs(e.a)} - ${toMjs(e.b)})`;
    case "mul":
      return `(${toMjs(e.a)} * ${toMjs(e.b)})`;
    case "div":
      return `(${toMjs(e.a)} / ${toMjs(e.b)})`;
    case "pow":
      return `(${toMjs(e.a)} ^ ${toMjs(e.b)})`;
    case "neg":
      return `(-${toMjs(e.a)})`;
    case "fn":
      if (e.f === "lnabs") return `log(abs(${toMjs(e.a)}))`;
      return `${e.f === "ln" ? "log" : e.f}(${toMjs(e.a)})`;
  }
}

/** mathjs' own derivative, evaluated — the independent reference for checks. */
function mjsDerivativeAt(e: E): (x: number) => number {
  const node = mjsDerivative(toMjs(e), "x");
  const compiled = node.compile();
  return x => {
    try {
      const value = compiled.evaluate({ x });
      return typeof value === "number" ? value : NaN;
    } catch {
      return NaN;
    }
  };
}
const SAMPLES = [-2.31, -1.37, -0.53, 0.37, 0.81, 1.29, 1.73, 2.41, 3.17, 4.43];
function agreeAt(f: (x: number) => number, g: (x: number) => number, points = SAMPLES): boolean {
  let checked = 0;
  for (const x of points) {
    const a = f(x);
    const b = g(x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > 1e-6 * (1 + Math.abs(b))) return false;
    checked += 1;
  }
  return checked >= 3;
}

// ---------------------------------------------------------------------------
// Light simplification (keeps the structure a teacher writes)
// ---------------------------------------------------------------------------

function light(e: E, cancel = true): E {
  let current = e;
  for (let i = 0; i < 6; i += 1) {
    const next = lightOnce(current, cancel);
    if (JSON.stringify(next) === JSON.stringify(current)) return next;
    current = next;
  }
  return current;
}
/** As typed, tidied but without cancelling quotients — for restating the exercise. */
const show = (e: E) => light(e, false);
function lightOnce(e: E, cancel: boolean): E {
  switch (e.t) {
    case "num":
    case "x":
      return e;
    case "poly":
      return P(e.p);
    case "neg": {
      const a = lightOnce(e.a, cancel);
      if (a.t === "num") return N(qNeg(a.v));
      if (a.t === "neg") return a.a;
      if (a.t === "poly") return P(pScale(a.p, q(-1)));
      return neg(a);
    }
    case "add": {
      const a = lightOnce(e.a, cancel);
      const b = lightOnce(e.b, cancel);
      if (isNum(a, 0)) return b;
      if (isNum(b, 0)) return a;
      if (a.t === "num" && b.t === "num") return N(qAdd(a.v, b.v));
      if (b.t === "neg") return sub(a, b.a);
      if (b.t === "num" && b.v.n < 0) return sub(a, N(qNeg(b.v)));
      if (b.t === "mul" && b.a.t === "num" && b.a.v.n < 0) return sub(a, mul(N(qNeg(b.a.v)), b.b));
      return add(a, b);
    }
    case "sub": {
      const a = lightOnce(e.a, cancel);
      const b = lightOnce(e.b, cancel);
      if (isNum(b, 0)) return a;
      if (isNum(a, 0)) return neg(b);
      if (a.t === "num" && b.t === "num") return N(qSub(a.v, b.v));
      if (b.t === "neg") return add(a, b.a);
      if (b.t === "num" && b.v.n < 0) return add(a, N(qNeg(b.v)));
      return sub(a, b);
    }
    case "mul": {
      let a = lightOnce(e.a, cancel);
      let b = lightOnce(e.b, cancel);
      if (isNum(a, 0) || isNum(b, 0)) return N(0);
      if (isNum(a, 1)) return b;
      if (isNum(b, 1)) return a;
      if (a.t === "num" && b.t === "num") return N(qMul(a.v, b.v));
      if (b.t === "num") [a, b] = [b, a];
      if (a.t === "num" && b.t === "mul" && b.a.t === "num") return mul(N(qMul(a.v, b.a.v)), b.b);
      if (a.t === "num" && b.t === "poly") return P(pScale(b.p, a.v));
      if (a.t === "num" && b.t === "x") return P([Q0, a.v]);
      if (a.t === "neg") return neg(mul(a.a, b));
      if (b.t === "neg") return neg(mul(a, b.a));
      if (isNum(a, -1)) return neg(b);
      if (b.t === "div") return div(mul(a, b.a), b.b);
      if (a.t === "div") return div(mul(a.a, b), a.b);
      if (a.t === "fn" && b.t === "fn" && a.f === "exp" && b.f === "exp") return fn("exp", add(a.a, b.a));
      if (b.t === "mul" && b.a.t === "num" && a.t !== "num") return mul(b.a, mul(a, b.b));
      return mul(a, b);
    }
    case "div": {
      const a = lightOnce(e.a, cancel);
      const b = lightOnce(e.b, cancel);
      if (isNum(a, 0)) return N(0);
      if (isNum(b, 1)) return a;
      if (a.t === "num" && b.t === "num") return N(qDiv(a.v, b.v));
      if (a.t === "neg") return neg(div(a.a, b));
      if (b.t === "num") return mul(N(qDiv(Q1, b.v)), a);
      if (a.t === "div") return div(a.a, mul(a.b, b));
      const pa = toPoly(a);
      if (pa && b.t === "mul" && b.a.t === "num") {
        const scaled = pScale(pa, qDiv(Q1, b.a.v));
        if (scaled.every(c => c.d === 1)) return div(P(scaled), b.b);
      }
      const pb = toPoly(b);
      if (cancel && pa && pb && pDeg(pb) > 0) {
        const { quo, rem } = pDivmod(pa, pb);
        if (!rem.length) return P(quo);
      }
      return div(a, b);
    }
    case "pow": {
      const a = lightOnce(e.a, cancel);
      const b = lightOnce(e.b, cancel);
      if (isNum(b, 1)) return a;
      if (isNum(b, 0)) return N(1);
      if (a.t === "num" && b.t === "num" && b.v.d === 1) return N(qPow(a.v, b.v.n));
      if (a.t === "fn" && a.f === "sqrt" && isNum(b, 2)) return a.a;
      if (b.t === "num" && b.v.n < 0 && b.v.d === 1) return div(N(1), pow(a, N(qNeg(b.v))));
      return pow(a, b);
    }
    case "fn": {
      const a = lightOnce(e.a, cancel);
      if (e.f === "exp" && isNum(a, 0)) return N(1);
      if ((e.f === "ln" || e.f === "lnabs") && isNum(a, 1)) return N(0);
      if (e.f === "ln" && a.t === "fn" && a.f === "exp") return a.a;
      return fn(e.f, a);
    }
  }
}
/** light() plus collapsing polynomial sub-expressions into expanded form. */
function simp(e: E): E {
  const collapse = (node: E): E => {
    if (node.t !== "num" && node.t !== "x" && hasX(node) && !hasPowOfSum(node)) {
      const p = toPoly(node);
      if (p) return P(p);
    }
    switch (node.t) {
      case "neg":
      case "fn":
        return { ...node, a: collapse(node.a) };
      case "add":
      case "sub":
      case "mul":
      case "div":
      case "pow":
        return { ...node, a: collapse(node.a), b: collapse(node.b) };
      default:
        return node;
    }
  };
  return light(collapse(light(e)));
}

// ---------------------------------------------------------------------------
// Unicode formatting
// ---------------------------------------------------------------------------

type Ctx = { x: string; times: boolean };
const PLAIN: Ctx = { x: "x", times: false };
const SUP_CHARS: Record<string, string> = { x: "ˣ", "+": "⁺", "−": "⁻" };

function sumLike(e: E): boolean {
  if (e.t === "add" || e.t === "sub" || e.t === "neg") return true;
  if (e.t === "poly") return e.p.filter(c => !isZero(c)).length > 1 || pLead(e.p).n < 0;
  if (e.t === "num") return e.v.n < 0;
  return false;
}
function wrap(text: string, needed: boolean) {
  return needed ? `(${text})` : text;
}
function fmt(e: E, ctx: Ctx = PLAIN): string {
  switch (e.t) {
    case "num":
      return qStr(e.v);
    case "x":
      return ctx.x;
    case "poly":
      return ctx.times || ctx.x !== "x" ? substPoly(e.p, ctx) : fmtPoly(e.p);
    case "add":
      return join(fmt(e.a, ctx), fmt(e.b, ctx));
    case "sub": {
      const b = fmt(e.b, ctx);
      return `${fmt(e.a, ctx)} − ${wrap(b, sumLike(e.b) || b.startsWith("−"))}`;
    }
    case "neg": {
      const a = fmt(e.a, ctx);
      return `−${wrap(a, sumLike(e.a) || a.startsWith("−"))}`;
    }
    case "mul":
      return fmtProduct(e, ctx);
    case "div": {
      const top = fmt(e.a, ctx);
      const bottom = fmt(e.b, ctx);
      const singleTerm = e.a.t === "poly" && pTrim(e.a.p).filter(c => !isZero(c)).length === 1;
      const wrapTop = (sumLike(e.a) && !singleTerm && !(e.a.t === "num") && !(e.a.t === "neg" && !sumLike(e.a.a))) || / ln|^ln/.test(top);
      const wrapBottom = sumLike(e.b) || e.b.t === "mul" || e.b.t === "div" || (e.b.t === "num" && e.b.v.d !== 1) || (e.b.t === "poly" && pTrim(e.b.p).filter(c => !isZero(c)).length === 1 && !/^x/.test(bottom));
      return `${wrap(top, wrapTop)}/${wrap(bottom, wrapBottom)}`;
    }
    case "pow": {
      const base = fmt(e.a, ctx);
      const simpleBase = e.a.t === "x" || (e.a.t === "num" && e.a.v.n >= 0 && e.a.v.d === 1);
      const b = e.b.t === "num" ? e.b.v : null;
      const exponent = b && b.d === 1 ? sup(b.n) : `^(${fmt(e.b, ctx)})`;
      return `${wrap(base, !simpleBase)}${exponent}`;
    }
    case "fn": {
      const arg = fmt(e.a, ctx);
      if (e.f === "exp") {
        if (isNum(e.a, 1)) return "e";
        const compact = arg.replace(/\s+/g, "");
        if (/^[0-9x+−]+$/.test(compact)) {
          return `e${compact.split("").map(c => SUP_CHARS[c] ?? sup(c)).join("")}`;
        }
        return `e^(${arg})`;
      }
      const atomic = e.a.t === "x" || (e.a.t === "num" && e.a.v.d === 1 && e.a.v.n >= 0);
      if (e.f === "ln") return atomic ? `ln ${arg}` : `ln(${arg})`;
      if (e.f === "lnabs") return `ln|${arg}|`;
      return atomic ? `√${arg}` : `√(${arg})`;
    }
  }
}
function substPoly(p: Poly, ctx: Ctx): string {
  const t = pTrim(p);
  const terms: string[] = [];
  for (let k = t.length - 1; k >= 0; k -= 1) if (!isZero(t[k])) terms.push(mono(t[k], k, ctx.x, ctx.times));
  return join(...terms);
}
const FACTOR_RANK = (e: E): number =>
  e.t === "x" || e.t === "poly" ? 0 : e.t === "pow" && !(e.a.t === "fn") ? 1 : e.t === "fn" ? { sqrt: 2, ln: 3, lnabs: 3, exp: 4 }[e.f] : e.t === "div" ? 5 : 1;
function fmtProduct(e: E, ctx: Ctx): string {
  const factors: E[] = [];
  let coefficient = Q1;
  const collect = (node: E) => {
    if (node.t === "mul") {
      collect(node.a);
      collect(node.b);
    } else if (node.t === "num") coefficient = qMul(coefficient, node.v);
    else if (node.t === "poly" && pTrim(node.p).filter(c => !isZero(c)).length === 1) {
      const k = pDeg(node.p);
      coefficient = qMul(coefficient, pLead(node.p));
      factors.push(k === 1 ? X : pow(X, N(k)));
    }
    else if (node.t === "neg") {
      coefficient = qNeg(coefficient);
      collect(node.a);
    } else factors.push(node);
  };
  collect(e);
  if (!factors.length) return qStr(coefficient);
  const ordered = ctx.times ? factors : [...factors].sort((a, b) => FACTOR_RANK(a) - FACTOR_RANK(b));
  let text = "";
  ordered.forEach((factor, index) => {
    let piece = fmt(factor, ctx);
    piece = wrap(piece, sumLike(factor) || factor.t === "div" || (factor.t === "poly" && index > 0 && /^\d/.test(piece)));
    if (index === 0) text = piece;
    else if (ctx.times) text += `×${piece}`;
    else {
      const prev = ordered[index - 1];
      const isLn = factor.t === "fn" && (factor.f === "ln" || factor.f === "lnabs");
      text += isLn ? ` ${piece}` : prev.t === "fn" && prev.f !== "exp" ? `·${piece}` : piece;
    }
  });
  const abs = qAbs(coefficient);
  const sign = coefficient.n < 0 ? "−" : "";
  if (qEq(abs, Q1)) return `${sign}${text}`;
  const coef = abs.d === 1 ? `${abs.n}` : `(${qStr(abs)})`;
  return `${sign}${coef}${ctx.times ? "×" : /^\d/.test(text) ? "×" : ""}${text}`;
}

// ---------------------------------------------------------------------------
// Reading the student's text
// ---------------------------------------------------------------------------

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺⁽⁾ⁿˣ";
const SUPERSCRIPT_PLAIN = "0123456789-+()nx";
const SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉₋₊";
const SUBSCRIPT_PLAIN = "0123456789-+";

function normText(raw: string): string {
  let t = raw.normalize("NFC").toLowerCase();
  t = t.replace(/[ً-ْـ‎‏‪-‮]/g, "");
  t = t.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
  t = t.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  t = t.replace(/(\d)[٫,](\d)/g, "$1.$2");
  t = t.replace(/[−–—]/g, "-").replace(/[×·∙✕⋅]/g, "*").replace(/÷/g, "/").replace(/[’'ʹ`´]/g, "′");
  t = t.replace(/⟶|-->|->|⇢|↦/g, "→");
  t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺⁽⁾ⁿˣ]+/g, run => `^(${run.split("").map(c => SUPERSCRIPT_PLAIN[SUPERSCRIPT.indexOf(c)]).join("")})`);
  t = t.replace(/[₀₁₂₃₄₅₆₇₈₉₋₊]+/g, run => `_(${run.split("").map(c => SUBSCRIPT_PLAIN[SUBSCRIPT.indexOf(c)]).join("")})`);
  t = t.replace(/\binfinity\b|\binfini\b|\binf\b|\binfty\b/g, "∞").replace(/l′infini/g, "∞");
  return t;
}

const WORDS = ["sqrt", "exp", "ln", "log", "x", "e"];
function splitWord(word: string): string[] | null {
  const out: string[] = [];
  let rest = word;
  while (rest) {
    const hit = WORDS.find(w => rest.startsWith(w));
    if (!hit) return null;
    out.push(hit);
    rest = rest.slice(hit.length);
  }
  return out;
}

type Tok = { k: "num" | "var" | "fn" | "op" | "lp" | "rp"; s: string };
function tokenize(run: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < run.length) {
    const ch = run[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    const number = /^\d+(?:\.\d+)?|^\.\d+/.exec(run.slice(i));
    if (number) {
      toks.push({ k: "num", s: number[0] });
      i += number[0].length;
      continue;
    }
    const word = /^[a-z]+/.exec(run.slice(i));
    if (word) {
      const parts = splitWord(word[0]);
      if (!parts) fail();
      for (const part of parts) toks.push({ k: part === "x" || part === "e" ? "var" : "fn", s: part });
      i += word[0].length;
      continue;
    }
    if (ch === "√") toks.push({ k: "fn", s: "sqrt" });
    else if (ch === "(") toks.push({ k: "lp", s: "(" });
    else if (ch === ")") toks.push({ k: "rp", s: ")" });
    else if ("+-*/^".includes(ch)) toks.push({ k: "op", s: ch });
    else fail();
    i += 1;
  }
  return toks;
}
function emit(toks: Tok[]): string {
  let out = "";
  let prev: Tok | null = null;
  let i = 0;
  const grab = (full: boolean): Tok[] => {
    const g: Tok[] = [];
    if (toks[i]?.k === "op" && (toks[i].s === "-" || toks[i].s === "+")) g.push(toks[i++]);
    if (toks[i]?.k === "num") {
      g.push(toks[i++]);
      if (!full) return g;
    }
    if (toks[i]?.k === "var") g.push(toks[i++]);
    if (!g.some(t => t.k !== "op")) fail();
    return g;
  };
  while (i < toks.length) {
    const tok = toks[i];
    const mulBefore =
      prev && (prev.k === "num" || prev.k === "var" || prev.k === "rp") && (tok.k === "var" || tok.k === "fn" || tok.k === "lp" || (tok.k === "num" && prev.k !== "num"));
    if (mulBefore) out += "*";
    if (tok.k === "fn") {
      i += 1;
      const name = tok.s === "ln" || tok.s === "log" ? "log" : tok.s;
      if (toks[i]?.k === "lp") {
        out += name;
        prev = tok;
        continue;
      }
      out += `${name}(${emit(grab(true))})`;
      prev = { k: "rp", s: ")" };
      continue;
    }
    if (tok.k === "op" && tok.s === "^") {
      i += 1;
      if (toks[i]?.k === "lp") {
        out += "^";
        prev = tok;
        continue;
      }
      const base: Tok | null = prev;
      out += `^(${emit(grab(base?.k === "var" && base.s === "e"))})`;
      prev = { k: "rp", s: ")" };
      continue;
    }
    out += tok.s;
    prev = tok;
    i += 1;
  }
  return out;
}

// mathjs node → our tree
type MjsNode = { type: string; [key: string]: unknown };
function fromMjs(node: MjsNode): E {
  switch (node.type) {
    case "ConstantNode": {
      const value = node.value;
      if (typeof value !== "number") fail();
      return N(qFromNumber(value));
    }
    case "SymbolNode":
      if (node.name === "x") return X;
      if (node.name === "e") return fn("exp", N(1));
      return fail();
    case "ParenthesisNode":
      return fromMjs(node.content as MjsNode);
    case "OperatorNode": {
      const args = (node.args as MjsNode[]).map(fromMjs);
      switch (node.fn) {
        case "add":
          return args.reduce((a, b) => add(a, b));
        case "subtract":
          return sub(args[0], args[1]);
        case "multiply":
          return args.reduce((a, b) => mul(a, b));
        case "divide":
          return div(args[0], args[1]);
        case "unaryMinus":
          return neg(args[0]);
        case "unaryPlus":
          return args[0];
        case "pow": {
          const [base, exponent] = args;
          if (base.t === "fn" && base.f === "exp" && isNum(base.a, 1)) return fn("exp", exponent);
          if (hasX(exponent)) fail();
          return pow(base, exponent);
        }
        default:
          return fail();
      }
    }
    case "FunctionNode": {
      const name = (node.fn as { name?: string }).name;
      const args = node.args as MjsNode[];
      if (args.length !== 1) fail();
      const a = fromMjs(args[0]);
      if (name === "exp") return fn("exp", a);
      if (name === "log") return fn("ln", a);
      if (name === "sqrt") return fn("sqrt", a);
      return fail();
    }
    default:
      return fail();
  }
}
function parseRun(run: string): E {
  const toks = tokenize(run);
  if (!toks.length) fail();
  return fromMjs(mjsParse(emit(toks)) as unknown as MjsNode);
}
const runHasX = (run: string) => {
  try {
    return tokenize(run).some(t => t.k === "var" && t.s === "x");
  } catch {
    return false;
  }
};

/** Longest prefix of t (from start) that reads as a formula. */
function takeRun(t: string, start: number, allowEq: boolean): { text: string; end: number; cut: boolean } {
  let i = start;
  let lastGood = start;
  while (i < t.length) {
    const ch = t[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      i += 1;
      lastGood = i;
      continue;
    }
    if (/[a-z]/.test(ch)) {
      let j = i;
      while (j < t.length && /[a-z]/.test(t[j])) j += 1;
      if (!splitWord(t.slice(i, j))) break;
      i = j;
      lastGood = i;
      continue;
    }
    if ("+-*/^()√".includes(ch) || (allowEq && ch === "=")) {
      i += 1;
      lastGood = i;
      continue;
    }
    break;
  }
  const consumed = t.slice(start, lastGood).trim().replace(/\.$/, "");
  // The formula was cut short when it ends on an operator or runs straight into an unknown word ("x+a", "2sin").
  const attached = lastGood > start && /[a-z|!]/.test(t[lastGood] ?? "") && !/\s/.test(t[lastGood - 1]);
  let text = t.slice(start, lastGood).replace(/[\s+\-*/^=.(]+$/, "").trim();
  const cut = attached || text !== consumed;
  text = text.replace(/\(\s*\)/g, " ").trim();
  // Drop unbalanced brackets at the edges.
  for (let guard = 0; guard < 4; guard += 1) {
    const open = (text.match(/\(/g) ?? []).length;
    const close = (text.match(/\)/g) ?? []).length;
    if (open === close) break;
    if (close > open && text.endsWith(")")) text = text.slice(0, -1).trim();
    else if (open > close && text.startsWith("(")) text = text.slice(1).trim();
    else if (close > open && text.startsWith(")")) text = text.slice(1).trim();
    else return { text: "", end: lastGood, cut: true };
  }
  return { text, end: lastGood, cut };
}
function findRuns(t: string, allowEq: boolean): string[] {
  const runs: string[] = [];
  let i = 0;
  while (i < t.length) {
    const ch = t[i];
    const boundary = i === 0 || !/[a-z]/.test(t[i - 1]);
    if (boundary && /[0-9a-z(√+\-.]/.test(ch)) {
      const run = takeRun(t, i, allowEq);
      if (run.end > i) {
        if (run.text && !run.cut && runHasX(run.text.split("=").join(" "))) runs.push(run.text);
        i = run.end;
        continue;
      }
    }
    if (/[a-z]/.test(ch)) {
      while (i < t.length && /[a-z]/.test(t[i])) i += 1;
    } else i += 1;
  }
  return runs;
}
const longest = (runs: string[]) => runs.reduce<string | null>((best, run) => (!best || run.length > best.length ? run : best), null);

type Def = { name: string; expr: string; start: number; end: number; cut: boolean };
function findDefs(t: string): Def[] {
  const defs: Def[] = [];
  const re = /(?<![a-z])([a-z])\s*\(\s*x\s*\)\s*=|(?<![a-z])(y)\s*=/g;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const run = takeRun(t, m.index + m[0].length, false);
    defs.push({ name: m[1] ?? m[2], expr: run.text, start: m.index, end: run.end, cut: run.cut || !run.text });
  }
  return defs;
}
function cut(t: string, start: number, end: number) {
  return `${t.slice(0, start)} ${t.slice(end)}`;
}

const NUM = String.raw`[-+]?\d+(?:\.\d+)?(?:\/\d+)?`;

type Target = { kind: "inf"; s: 1 | -1 } | { kind: "pt"; a: Q; side: 0 | 1 | -1 };
function findTarget(t: string): { target: Target; start: number; end: number } | null {
  const inf = String.raw`(?:∞|ما\s*لا\s*نهاي[هة]|مالانهاي[هة]|اللانهاي[هة])`;
  const sign = String.raw`(\+|-|زائد|ناقص|plus|moins|موجب|سالب)?`;
  const lead = String.raw`(?:x\s*→\s*|x\s*(?:يروح|راح|تروح|يقترب\s+من)\s*(?:ل|الى|الي|ل\s)?\s*|x\s*(?:tend\s+vers|tends\s+to|approaches|goes\s+to|ي[ؤئ]ول\s+(?:الي|الى|ل)|ت[ؤئ]ول\s+(?:الي|الى|ل))\s*|(?:عند|en|at|في|au\s+voisinage\s+de|بجوار|vers|to)\s+)`;
  const re = new RegExp(`${lead}(?:${sign}\\s*${inf}|(${NUM})(?:\\s*\\^\\(([+-])\\))?)`);
  const m = re.exec(t);
  if (!m) return null;
  if (m[2] === undefined) {
    const s = m[1] && /^(-|ناقص|moins|سالب)$/.test(m[1]) ? -1 : 1;
    return { target: { kind: "inf", s }, start: m.index, end: m.index + m[0].length };
  }
  let side: 0 | 1 | -1 = m[3] === "+" ? 1 : m[3] === "-" ? -1 : 0;
  if (!side) {
    if (/x\s*>\s*[-+]?\d|بقيم\s*اكبر|بقيم\s*موجب|من\s*اليمين|[àa]\s*droite|par\s*valeurs?\s*sup|from\s*the\s*right|from\s*above/.test(t)) side = 1;
    else if (/x\s*<\s*[-+]?\d|بقيم\s*اصغر|بقيم\s*سالب|من\s*اليسار|[àa]\s*gauche|par\s*valeurs?\s*inf|from\s*the\s*left|from\s*below/.test(t)) side = -1;
  }
  return { target: { kind: "pt", a: qParse(m[2]), side }, start: m.index, end: m.index + m[0].length };
}

// ---------------------------------------------------------------------------
// Derivatives — rule by rule
// ---------------------------------------------------------------------------

type DOut = { d: E; steps: string[]; simple: boolean };

function terms(e: E, sign = 1, out: Array<{ sign: number; e: E }> = []) {
  if (e.t === "add") {
    terms(e.a, sign, out);
    terms(e.b, sign, out);
  } else if (e.t === "sub") {
    terms(e.a, sign, out);
    terms(e.b, -sign, out);
  } else if (e.t === "neg") terms(e.a, -sign, out);
  else out.push({ sign, e });
  return out;
}
function isMonomial(e: E): boolean {
  if (e.t === "num" || e.t === "x") return true;
  if (e.t === "poly") return pTrim(e.p).filter(c => !isZero(c)).length <= 1;
  if (e.t === "pow") return e.a.t === "x" && e.b.t === "num" && e.b.v.d === 1 && e.b.v.n >= 0;
  const constant = (c: E) => !hasX(c) && toPoly(c) !== null;
  if (e.t === "mul") return (constant(e.a) && isMonomial(e.b)) || (constant(e.b) && isMonomial(e.a));
  if (e.t === "div") return e.b.t === "num" && isMonomial(e.a);
  if (e.t === "neg") return isMonomial(e.a);
  return false;
}
const isExpandedPoly = (e: E) => terms(e).every(t => isMonomial(t.e));

function monomialLines(p: Poly): string[] {
  const lines: string[] = [];
  for (let k = pDeg(p); k >= 1; k -= 1) {
    const c = pCoef(p, k);
    if (isZero(c)) continue;
    const result = mono(qMul(c, q(k)), k - 1);
    const middle = k === 1 || qEq(c, Q1) ? "" : ` = ${qStr(c)}×${k}${k - 1 === 1 ? "x" : `x${sup(k - 1)}`}`;
    lines.push(`(${mono(c, k)})′${middle} = ${result}`);
  }
  if (!isZero(pCoef(p, 0)) && pDeg(p) > 0) lines.push(`(${qStr(pCoef(p, 0))})′ = 0`);
  return lines;
}

function D(f: E): DOut {
  if (!hasX(f)) return { d: N(0), steps: [], simple: true };
  if (isExpandedPoly(f)) {
    const p = toPoly(f)!;
    return { d: P(pDeriv(p)), steps: monomialLines(p), simple: true };
  }
  switch (f.t) {
    case "add":
    case "sub":
    case "neg": {
      const list = terms(f);
      const polyPart = list.filter(t => isMonomial(t.e));
      const rest = list.filter(t => !isMonomial(t.e));
      const steps: string[] = [];
      let d: E = N(0);
      if (polyPart.length) {
        const p = polyPart.reduce<Poly>((acc, t) => pAdd(acc, pScale(toPoly(t.e)!, q(t.sign))), []);
        steps.push(...monomialLines(p));
        d = P(pDeriv(p));
      }
      for (const term of rest) {
        const inner = D(term.e);
        if (!inner.simple) steps.push(...inner.steps.map(s => `• ${s}`));
        steps.push(`(${fmt(term.e)})′ = ${fmt(simp(inner.d))}`);
        d = term.sign > 0 ? add(d, inner.d) : sub(d, inner.d);
      }
      return { d, steps, simple: false };
    }
    case "mul": {
      if (!hasX(f.a) || !hasX(f.b)) {
        const [k, u] = hasX(f.a) ? [f.b, f.a] : [f.a, f.b];
        const inner = D(u);
        const steps = [...inner.steps];
        steps.push(`(${fmt(show(f))})′ = ${fmt(k)} × (${fmt(u)})′ = ${fmt(k)} × ${wrapText(fmt(simp(inner.d)))}`);
        return { d: mul(k, inner.d), steps, simple: false };
      }
      const u = f.a;
      const v = f.b;
      const du = D(u);
      const dv = D(v);
      const ud = simp(du.d);
      const vd = simp(dv.d);
      const raw = add(mul(ud, v), mul(u, vd));
      const steps = [
        `من الشكل u·v حيث u(x) = ${fmt(u)} و v(x) = ${fmt(v)}`,
        ...(du.simple ? [] : du.steps.map(s => `• ${s}`)),
        ...(dv.simple ? [] : dv.steps.map(s => `• ${s}`)),
        `u′(x) = ${fmt(ud)} و v′(x) = ${fmt(vd)}`,
        `(u·v)′ = u′·v + u·v′ = ${fmt(light(raw), PLAIN)}`,
      ];
      return { d: raw, steps, simple: false };
    }
    case "div": {
      if (!hasX(f.b)) {
        const inner = D(f.a);
        return { d: div(inner.d, f.b), steps: [...inner.steps, `(${fmt(f)})′ = (${fmt(f.a)})′/${fmt(f.b)}`], simple: false };
      }
      const v = f.b;
      const dv = D(v);
      const vd = simp(dv.d);
      if (!hasX(f.a)) {
        const raw = div(neg(mul(f.a, vd)), pow(v, N(2)));
        return {
          d: raw,
          steps: [
            `من الشكل k/v حيث k = ${fmt(f.a)} و v(x) = ${fmt(v)}، و (k/v)′ = −k·v′/v²`,
            ...(dv.simple ? [] : dv.steps.map(s => `• ${s}`)),
            `v′(x) = ${fmt(vd)}`,
          ],
          simple: false,
        };
      }
      const u = f.a;
      const du = D(u);
      const ud = simp(du.d);
      const steps = [
        `من الشكل u/v حيث u(x) = ${fmt(u)} و v(x) = ${fmt(v)}`,
        ...(du.simple ? [] : du.steps.map(s => `• ${s}`)),
        ...(dv.simple ? [] : dv.steps.map(s => `• ${s}`)),
        `u′(x) = ${fmt(ud)} و v′(x) = ${fmt(vd)}`,
        `(u/v)′ = (u′·v − u·v′)/v² = (${fmt(light(mul(ud, v)))} − ${wrapText(fmt(light(mul(u, vd))))})/${fmt(light(pow(v, N(2))))}`,
      ];
      const pu = toPoly(u);
      const pv = toPoly(v);
      if (pu && pv) {
        const top = pSub(pMul(pDeriv(pu), pv), pMul(pu, pDeriv(pv)));
        steps.push(`نبسط البسط: u′·v − u·v′ = ${fmtPoly(top)}`);
        return { d: div(P(top), pow(P(pv), N(2))), steps, simple: false };
      }
      return { d: div(sub(mul(ud, v), mul(u, vd)), pow(v, N(2))), steps, simple: false };
    }
    case "pow": {
      if (hasX(f.b)) fail();
      const n = evalC(f.b, Q0);
      if (!cIsQ(n)) fail();
      const k = n.r;
      if (f.a.t === "x") {
        const d = mul(N(k), pow(X, N(qSub(k, Q1))));
        return { d, steps: [`(${fmt(f)})′ = ${fmt(light(d))}`], simple: true };
      }
      const du = D(f.a);
      const ud = simp(du.d);
      const d = mul(mul(N(k), ud), pow(f.a, N(qSub(k, Q1))));
      return {
        d,
        steps: [
          `من الشكل uⁿ حيث u(x) = ${fmt(f.a)} و n = ${qStr(k)}، و (uⁿ)′ = n·u′·uⁿ⁻¹`,
          ...(du.simple ? [] : du.steps.map(s => `• ${s}`)),
          `u′(x) = ${fmt(ud)}`,
        ],
        simple: false,
      };
    }
    case "fn": {
      const u = f.a;
      if (u.t === "x") {
        const table: Record<Fn, [E, string]> = {
          exp: [fn("exp", X), "(eˣ)′ = eˣ"],
          ln: [div(N(1), X), "(ln x)′ = 1/x"],
          lnabs: [div(N(1), X), "(ln|x|)′ = 1/x"],
          sqrt: [div(N(1), mul(N(2), fn("sqrt", X))), "(√x)′ = 1/(2√x)"],
        };
        const [d, line] = table[f.f];
        return { d, steps: [line], simple: true };
      }
      const du = D(u);
      const ud = simp(du.d);
      const pre = [...(du.simple ? [] : du.steps.map(s => `• ${s}`)), `u′(x) = ${fmt(ud)}`];
      if (f.f === "exp") return { d: mul(ud, f), steps: [`من الشكل eᵘ حيث u(x) = ${fmt(u)}، و (eᵘ)′ = u′·eᵘ`, ...pre], simple: false };
      if (f.f === "ln" || f.f === "lnabs") return { d: div(ud, u), steps: [`من الشكل ln u حيث u(x) = ${fmt(u)}، و (ln u)′ = u′/u`, ...pre], simple: false };
      return { d: div(ud, mul(N(2), f)), steps: [`من الشكل √u حيث u(x) = ${fmt(u)}، و (√u)′ = u′/(2√u)`, ...pre], simple: false };
    }
    default:
      return fail();
  }
}
function wrapText(text: string) {
  return /[+−]/.test(text.slice(1)) || text.startsWith("−") ? `(${text})` : text;
}

// PolyExp: Σ Pᵢ(x)·e^{uᵢ(x)} — used to present (x² + 2x)eˣ-style answers.
type PolyExp = Map<string, { arg: Poly; coef: Poly }>;
function toPolyExp(e: E): PolyExp | null {
  try {
    return pe(e);
  } catch {
    return null;
  }
}
function peMerge(a: PolyExp, b: PolyExp, sign = 1): PolyExp {
  const out: PolyExp = new Map(a);
  for (const [key, value] of Array.from(b.entries())) {
    const old = out.get(key);
    const coef = pScale(value.coef, q(sign));
    out.set(key, { arg: value.arg, coef: old ? pAdd(old.coef, coef) : coef });
  }
  return out;
}
const peKey = (p: Poly) => pTrim(p).map(c => `${c.n}/${c.d}`).join(",");
function pe(e: E): PolyExp {
  const plain = toPoly(e);
  if (plain) return new Map([["", { arg: [], coef: plain }]]);
  switch (e.t) {
    case "fn": {
      if (e.f !== "exp") fail();
      const arg = toPolyStrict(e.a);
      return new Map([[peKey(arg), { arg, coef: [Q1] }]]);
    }
    case "add":
      return peMerge(pe(e.a), pe(e.b));
    case "sub":
      return peMerge(pe(e.a), pe(e.b), -1);
    case "neg":
      return peMerge(new Map(), pe(e.a), -1);
    case "mul": {
      const a = pe(e.a);
      const b = pe(e.b);
      let out: PolyExp = new Map();
      for (const x of Array.from(a.values()))
        for (const y of Array.from(b.values())) {
          const arg = pAdd(x.arg, y.arg);
          out = peMerge(out, new Map([[peKey(arg), { arg, coef: pMul(x.coef, y.coef) }]]));
        }
      return out;
    }
    case "div": {
      const d = toPolyStrict(e.b);
      if (pDeg(d) !== 0) fail();
      return scalePe(pe(e.a), qDiv(Q1, d[0]));
    }
    default:
      return fail();
  }
}
function scalePe(a: PolyExp, k: Q): PolyExp {
  const out: PolyExp = new Map();
  for (const [key, value] of Array.from(a.entries())) out.set(key, { arg: value.arg, coef: pScale(value.coef, k) });
  return out;
}
function peToE(map: PolyExp): E {
  const parts: E[] = [];
  const entries = Array.from(map.values()).filter(v => pTrim(v.coef).length);
  entries.sort((a, b) => pDeg(b.arg) - pDeg(a.arg));
  for (const { arg, coef } of entries) parts.push(pTrim(arg).length ? light(mul(P(coef), fn("exp", P(arg)))) : P(coef));
  if (!parts.length) return N(0);
  return parts.reduce((a, b) => light(add(a, b)));
}

function tidyDerivative(f: E, d: E): E {
  const fp = toPoly(f);
  const core = f.t === "neg" ? f.a : f.t === "mul" && !hasX(f.a) ? f.b : f;
  if (fp && !(core.t === "pow" && hasPowOfSum(core))) return P(pDeriv(fp));
  if (f.t === "div" && hasX(f.b)) {
    const pu = toPoly(f.a);
    const pv = toPoly(f.b);
    if (pu && pv) return light(div(P(pSub(pMul(pDeriv(pu), pv), pMul(pu, pDeriv(pv)))), pow(P(pv), N(2))));
  }
  if (hasFn(f, "exp") && !hasFn(f, "ln") && !hasFn(f, "sqrt")) {
    const map = toPolyExp(d);
    if (map && Array.from(map.values()).some(v => pTrim(v.arg).length)) return peToE(map);
    const quotient = simp(d);
    if (quotient.t === "div") {
      const top = toPolyExp(quotient.a);
      if (top) return light(div(peToE(top), quotient.b));
    }
  }
  return simp(d);
}

function derivativeOf(f: E): { steps: string[]; result: E } {
  const out = D(f);
  const result = tidyDerivative(f, out.d);
  const reference = mjsDerivativeAt(f);
  if (!agreeAt(x => evalN(result, x), reference)) fail();
  return { steps: out.steps, result };
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

type LV = { k: "fin"; c: Const } | { k: "inf"; s: number };
const INF = (s: number): LV => ({ k: "inf", s: s > 0 ? 1 : -1 });
const FIN = (c: Const): LV => ({ k: "fin", c });
const lvText = (v: LV) => (v.k === "inf" ? (v.s > 0 ? "+∞" : "−∞") : cFmt(v.c));
const lvZero = (v: LV) => v.k === "fin" && cVal(v.c) === 0;
function targetText(T: Target): string {
  if (T.kind === "inf") return T.s > 0 ? "+∞" : "−∞";
  return `${qStr(T.a)}${T.side > 0 ? "⁺" : T.side < 0 ? "⁻" : ""}`;
}
const head = (T: Target) => `lim (x → ${targetText(T)})`;
function samplePoints(T: Target, side: number): number[] {
  if (T.kind === "inf") return [10, 100, 1e3, 1e4, 1e6, 1e8].map(v => v * T.s);
  return [1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7].map(h => qVal(T.a) + side * h);
}
/** Sign of e as x approaches the target (from the given side). */
function signNear(e: E, T: Target, side: number): number {
  const xs = samplePoints(T, side).slice(-3);
  const signs = xs.map(x => Math.sign(evalN(e, x))).filter(s => !Number.isNaN(s));
  if (!signs.length || signs.some(s => s !== signs[signs.length - 1]) || signs[signs.length - 1] === 0) fail();
  return signs[signs.length - 1];
}
function sideOf(T: Target): number {
  return T.kind === "pt" ? T.side : 0;
}

function polyLimitInf(p: Poly, s: number): LV {
  const d = pDeg(p);
  if (d <= 0) return FIN(cQ(pCoef(p, 0)));
  return INF(Math.sign(qVal(pLead(p))) * (s < 0 && d % 2 === 1 ? -1 : 1));
}
/** Limit of n/d (polynomials). "split" when the two one-sided limits differ. */
function ratLimit(r: Rat, T: Target): LV | "split" {
  let { n, d } = r;
  if (T.kind === "inf") {
    const dn = pDeg(n);
    const dd = pDeg(d);
    if (dn < 0) return FIN(cQ(Q0));
    const ratio = qDiv(pLead(n), pLead(d));
    if (dn === dd) return FIN(cQ(ratio));
    if (dn < dd) return FIN(cQ(Q0));
    return INF(Math.sign(qVal(ratio)) * (T.s < 0 && (dn - dd) % 2 === 1 ? -1 : 1));
  }
  const root: Poly = [qNeg(T.a), Q1];
  for (let guard = 0; guard < 12; guard += 1) {
    const nv = pEval(n, T.a);
    const dv = pEval(d, T.a);
    if (!isZero(dv)) return FIN(cQ(qDiv(nv, dv)));
    if (isZero(nv) && pDeg(n) >= 0 && n.length) {
      n = pDivmod(n, root).quo;
      d = pDivmod(d, root).quo;
      continue;
    }
    if (!n.length) return FIN(cQ(Q0));
    let mult = 0;
    let rest = d;
    while (isZero(pEval(rest, T.a))) {
      rest = pDivmod(rest, root).quo;
      mult += 1;
    }
    const base = Math.sign(qVal(nv)) * Math.sign(qVal(pEval(rest, T.a)));
    const right = base;
    const left = base * (mult % 2 === 1 ? -1 : 1);
    if (T.side > 0) return INF(right);
    if (T.side < 0) return INF(left);
    return right === left ? INF(right) : "split";
  }
  return fail();
}
/** Growth order used for comparisons (croissances comparées): eᵘ ≫ xⁿ ≫ ln. */
function strength(e: E): number {
  switch (e.t) {
    case "num":
      return 0;
    case "x":
      return 1;
    case "poly":
      return Math.max(0, pDeg(e.p));
    case "fn":
      if (!hasX(e.a)) return 0;
      return e.f === "exp" ? 1000 : e.f === "sqrt" ? strength(e.a) / 2 : 0.001;
    case "neg":
      return strength(e.a);
    case "pow":
      return e.b.t === "num" ? strength(e.a) * Math.abs(qVal(e.b.v)) : strength(e.a);
    case "mul":
      return strength(e.a) + strength(e.b);
    default:
      return Math.max(strength(e.a), strength(e.b));
  }
}
function lim(e: E, T: Target): LV {
  if (!hasX(e)) return FIN(evalC(e, Q0));
  const r = toRat(e);
  if (r) {
    const value = ratLimit(r, T);
    if (value === "split") fail();
    return value;
  }
  const side = sideOf(T);
  switch (e.t) {
    case "neg": {
      const a = lim(e.a, T);
      return a.k === "inf" ? INF(-a.s) : FIN(cNeg(a.c));
    }
    case "add":
    case "sub": {
      const a = lim(e.a, T);
      let b = lim(e.b, T);
      if (e.t === "sub") b = b.k === "inf" ? INF(-b.s) : FIN(cNeg(b.c));
      if (a.k === "fin" && b.k === "fin") return FIN(cAdd(a.c, b.c));
      if (a.k === "inf" && b.k === "inf" && a.s !== b.s) {
        const sa = strength(e.a);
        const sb = strength(e.b);
        if (sa === sb) fail();
        return sa > sb ? a : b;
      }
      return a.k === "inf" ? a : b;
    }
    case "mul": {
      const a = lim(e.a, T);
      const b = lim(e.b, T);
      if (a.k === "fin" && b.k === "fin") return FIN(cMul(a.c, b.c));
      const [fin, inf, finE, infE] = a.k === "fin" ? [a, b, e.a, e.b] : b.k === "fin" ? [b, a, e.b, e.a] : [null, a, null, b];
      if (!fin || !finE) return INF((a as { s: number }).s * (b as { s: number }).s);
      const sInf = (inf as { s: number }).s;
      if (!lvZero(fin)) return INF(sInf * Math.sign(cVal((fin as { c: Const }).c)));
      const sz = strength(finE);
      const si = strength(infE);
      if (sz === si) fail();
      if (sz > si) return FIN(cQ(Q0));
      return INF(sInf * signNear(finE, T, side || 1));
    }
    case "div": {
      const a = lim(e.a, T);
      const b = lim(e.b, T);
      if (b.k === "fin" && !lvZero(b)) return a.k === "fin" ? FIN(cMul(a.c, cInv(b.c))) : INF(a.s * Math.sign(cVal(b.c)));
      if (b.k === "inf") {
        if (a.k === "fin") return FIN(cQ(Q0));
        const sa = strength(e.a);
        const sb = strength(e.b);
        if (sa === sb) fail();
        return sa < sb ? FIN(cQ(Q0)) : INF(a.s * b.s);
      }
      if (a.k === "fin" && !lvZero(a)) {
        if (T.kind === "pt" && !T.side) {
          const r1 = signNear(e.b, T, 1);
          const r2 = signNear(e.b, T, -1);
          if (r1 !== r2) fail();
        }
        return INF(Math.sign(cVal(a.c)) * signNear(e.b, T, side || 1));
      }
      if (a.k === "inf") return INF(a.s * signNear(e.b, T, side || 1));
      return fail();
    }
    case "pow": {
      const k = evalC(e.b, Q0);
      if (!cIsQ(k) || k.r.d !== 1) fail();
      const a = lim(e.a, T);
      if (a.k === "fin") return FIN(cPow(a.c, k.r.n));
      if (k.r.n < 0) return FIN(cQ(Q0));
      return INF(a.s > 0 || k.r.n % 2 === 0 ? 1 : -1);
    }
    case "fn": {
      const a = lim(e.a, T);
      if (e.f === "exp") return a.k === "inf" ? (a.s > 0 ? INF(1) : FIN(cQ(Q0))) : FIN(cExpOf(a.c));
      if (e.f === "sqrt") {
        if (a.k === "inf") return a.s > 0 ? INF(1) : fail();
        if (cVal(a.c) < 0 || !cIsQ(a.c)) fail();
        return FIN(cSqrt(a.c.r));
      }
      if (a.k === "inf") return a.s > 0 || e.f === "lnabs" ? INF(1) : fail();
      if (lvZero(a)) return INF(-1);
      return FIN(cLnOf(e.f === "lnabs" && cVal(a.c) < 0 ? cNeg(a.c) : a.c));
    }
    default:
      return fail();
  }
}
function verifyLimit(f: E, T: Target, value: LV, side: number): boolean {
  const values = samplePoints(T, side || 1)
    .map(x => evalN(f, x))
    .filter(v => !Number.isNaN(v));
  if (!values.length) return false;
  const last = values[values.length - 1];
  if (value.k === "fin") {
    const L = cVal(value.c);
    const tol = (T.kind === "inf" ? 1e-2 : 1e-3) * (1 + Math.abs(L));
    return Number.isFinite(last) && Math.abs(last - L) < tol;
  }
  if (last === value.s * Infinity) return true;
  const tail = values.slice(-3);
  const monotone = tail.every((v, i) => i === 0 || (v - tail[i - 1]) * value.s > 0);
  return monotone && last * value.s > 10;
}

function solveLimit(f: E, target: Target, label: string): Solution {
  let T = target;
  const steps: string[] = [];
  let H = head(T);
  let answer: string;
  const p = toPoly(f);
  const r = toRat(f);
  if (T.kind === "inf" && p) {
    const value = polyLimitInf(p, T.s);
    const d = pDeg(p);
    if (d >= 1) {
      steps.push(`${label} دالة كثير حدود، ونهايتها عند ${targetText(T)} هي نهاية حدّها الأعلى درجة`);
      steps.push(`${H} ${label} = ${H} ${mono(pLead(p), d)}`);
      steps.push(`بما أن ${H} x${d === 1 ? "" : sup(d)} = ${lvText(polyLimitInf([Q0, ...Array(d - 1).fill(Q0), Q1], T.s))} و ${qStr(pLead(p))} ${qVal(pLead(p)) > 0 ? "> 0" : "< 0"}`);
    } else steps.push(`الدالة ثابتة`);
    steps.push(`إذن ${H} ${label} = ${lvText(value)}`);
    answer = `${H} ${label} = ${lvText(value)}`;
    if (!verifyLimit(f, T, value, 0)) fail();
    return { kind: "limit", title: "حساب نهاية", steps, answer };
  }
  if (r && T.kind === "inf") {
    const { n, d } = ratNormalize(r);
    if (f.t !== "div") steps.push(`نوحّد المقامات: ${label} = ${fmt(div(P(n), P(d)))}`);
    const dn = pDeg(n);
    const dd = pDeg(d);
    if (dn >= 1 && dd >= 1) steps.push("بالتعويض المباشر نجد حالة عدم تعيين من الشكل ∞/∞");
    steps.push(`نهاية دالة ناطقة عند ${targetText(T)} هي نهاية حاصل قسمة الحدّين الأعلى درجة`);
    const ratio = qDiv(pLead(n), pLead(d));
    const reduced = dn === dd ? qStr(ratio) : dn > dd ? mono(ratio, dn - dd) : `${qStr(ratio)}/x${dd - dn === 1 ? "" : sup(dd - dn)}`;
    steps.push(`${H} ${label} = ${H} ${mono(pLead(n), dn)}/${wrapText(mono(pLead(d), dd))} = ${H} ${reduced}`);
    const value = ratLimit({ n, d }, T) as LV;
    steps.push(`إذن ${H} ${label} = ${lvText(value)}`);
    if (!verifyLimit(f, T, value, 0)) fail();
    return { kind: "limit", title: "حساب نهاية", steps, answer: `${H} ${label} = ${lvText(value)}` };
  }
  if (r && T.kind === "pt") {
    let { n, d } = ratNormalize(r);
    const a = T.a;
    if (pDeg(d) === 0) {
      const value = FIN(cQ(pEval(n, a)));
      steps.push(`${label} دالة كثير حدود مستمرة على ℝ، نعوّض مباشرة x بـ ${qStr(a)}`);
      steps.push(`${H} ${label} = ${fmt(P(n), { x: subX(a), times: true })} = ${lvText(value)}`);
      if (!verifyLimit(f, T, value, 1) || !verifyLimit(f, T, value, -1)) fail();
      return { kind: "limit", title: "حساب نهاية", steps, answer: `${H} ${label} = ${lvText(value)}` };
    }
    if (f.t !== "div") steps.push(`نوحّد المقامات: ${label} = ${fmt(div(P(n), P(d)))}`);
    const root: Poly = [qNeg(a), Q1];
    let factored = false;
    while (isZero(pEval(d, a)) && isZero(pEval(n, a)) && n.length) {
      if (!factored) steps.push(`بالتعويض نجد حالة عدم تعيين من الشكل 0/0، لأن ${qStr(a)} جذر للبسط وللمقام`);
      const n1 = pDivmod(n, root).quo;
      const d1 = pDivmod(d, root).quo;
      const factorText = (rest: Poly) => `(${fmtPoly(root)})${fmtPoly(rest) === "1" ? "" : `(${fmtPoly(rest)})`}`;
      steps.push(`نحلّل: ${fmtPoly(n)} = ${factorText(n1)} و ${fmtPoly(d)} = ${factorText(d1)}`);
      n = n1;
      d = d1;
      steps.push(`من أجل x ≠ ${qStr(a)}: ${label} = ${fmt(light(div(P(n), P(d))))}`);
      factored = true;
    }
    const nv = pEval(n, a);
    const dv = pEval(d, a);
    if (!isZero(dv)) {
      const value = FIN(cQ(qDiv(nv, dv)));
      if (!factored) steps.push(`المقام لا ينعدم عند ${qStr(a)}، فالدالة مستمرة عنده ونعوّض مباشرة`);
      const quotient = `${qStr(nv)}/${wrapText(qStr(dv))}`;
      steps.push(`${H} ${label} = ${qEq(dv, Q1) || quotient === lvText(value) ? "" : `${quotient} = `}${lvText(value)}`);
      if (!verifyLimit(f, T, value, 1) || !verifyLimit(f, T, value, -1)) fail();
      return { kind: "limit", title: "حساب نهاية", steps, answer: `${H} ${label} = ${lvText(value)}` };
    }
    const asTyped = !factored && f.t === "div" && toPoly(f.a) && toPoly(f.b);
    const denText = asTyped ? fmt(show((f as { b: E }).b)) : fmtPoly(d);
    const numText = asTyped ? fmt(show((f as { a: E }).a)) : fmtPoly(n);
    steps.push(`نهاية البسط ${numText} هي ${qStr(nv)}، ونهاية المقام ${denText} هي 0`);
    const result = ratLimit({ n, d }, { kind: "pt", a, side: 1 }) as LV;
    const resultLeft = ratLimit({ n, d }, { kind: "pt", a, side: -1 }) as LV;
    const signRight = (result as { s: number }).s * Math.sign(qVal(nv));
    const signLeft = (resultLeft as { s: number }).s * Math.sign(qVal(nv));
    const zero = (s: number) => (s > 0 ? "0⁺" : "0⁻");
    const sides = T.side ? [T.side] : [-1, 1];
    for (const s of sides) {
      const lv = s > 0 ? result : resultLeft;
      const ds = s > 0 ? signRight : signLeft;
      steps.push(`لما x → ${qStr(a)}${s > 0 ? "⁺" : "⁻"} (x ${s > 0 ? ">" : "<"} ${qStr(a)}) يكون ${denText} ${ds > 0 ? "> 0" : "< 0"}، أي المقام يؤول إلى ${zero(ds)}`);
      steps.push(`${qStr(nv)}/${zero(ds)} = ${lvText(lv)}، إذن lim (x → ${qStr(a)}${s > 0 ? "⁺" : "⁻"}) ${label} = ${lvText(lv)}`);
      if (!verifyLimit(f, { kind: "pt", a, side: s as 1 | -1 }, lv, s)) fail();
    }
    if (T.side) answer = `${H} ${label} = ${lvText(T.side > 0 ? result : resultLeft)}`;
    else if (lvText(result) === lvText(resultLeft)) answer = `${H} ${label} = ${lvText(result)}`;
    else {
      answer = `lim (x → ${qStr(a)}⁻) ${label} = ${lvText(resultLeft)} و lim (x → ${qStr(a)}⁺) ${label} = ${lvText(result)}`;
      steps.push(`النهايتان من اليمين ومن اليسار مختلفتان، والمستقيم x = ${qStr(a)} مقارب عمودي`);
    }
    return { kind: "limit", title: "حساب نهاية", steps, answer };
  }
  // General functions (eˣ, ln, √): finite point by substitution, otherwise by operations on limits.
  const definedSides = (T.kind === "pt" && !T.side ? [1, -1] : [sideOf(T) || 1]).filter(s => samplePoints(T, s).some(x => !Number.isNaN(evalN(f, x))));
  if (!definedSides.length) fail();
  if (T.kind === "pt" && !T.side && definedSides.length === 1) T = { ...T, side: definedSides[0] as 1 | -1 };
  H = head(T);
  if (T.kind === "pt") {
    const exact = tryEvalC(f, T.a);
    const near = definedSides;
    if (exact && near.every(s => verifyLimit(f, { ...T, side: s as 1 | -1 }, FIN(exact), s))) {
      steps.push(`الدالة مستمرة عند ${qStr(T.a)}، نعوّض مباشرة x بـ ${qStr(T.a)}`);
      steps.push(`${H} ${label} = ${fmt(f, { x: subX(T.a), times: true })} = ${cFmt(exact)}`);
      return { kind: "limit", title: "حساب نهاية", steps, answer: `${H} ${label} = ${cFmt(exact)}` };
    }
  }
  H = head(T);
  const value = lim(f, T);
  steps.push(...limitSteps(f, T));
  steps.push(`إذن ${H} ${label} = ${lvText(value)}`);
  if (!definedSides.every(s => verifyLimit(f, T, value, s))) fail();
  return { kind: "limit", title: "حساب نهاية", steps, answer: `${H} ${label} = ${lvText(value)}` };
}
function subX(a: Q): string {
  return a.n >= 0 && a.d === 1 ? qStr(a) : `(${qStr(a)})`;
}
function limitSteps(f: E, T: Target): string[] {
  const H = head(T);
  const L = (e: E) => `${H} ${fmt(e)} = ${lvText(lim(e, T))}`;
  const steps: string[] = [];
  const compare = "حسب التزايد المقارن: eˣ تتغلب على xⁿ، و xⁿ تتغلب على ln x";
  switch (f.t) {
    case "add":
    case "sub": {
      steps.push(L(f.a), L(f.b));
      const a = lim(f.a, T);
      const b = lim(f.b, T);
      const bs = b.k === "inf" ? (f.t === "sub" ? -b.s : b.s) : 0;
      if (a.k === "inf" && b.k === "inf" && a.s !== bs) {
        steps.push("حالة عدم تعيين من الشكل ∞ − ∞");
        steps.push(`${compare}، فالحد ${fmt(strength(f.a) > strength(f.b) ? f.a : f.b)} هو المهيمن`);
      } else steps.push("بالجمع (نهاية مجموع)");
      break;
    }
    case "mul": {
      steps.push(L(f.a), L(f.b));
      const a = lim(f.a, T);
      const b = lim(f.b, T);
      if ((lvZero(a) && b.k === "inf") || (lvZero(b) && a.k === "inf")) steps.push("حالة عدم تعيين من الشكل 0 × ∞", compare);
      else steps.push("بالضرب (نهاية جداء)");
      break;
    }
    case "div": {
      steps.push(L(f.a), L(f.b));
      const a = lim(f.a, T);
      const b = lim(f.b, T);
      if (a.k === "inf" && b.k === "inf") steps.push("حالة عدم تعيين من الشكل ∞/∞", compare);
      else if (lvZero(b)) steps.push(`المقام يؤول إلى ${signNear(f.b, T, sideOf(T) || 1) > 0 ? "0⁺" : "0⁻"}`);
      else steps.push("بالقسمة (نهاية حاصل قسمة)");
      break;
    }
    case "fn": {
      const inner = lim(f.a, T);
      if (f.a.t === "x") {
        steps.push(`${H} ${fmt(f)} = ${lvText(lim(f, T))} (نهاية مرجعية)`);
        break;
      }
      const name = f.f === "exp" ? "e^X" : f.f === "sqrt" ? "√X" : "ln X";
      steps.push(L(f.a));
      steps.push(`نضع X = ${fmt(f.a)}، و lim (X → ${inner.k === "fin" && cVal(inner.c) === 0 && f.f !== "exp" ? "0⁺" : lvText(inner)}) ${name} = ${lvText(lim(f, T))} (نهاية دالة مركبة)`);
      break;
    }
    case "neg":
      steps.push(L(f.a));
      break;
    default:
      steps.push(L(f));
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Equations
// ---------------------------------------------------------------------------

type Root = { text: string; value: number; c?: Const };
const sAnswer = (roots: Root[]) =>
  roots.length ? `S = {${[...roots].sort((a, b) => a.value - b.value).map(r => r.text).join(" ; ")}}` : "S = ∅";
function lcmDen(p: Poly): number {
  return p.reduce((acc, c) => (acc * c.d) / gcd(acc, c.d), 1);
}
function signedNum(v: number) {
  return v < 0 ? `(${num(v)})` : num(v);
}

function solvePoly(p0: Poly, variable = "x"): { steps: string[]; roots: Root[] } {
  const steps: string[] = [];
  let p = pTrim(p0);
  const scale = lcmDen(p);
  if (scale !== 1) {
    p = pScale(p, q(scale));
    steps.push(`نضرب الطرفين في ${scale}: ${fmtPoly(p, variable)} = 0`);
  }
  const deg = pDeg(p);
  if (deg < 0) return { steps: [...steps, `المساواة محققة دائمًا، كل عدد حقيقي حل`], roots: [{ text: "ℝ", value: 0 }] };
  if (deg === 0) return { steps: [...steps, `${qStr(p[0])} = 0 مساواة خاطئة، إذن المعادلة لا تقبل حلولاً`], roots: [] };
  if (deg === 1) {
    const [b, a] = p;
    const x = qDiv(qNeg(b), a);
    steps.push(`${fmtPoly(p, variable)} = 0 تعني ${mono(a, 1, variable)} = ${qStr(qNeg(b))}`);
    if (!qEq(a, Q1)) steps.push(`أي ${variable} = ${qStr(qNeg(b))}/${wrapText(qStr(a))} = ${qStr(x)}`);
    return { steps, roots: [{ text: qStr(x), value: qVal(x), c: cQ(x) }] };
  }
  if (deg === 2) {
    const [c, b, a] = p.map(v => v.n);
    const delta = b * b - 4 * a * c;
    steps.push(`معادلة من الدرجة الثانية: a = ${num(a)} ، b = ${num(b)} ، c = ${num(c)}`);
    steps.push(`نحسب المميز: Δ = b² − 4ac = ${signedNum(b)}² − 4×${signedNum(a)}×${signedNum(c)} = ${num(b * b)} ${-4 * a * c < 0 ? "−" : "+"} ${num(Math.abs(4 * a * c))} = ${num(delta)}`);
    if (delta < 0) {
      steps.push("Δ < 0، إذن المعادلة لا تقبل حلولاً في ℝ");
      return { steps, roots: [] };
    }
    if (delta === 0) {
      const x0 = q(-b, 2 * a);
      steps.push(`Δ = 0، إذن للمعادلة حل مضاعف: ${variable}₀ = −b/(2a) = ${num(-b)}/${signedNum(2 * a)} = ${qStr(x0)}`);
      return { steps, roots: [{ text: qStr(x0), value: qVal(x0), c: cQ(x0) }] };
    }
    steps.push("Δ > 0، إذن للمعادلة حلان متمايزان:");
    const root = cSqrt(q(delta));
    const rootText = cIsQ(root) ? qStr(root.r) : `√${delta}`;
    const roots: Root[] = [];
    for (const [index, s] of [[0, -1], [1, 1]]) {
      const value = (-b + s * Math.sqrt(delta)) / (2 * a);
      const sub = `${variable}${index ? "₂" : "₁"} = (−b ${s < 0 ? "−" : "+"} √Δ)/(2a) = (${num(-b)} ${s < 0 ? "−" : "+"} ${rootText})/${signedNum(2 * a)}`;
      if (cIsQ(root)) {
        const x = q(-b * root.r.d + s * root.r.n, 2 * a * root.r.d);
        steps.push(`${sub} = ${qStr(x)}`);
        roots.push({ text: qStr(x), value: qVal(x), c: cQ(x) });
      } else {
        const atom = root.atoms[0];
        const text = quadRootText(-b, s * atom.c.n, atom.arg.n, 2 * a);
        steps.push(`${sub} = ${text}`);
        roots.push({ text, value });
      }
    }
    return { steps, roots };
  }
  // Degree ≥ 3: look for a rational root and factor.
  const a0 = Math.abs(p[0].n);
  const an = Math.abs(pLead(p).n);
  const divisors = (n: number) => {
    const out: number[] = [];
    for (let i = 1; i <= Math.min(n, 1000); i += 1) if (n % i === 0) out.push(i);
    return out;
  };
  const candidates: Q[] = a0 === 0 ? [Q0] : divisors(a0).flatMap(pp => divisors(an).flatMap(qq => [q(pp, qq), q(-pp, qq)]));
  const found = candidates.find(r => isZero(pEval(p, r)));
  if (!found) fail();
  const factor: Poly = [qNeg(found), Q1];
  const quo = pDivmod(p, factor).quo;
  steps.push(`نلاحظ أن ${variable} = ${qStr(found)} حل، لأن ${fmtPoly(p, variable)} تنعدم عند ${qStr(found)}`);
  steps.push(`نحلّل: ${fmtPoly(p, variable)} = (${fmtPoly(factor, variable)})(${fmtPoly(quo, variable)})`);
  steps.push(`${fmtPoly(factor, variable)} = 0 أو ${fmtPoly(quo, variable)} = 0`);
  const rest = solvePoly(quo, variable);
  const roots = [{ text: qStr(found), value: qVal(found), c: cQ(found) }, ...rest.roots.filter(r => Math.abs(r.value - qVal(found)) > 1e-12)];
  return { steps: [...steps, ...rest.steps], roots };
}
/** (p + s√t)/den, reduced: "1 + √2", "(5 − √13)/2". */
function quadRootText(p: number, s: number, t: number, den: number): string {
  let g = gcd(gcd(p, s), den);
  if (den < 0) g = -g;
  p /= g;
  s /= g;
  den /= g;
  const radical = `${Math.abs(s) === 1 ? "" : Math.abs(s)}√${t}`;
  const top = p === 0 ? `${s < 0 ? "−" : ""}${radical}` : `${num(p)} ${s < 0 ? "−" : "+"} ${radical}`;
  if (den === 1) return top;
  return p === 0 ? `${top}/${den}` : `(${top})/${den}`;
}

type Term = { coef: Q; core: E | null };
function linearTerms(e: E): Term[] {
  return terms(e).map(({ sign, e: t }) => {
    let coef = q(sign);
    let core: E | null = t;
    const lt = light(t);
    if (lt.t === "num") return { coef: qMul(coef, lt.v), core: null };
    core = lt;
    if (core.t === "mul" && core.a.t === "num") {
      coef = qMul(coef, core.a.v);
      core = core.b;
    }
    if (core.t === "neg") {
      coef = qNeg(coef);
      core = core.a;
    }
    return { coef, core };
  });
}

function solveEquation(lhs: E, rhs: E): Solution {
  const diff = sub(lhs, rhs);
  const steps: string[] = [];
  const shown = `${fmt(light(lhs))} = ${fmt(light(rhs))}`;
  const p = toPoly(diff);
  if (p) {
    const moved = !(rhs.t === "num" && isZero(rhs.v));
    steps.push(moved ? `ننقل كل الحدود إلى الطرف الأول: ${shown} تكافئ ${fmtPoly(p)} = 0` : `المعادلة: ${fmtPoly(p)} = 0`);
    const solved = solvePoly(p);
    steps.push(...solved.steps);
    for (const root of solved.roots) if (root.text !== "ℝ" && Math.abs(evalN(diff, root.value)) > 1e-7 * (1 + Math.abs(root.value))) fail();
    const answer = solved.roots[0]?.text === "ℝ" ? "S = ℝ" : sAnswer(solved.roots);
    steps.push(`مجموعة الحلول: ${answer}${answer === "S = ∅" ? " (لا حلول في ℝ)" : ""}`);
    return { kind: "equation", title: "حل معادلة", steps, answer: answer === "S = ∅" ? "لا حلول في ℝ (S = ∅)" : answer };
  }
  const r = toRat(diff);
  if (r && pDeg(r.d) > 0) {
    steps.push(`شرط الوجود: ${fmtPoly(r.d)} ≠ 0`);
    steps.push(`نوحّد المقامات، فتكافئ المعادلة: ${fmtPoly(r.n)} = 0 مع ${fmtPoly(r.d)} ≠ 0`);
    const solved = solvePoly(r.n);
    steps.push(...solved.steps);
    if (solved.roots[0]?.text === "ℝ") fail();
    const kept = solved.roots.filter(root => Math.abs(pEvalN(r.d, root.value)) > 1e-9);
    for (const root of solved.roots.filter(x => !kept.includes(x))) steps.push(`${root.text} مرفوض لأنه يعدم المقام`);
    for (const root of kept) if (Math.abs(evalN(diff, root.value)) > 1e-7 * (1 + Math.abs(root.value))) fail();
    const answer = sAnswer(kept);
    steps.push(`مجموعة الحلول: ${answer}`);
    return { kind: "equation", title: "حل معادلة", steps, answer: kept.length ? answer : "لا حلول في ℝ (S = ∅)" };
  }
  return solveExpLnEquation(diff, shown);
}

function solveExpLnEquation(diff: E, shown: string): Solution {
  const list = linearTerms(diff);
  let constant = Q0;
  const exps: Array<{ coef: Q; arg: Poly }> = [];
  const lns: Array<{ coef: Q; arg: Poly }> = [];
  for (const t of list) {
    if (!t.core) constant = qAdd(constant, t.coef);
    else if (t.core.t === "fn" && t.core.f === "exp" && toPoly(t.core.a)) exps.push({ coef: t.coef, arg: toPoly(t.core.a)! });
    else if (t.core.t === "fn" && t.core.f === "ln" && toPoly(t.core.a)) lns.push({ coef: t.coef, arg: toPoly(t.core.a)! });
    else if (!hasX(t.core)) {
      const value = evalC(t.core, Q0);
      if (!cIsQ(value)) fail();
      constant = qAdd(constant, qMul(t.coef, value.r));
    } else fail();
  }
  const steps: string[] = [`المعادلة: ${shown}`];
  const finish = (roots: Root[]) => {
    for (const root of roots) if (Math.abs(evalN(diff, root.value)) > 1e-7 * (1 + Math.abs(root.value))) fail();
    const answer = sAnswer(roots);
    steps.push(`مجموعة الحلول: ${answer}`);
    return { kind: "equation" as const, title: "حل معادلة", steps, answer: roots.length ? answer : "لا حلول في ℝ (S = ∅)" };
  };
  if (exps.length && !lns.length) {
    const u = (k: number) => fmt(P(exps[k].arg));
    if (exps.length === 1 && pDeg(exps[0].arg) === 1) {
      const k = qDiv(qNeg(constant), exps[0].coef);
      const E1 = fmt(fn("exp", P(exps[0].arg)));
      steps.push(`المعادلة تكافئ ${E1} = ${qStr(k)}`);
      if (k.n <= 0) {
        steps.push(`مستحيلة لأن ${E1} > 0 من أجل كل x`);
        return finish([]);
      }
      const [beta, alpha] = exps[0].arg;
      steps.push(`بما أن ${qStr(k)} > 0: ${u(0)} = ${cFmt(cLn(k))}`);
      const numerator = cSub(cLn(k), cQ(beta));
      const c = cScale(numerator, qDiv(Q1, alpha));
      const text = cOver(numerator, alpha);
      if (!qEq(alpha, Q1) || !isZero(beta)) steps.push(`x = ${text}`);
      return finish([{ text, value: cVal(c), c }]);
    }
    if (exps.length === 2 && isZero(constant) && qEq(exps[0].coef, qNeg(exps[1].coef))) {
      steps.push(`المعادلة تكافئ e^(${u(0)}) = e^(${u(1)})، والدالة الأسية متباينة، إذن ${u(0)} = ${u(1)}`);
      const solved = solvePoly(pSub(exps[0].arg, exps[1].arg));
      steps.push(...solved.steps);
      return finish(solved.roots);
    }
    // Quadratic in X = eˣ.
    const coeffs: Poly = [constant];
    for (const t of exps) {
      if (pDeg(t.arg) !== 1 || !isZero(pCoef(t.arg, 0))) fail();
      const n = pCoef(t.arg, 1);
      if (n.d !== 1 || n.n < 1 || n.n > 2) fail();
      coeffs[n.n] = qAdd(coeffs[n.n] ?? Q0, t.coef);
    }
    for (let i = 0; i < coeffs.length; i += 1) coeffs[i] = coeffs[i] ?? Q0;
    steps.push(`نضع X = eˣ مع X > 0، فتصبح المعادلة: ${fmtPoly(coeffs, "X")} = 0`);
    const solved = solvePoly(coeffs, "X");
    steps.push(...solved.steps);
    const roots: Root[] = [];
    for (const root of solved.roots) {
      if (root.value <= 0) {
        steps.push(`X = ${root.text} مرفوض لأن X = eˣ > 0`);
        continue;
      }
      if (!root.c || !cIsQ(root.c)) fail();
      const c = cLn(root.c.r);
      steps.push(`eˣ = ${root.text} تعني x = ${cFmt(c)}`);
      roots.push({ text: cFmt(c), value: cVal(c), c });
    }
    return finish(roots);
  }
  if (lns.length && !exps.length) {
    if (lns.length === 1 && pDeg(lns[0].arg) === 1) {
      const k = qDiv(qNeg(constant), lns[0].coef);
      const [beta, alpha] = lns[0].arg;
      const u = fmtPoly(lns[0].arg);
      steps.push(`شرط الوجود: ${u} > 0`);
      steps.push(`المعادلة تكافئ ln(${u}) = ${qStr(k)}، أي ${u} = ${cFmt(cExp(k))}`);
      const numerator = cSub(cExp(k), cQ(beta));
      const c = cScale(numerator, qDiv(Q1, alpha));
      const text = cOver(numerator, alpha);
      if (!qEq(alpha, Q1) || !isZero(beta)) steps.push(`x = ${text}، ويحقق الشرط لأن ${cFmt(cExp(k))} > 0`);
      return finish([{ text, value: cVal(c), c }]);
    }
    if (lns.length === 2 && isZero(constant) && qEq(lns[0].coef, qNeg(lns[1].coef))) {
      const [u, v] = [lns[0].arg, lns[1].arg];
      steps.push(`شرط الوجود: ${fmtPoly(u)} > 0 و ${fmtPoly(v)} > 0`);
      steps.push(`الدالة ln متباينة، إذن المعادلة تكافئ ${fmtPoly(u)} = ${fmtPoly(v)}`);
      const solved = solvePoly(pSub(u, v));
      steps.push(...solved.steps);
      if (solved.roots[0]?.text === "ℝ") fail();
      const kept = solved.roots.filter(r => pEvalN(u, r.value) > 0 && pEvalN(v, r.value) > 0);
      for (const r of solved.roots.filter(x => !kept.includes(x))) steps.push(`${r.text} مرفوض لأنه لا يحقق شرط الوجود`);
      return finish(kept);
    }
  }
  return fail();
}

// ---------------------------------------------------------------------------
// Primitives and integrals
// ---------------------------------------------------------------------------

function positiveEverywhere(p: Poly) {
  return !hasRealRoot(p) && qVal(pLead(p)) > 0;
}
function lnOf(p: Poly): E {
  return positiveEverywhere(p) ? fn("ln", P(p)) : fn("lnabs", P(p));
}
function splitConstant(e: E): { k: Q; g: E } {
  if (e.t === "neg") {
    const inner = splitConstant(e.a);
    return { k: qNeg(inner.k), g: inner.g };
  }
  if (e.t === "mul" && !hasX(e.a)) {
    const c = evalC(e.a, Q0);
    if (cIsQ(c)) {
      const inner = splitConstant(e.b);
      return { k: qMul(c.r, inner.k), g: inner.g };
    }
  }
  if (e.t === "mul" && !hasX(e.b)) return splitConstant(mul(e.b, e.a));
  if (e.t === "div" && !hasX(e.b)) {
    const c = evalC(e.b, Q0);
    if (cIsQ(c)) {
      const inner = splitConstant(e.a);
      return { k: qDiv(inner.k, c.r), g: inner.g };
    }
  }
  return { k: Q1, g: e };
}
function primitiveTerm(term: E): { F: E; rule: string } {
  const { k, g } = splitConstant(term);
  const scale = (F: E, rule: string) => ({ F: light(mul(N(k), F)), rule });
  // (ax + b)ⁿ, n ≠ −1
  if (g.t === "pow" && !hasX(g.b)) {
    const base = toPoly(g.a);
    const n = evalC(g.b, Q0);
    if (base && pDeg(base) === 1 && cIsQ(n)) {
      const alpha = base[1];
      if (qEq(n.r, q(-1))) return scale(mul(N(qDiv(Q1, alpha)), lnOf(base)), "أصلية u′/u هي ln|u|");
      const m = qAdd(n.r, Q1);
      return scale(div(pow(P(base), N(m)), N(qMul(m, alpha))), "أصلية u′·uⁿ هي uⁿ⁺¹/(n + 1)");
    }
  }
  // u′·uⁿ
  if (g.t === "mul") {
    for (const [a, b] of [
      [g.a, g.b],
      [g.b, g.a],
    ]) {
      if (b.t === "pow" && !hasX(b.b)) {
        const pa = toPoly(a);
        const base = toPoly(b.a);
        const n = evalC(b.b, Q0);
        if (pa && base && cIsQ(n) && pDeg(base) >= 1) {
          const ratio = pRatioConst(pa, pDeriv(base));
          if (ratio && !qEq(n.r, q(-1))) {
            const m = qAdd(n.r, Q1);
            return scale(mul(N(ratio), div(pow(P(base), N(m)), N(m))), "أصلية u′·uⁿ هي uⁿ⁺¹/(n + 1)");
          }
        }
      }
    }
  }
  // u′/√u
  if (g.t === "div" && g.b.t === "fn" && g.b.f === "sqrt") {
    const pa = toPoly(g.a);
    const base = toPoly(g.b.a);
    if (pa && base) {
      const ratio = pRatioConst(pa, pDeriv(base));
      if (ratio) return scale(mul(N(qMul(ratio, q(2))), fn("sqrt", P(base))), "أصلية u′/√u هي 2√u");
    }
  }
  // u′/uⁿ with structure
  if (g.t === "div" && g.b.t === "pow" && !hasX(g.b.b)) {
    const pa = toPoly(g.a);
    const base = toPoly(g.b.a);
    const n = evalC(g.b.b, Q0);
    if (pa && base && cIsQ(n) && n.r.d === 1 && n.r.n >= 2 && pDeg(base) >= 1 && g.b.a.t !== "x") {
      const ratio = pRatioConst(pa, pDeriv(base));
      if (ratio) {
        const m = n.r.n - 1;
        return scale(div(N(qNeg(ratio)), mul(N(m), pow(P(base), N(m)))), "أصلية u′/uⁿ هي −1/((n − 1)uⁿ⁻¹)");
      }
    }
  }
  // Rational: c/xᵐ and k·u′/u
  const r = toRat(g);
  if (r && pDeg(r.d) >= 1) {
    const dTerms = r.d.map((c, i) => [c, i] as const).filter(([c]) => !isZero(c));
    if (dTerms.length === 1 && pDeg(r.n) === 0) {
      const [c, m] = dTerms[0];
      const coefficient = qDiv(r.n[0], c);
      if (m === 1) return scale(mul(N(coefficient), fn("lnabs", X)), "أصلية 1/x هي ln|x|");
      return scale(div(N(qDiv(coefficient, q(1 - m))), pow(X, N(m - 1))), "أصلية 1/xⁿ هي −1/((n − 1)xⁿ⁻¹)");
    }
    if (pDeg(r.n) < pDeg(r.d)) {
      const ratio = pRatioConst(r.n, pDeriv(r.d));
      if (ratio) return scale(mul(N(ratio), lnOf(r.d)), "أصلية u′/u هي ln|u|");
    }
  }
  // u′·eᵘ
  const map = toPolyExp(g);
  if (map && map.size === 1) {
    const [{ arg, coef }] = Array.from(map.values());
    if (pDeg(arg) >= 1) {
      const ratio = pRatioConst(coef, pDeriv(arg));
      const rule = fmtPoly(arg) === "x" ? "أصلية eˣ هي eˣ" : pDeg(arg) === 1 && pDeg(coef) <= 0 ? "أصلية e^(ax+b) هي (1/a)e^(ax+b)" : "أصلية u′·eᵘ هي eᵘ";
      if (ratio) return scale(mul(N(ratio), fn("exp", P(arg))), rule);
    }
  }
  if (g.t === "fn" && g.f === "sqrt") {
    const base = toPoly(g.a);
    if (base && pDeg(base) === 1) {
      return scale(div(mul(N(2), mul(P(base), g)), N(qMul(q(3), base[1]))), "أصلية √u·u′ هي (2/3)u√u");
    }
  }
  if (g.t === "fn" && g.f === "ln" && g.a.t === "x") return scale(sub(mul(X, fn("ln", X)), X), "أصلية ln x هي x ln x − x");
  return fail();
}
function primitiveOf(f: E): { F: E; steps: string[] } {
  const list = terms(f);
  const polyPart: Poly[] = [];
  const steps: string[] = [];
  let F: E = N(0);
  for (const { sign, e } of list) {
    const p = toPoly(e);
    const isPowOfLinear = hasPowOfSum(e);
    if (p && !isPowOfLinear) {
      polyPart.push(pScale(p, q(sign)));
      continue;
    }
    const { F: Ft, rule } = primitiveTerm(e);
    const signed = sign > 0 ? Ft : light(neg(Ft));
    const line = `أصلية ${fmt(show(sign > 0 ? e : neg(e)))} هي ${fmt(simp(signed))}`;
    steps.push(rule === line || (sign > 0 && rule.startsWith(`أصلية ${fmt(show(e))} هي`)) ? line : `${line} (${rule})`);
    F = add(F, signed);
  }
  if (polyPart.length) {
    const p = polyPart.reduce((a, b) => pAdd(a, b), []);
    const integral = pInt(p);
    const lines: string[] = [];
    for (let k = pDeg(p); k >= 0; k -= 1) if (!isZero(pCoef(p, k))) lines.push(`أصلية ${mono(pCoef(p, k), k)} هي ${mono(pCoef(integral, k + 1), k + 1)}`);
    steps.unshift("أصلية xⁿ هي xⁿ⁺¹/(n + 1)، ونأخذ أصلية كل حد", ...lines);
    F = add(P(integral), F);
  }
  const result = simp(F);
  const check = mjsDerivativeAt(result);
  if (!agreeAt(check, x => evalN(f, x))) fail();
  return { F: result, steps };
}

// ---------------------------------------------------------------------------
// Task recognition
// ---------------------------------------------------------------------------

const IMAGE = new RegExp(`(?:صوره|صورة|image)\\s*(?:العدد\\s*|de\\s*|of\\s*)?(${NUM})`);
const UNSUPPORTED = /(?<![a-z])(?:sin|cos|tan|cotan|cot|arcsin|arccos|arctan|sh|ch|th|abs|floor|max|min)(?![a-z])|\||π|(?<![a-z])pi(?![a-z])/;
const REJECT = /بين\s*ان|اثبت|برهن|استنتج|ادرس|تغيرات|montrer|d[ée]montrer|prouver|justifier|[ée]tudier|variations?|prove|show\s+that|study|deduce|d[ée]duire/;
const KEYWORDS: Array<[SolverKind | "equation-strong" | "equation-weak", RegExp]> = [
  ["tangent", /مماس|tangente?|طونجونت|تونجانت|تانجانت/],
  ["integral", /∫|تكامل|int[ée]grale?|integral|انتيغرال|انتغرال|انتقرال/],
  ["primitive", /اصلي|primitive|antiderivative|بريميتيف|بريمتيف/],
  ["limit", /نهاي|(?<![a-z])lim|limite?|ليميت|ليمت/],
  ["equation-strong", /حل\s*المعادل|حل\s*في|r[ée]soudre|r[ée]sous|solve/],
  ["derivative", /مشتق|اشتق|d[ée]riv|derivative|differentiate|ديريف|دريف|ديرف|(?<![a-z])[a-z]′/],
  ["equation-weak", /حل|نحل|معادل|[ée]quation/],
];

function functionFrom(t: string, defs: Def[]): { f: E; name: string; rest: string } | null {
  const def = defs.find(d => d.expr && runHasX(d.expr));
  if (def) return { f: parseRun(def.expr), name: def.name, rest: cut(t, def.start, def.end) };
  const run = longest(findRuns(t, false));
  if (!run) return null;
  return { f: parseRun(run), name: "", rest: t };
}

function solveText(raw: string): Solution | null {
  const t = normText(raw);
  if (REJECT.test(t)) return null;
  if (UNSUPPORTED.test(t)) return null;
  const defs = findDefs(t);
  if (defs.some(d => d.cut)) return null;
  const eqRuns = () => findRuns(t, true).filter(run => run.includes("="));
  const outsideEq = eqRuns().filter(run => !defs.some(d => d.expr && run.endsWith(d.expr) && t.includes(`=${d.expr}`) && run === d.expr));
  let kind: SolverKind | null = null;
  for (const [name, re] of KEYWORDS) {
    if (!re.test(t)) continue;
    if (name === "equation-strong" || name === "equation-weak") {
      if (outsideEq.length || defs.length >= 2) {
        kind = "equation";
        break;
      }
      continue;
    }
    kind = name;
    break;
  }
  if (!kind && defs.length && (new RegExp(`(?<![a-z])${defs[0].name}\\(\\s*${NUM}\\s*\\)`).test(t) || IMAGE.test(t))) kind = "value";
  if (!kind) return null;

  switch (kind) {
    case "derivative": {
      const source = functionFrom(t, defs);
      if (!source) return null;
      const name = source.name || "f";
      const { steps: ruleSteps, result } = derivativeOf(source.f);
      const label = name === "y" ? "y′" : `${name}′(x)`;
      const steps = [
        `${name === "y" ? "y" : `${name}(x)`} = ${fmt(show(source.f))}`,
        `الدالة ${name} قابلة للاشتقاق على مجال تعريفها، ونشتق باستعمال القواعد:`,
        ...ruleSteps,
        `إذن ${label} = ${fmt(result)}`,
      ];
      const at = new RegExp(`(?<![a-z])[a-z]′\\s*\\(\\s*(${NUM})\\s*\\)`).exec(t);
      if (at) {
        const a = qParse(at[1]);
        const value = evalC(result, a);
        const check = mjsDerivativeAt(source.f)(qVal(a));
        if (!Number.isFinite(check) || Math.abs(check - cVal(value)) > 1e-6 * (1 + Math.abs(check))) return null;
        steps.push(`${name}′(${qStr(a)}) = ${fmt(result, { x: subX(a), times: true })} = ${cFmt(value)}`);
        return { kind, title: "حساب المشتقة", steps, answer: `${name}′(${qStr(a)}) = ${cFmt(value)}` };
      }
      return { kind, title: "حساب الدالة المشتقة", steps, answer: `${label} = ${fmt(result)}` };
    }
    case "limit": {
      const found = findTarget(t);
      if (!found) return null;
      const text = cut(t, found.start, found.end);
      const source = functionFrom(text, findDefs(text));
      if (!source) return null;
      const shown = show(source.f);
      const label = source.name ? `${source.name}(x)` : wrap(fmt(shown), shown.t === "add" || shown.t === "sub");
      return solveLimit(source.f, found.target, label);
    }
    case "equation": {
      let lhs: E;
      let rhs: E;
      const fnDef = defs.find(d => d.expr && runHasX(d.expr));
      const constDef = defs.find(d => d.expr && !runHasX(d.expr) && d !== fnDef);
      if (fnDef && constDef) {
        lhs = parseRun(fnDef.expr);
        rhs = parseRun(constDef.expr);
      } else {
        const run = eqRuns().find(r => r.split("=").length === 2 && !defs.some(d => d.expr && r.endsWith(d.expr) && r.startsWith("=") ));
        if (!run) return null;
        const [left, right] = run.split("=");
        if (!left.trim() || !right.trim()) return null;
        lhs = parseRun(left);
        rhs = parseRun(right);
      }
      if (!hasX(lhs) && !hasX(rhs)) return null;
      return solveEquation(lhs, rhs);
    }
    case "primitive": {
      const source = functionFrom(t, defs);
      if (!source) return null;
      const name = source.name || "f";
      const { F, steps } = primitiveOf(source.f);
      const big = name.toUpperCase();
      return {
        kind,
        title: "الدوال الأصلية",
        steps: [`${name}(x) = ${fmt(show(source.f))}`, ...steps, `الدوال الأصلية للدالة ${name} هي ${big}(x) = ${fmt(F)} + C حيث C ثابت حقيقي`],
        answer: `${big}(x) = ${fmt(F)} + C`,
      };
    }
    case "integral": {
      const bounds = findBounds(t);
      if (!bounds) return null;
      const text = cut(t, bounds.start, bounds.end).replace(/∫/g, " ");
      const source = functionFrom(text, findDefs(text));
      if (!source) return null;
      return solveIntegral(source.f, bounds.a, bounds.b);
    }
    case "tangent": {
      const source = functionFrom(t, defs);
      if (!source) return null;
      const a = findPoint(source.rest);
      if (!a) return null;
      return solveTangent(source.f, source.name || "f", a);
    }
    case "value": {
      const def = defs[0];
      const m = new RegExp(`(?<![a-z])${def.name}\\(\\s*(${NUM})\\s*\\)`).exec(t) ?? IMAGE.exec(t);
      if (!m || !def.expr) return null;
      return solveValue(parseRun(def.expr), def.name, qParse(m[1]));
    }
  }
  return null;
}

function findBounds(t: string): { a: Q; b: Q; start: number; end: number } | null {
  const patterns = [
    new RegExp(`∫\\s*_\\s*[({]?\\s*(${NUM})\\s*[)}]?\\s*\\^\\s*[({]?\\s*(${NUM})\\s*[)}]?`),
    new RegExp(`(?:من|de|from|entre|بين)\\s*(${NUM})\\s*(?:الي|الى|ل|حتى|à|a|to|et|and|و)\\s*(${NUM})`),
    new RegExp(`\\[\\s*(${NUM})\\s*[;,،]\\s*(${NUM})\\s*\\]`),
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) return { a: qParse(m[1]), b: qParse(m[2]), start: m.index, end: m.index + m[0].length };
  }
  return null;
}
function findPoint(t: string): Q | null {
  const patterns = [
    new RegExp(`(?<![a-z(])x(?:_\\(0\\)|0)?\\s*=\\s*(${NUM})`),
    new RegExp(`(?:الفاصله|الفاصلة|فاصلتها|abscisse|abscissa)\\s*(${NUM})`),
    new RegExp(`(?:عند|en|at|في|au point|point)\\s*(${NUM})`),
    new RegExp(`(?<![a-z])a\\s*=\\s*(${NUM})`),
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) return qParse(m[1]);
  }
  return null;
}
const SUB_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
const subText = (a: Q) => qStr(a).replace(/\d/g, d => SUB_DIGITS[Number(d)]).replace("−", "₋");

function solveIntegral(f: E, a: Q, b: Q): Solution {
  const lo = Math.min(qVal(a), qVal(b));
  const hi = Math.max(qVal(a), qVal(b));
  for (let i = 0; i <= 400; i += 1) {
    const v = evalN(f, lo + ((hi - lo) * i) / 400);
    if (!Number.isFinite(v)) fail();
  }
  const r = toRat(f);
  if (r && pDeg(r.d) > 0) {
    let previous = Math.sign(pEvalN(r.d, lo));
    for (let i = 1; i <= 2000; i += 1) {
      const s = Math.sign(pEvalN(r.d, lo + ((hi - lo) * i) / 2000));
      if (s === 0 || s !== previous) fail();
      previous = s;
    }
  }
  const { F, steps: primSteps } = primitiveOf(f);
  const Fb = evalC(F, b);
  const Fa = evalC(F, a);
  const I = cSub(Fb, Fa);
  // Simpson's rule as an independent check.
  const n = 2000;
  const h = (qVal(b) - qVal(a)) / n;
  let sum = evalN(f, qVal(a)) + evalN(f, qVal(b));
  for (let i = 1; i < n; i += 1) sum += (i % 2 ? 4 : 2) * evalN(f, qVal(a) + i * h);
  const numeric = (sum * h) / 3;
  if (!Number.isFinite(numeric) || Math.abs(numeric - cVal(I)) > 1e-6 * (1 + Math.abs(numeric))) fail();
  const shown = show(f);
  const integral = `∫${subText(a)}${sup(qStr(b).replace("−", "-"))} ${wrap(fmt(shown), shown.t === "add" || shown.t === "sub" || shown.t === "poly")} dx`;
  const steps = [
    `I = ${integral}`,
    `الدالة f(x) = ${fmt(show(f))} مستمرة على المجال [${qStr(a)} ; ${qStr(b)}]، نبحث عن دالة أصلية لها:`,
    ...primSteps,
    `دالة أصلية: F(x) = ${fmt(F)}`,
    `I = [F(x)] من ${qStr(a)} إلى ${qStr(b)} = F(${qStr(b)}) − F(${qStr(a)})`,
    `F(${qStr(b)}) = ${cFmt(Fb)} و F(${qStr(a)}) = ${cFmt(Fa)}`,
    cVal(Fa) === 0 && cIsQ(Fa) ? `I = ${cFmt(I)}` : `I = ${cFmt(Fb)} − ${wrapText(cFmt(Fa))}${cFmt(I) === `${cFmt(Fb)} − ${cFmt(Fa)}` ? "" : ` = ${cFmt(I)}`}`,
  ];
  return { kind: "integral", title: "حساب تكامل", steps, answer: `I = ${cFmt(I)}` };
}

function slopeOf(m: Const): string {
  const text = cFmt(m);
  if (text === "1") return "";
  if (text === "−1") return "−";
  return wrapText(text);
}
function solveTangent(f: E, name: string, a: Q): Solution {
  const fa = evalC(f, a);
  const { result } = derivativeOf(f);
  const m = evalC(result, a);
  const reference = mjsDerivativeAt(f)(qVal(a));
  if (!Number.isFinite(reference) || Math.abs(reference - cVal(m)) > 1e-6 * (1 + Math.abs(reference))) fail();
  if (Math.abs(evalN(f, qVal(a)) - cVal(fa)) > 1e-9 * (1 + Math.abs(cVal(fa)))) fail();
  const p = cSub(fa, cScale(m, a));
  const slope = cIsQ(m) ? (qEq(m.r, Q1) ? "x" : qEq(m.r, q(-1)) ? "−x" : mono(m.r, 1)) : single(m) ? `${cFmt(m)}x` : `(${cFmt(m)})x`;
  const line = isZero(m.r) && cIsQ(m) ? cFmt(p) : join(slope, cVal(p) === 0 && cIsQ(p) ? "0" : cFmt(p));
  const A = qStr(a);
  const steps = [
    `معادلة المماس للمنحنى عند النقطة ذات الفاصلة ${A}: y = ${name}′(${A})(x − ${wrapText(A)}) + ${name}(${A})`,
    `${name}(${A}) = ${fmt(f, { x: subX(a), times: true })} = ${cFmt(fa)}`,
    `${name}′(x) = ${fmt(result)}`,
    `${name}′(${A}) = ${fmt(result, { x: subX(a), times: true })} = ${cFmt(m)}`,
    `y = ${join(`${slopeOf(m)}${isZero(a) ? "x" : `(${fmtPoly([qNeg(a), Q1])})`}`, cFmt(fa))}`,
    `إذن معادلة المماس: y = ${line}`,
  ];
  return { kind: "tangent", title: "معادلة المماس", steps, answer: `y = ${line}` };
}

function solveValue(f: E, name: string, a: Q): Solution {
  const A = qStr(a);
  const value = tryEvalC(f, a);
  const numeric = evalN(f, qVal(a));
  const steps = [`${name}(x) = ${fmt(show(f))}`, `نعوّض x بـ ${A}:`, `${name}(${A}) = ${fmt(light(f), { x: subX(a), times: true })}`];
  if (!value || !Number.isFinite(numeric)) {
    if (Number.isFinite(numeric)) fail();
    steps.push(`العدد ${A} لا ينتمي إلى مجموعة تعريف الدالة ${name}`);
    return { kind: "value", title: "حساب صورة عدد", steps, answer: `${name}(${A}) غير معرّفة` };
  }
  if (Math.abs(cVal(value) - numeric) > 1e-9 * (1 + Math.abs(numeric))) fail();
  const p = toPoly(f);
  if (p && isExpandedPoly(f) && p.filter(c => !isZero(c)).length > 1) {
    const parts: string[] = [];
    for (let k = pDeg(p); k >= 0; k -= 1) if (!isZero(pCoef(p, k))) parts.push(qStr(qMul(pCoef(p, k), qPow(a, k))));
    steps.push(`= ${join(...parts)}`);
  }
  steps.push(`= ${cFmt(value)}`);
  return { kind: "value", title: "حساب صورة عدد", steps, answer: `${name}(${A}) = ${cFmt(value)}` };
}

/**
 * Solves a typed BAC exercise. Returns null when the task is not
 * recognised or cannot be solved with certainty — a human teacher answers.
 */
export function solveExercise(text: string): Solution | null {
  if (typeof text !== "string" || !text.trim() || text.length > 2000) return null;
  try {
    const solution = solveText(text);
    if (!solution || !solution.steps.length || !solution.answer) return null;
    return solution;
  } catch (error) {
    if (error instanceof Unsupported) return null;
    return null;
  }
}
