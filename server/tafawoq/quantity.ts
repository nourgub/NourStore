// Physical quantities in answers: the whole answer is read (a number, an
// optional power of ten, an optional unit — or a plain arithmetic
// expression), never just its first number. Units are reduced to SI with
// their dimensions, so 200 cm = 2 m is accepted, 2 kg for 2 m is refused,
// and "2+100" is read as 102, not 2.

/** Dimensions as exponents of [length, mass, time, current, temperature, amount, luminous intensity]. */
type Dims = [number, number, number, number, number, number, number];
type Unit = { factor: number; dims: Dims };

const D = (l = 0, m = 0, t = 0, i = 0, th = 0, n = 0, j = 0): Dims => [l, m, t, i, th, n, j];

const BASE: Record<string, Unit> = {
  m: { factor: 1, dims: D(1) },
  g: { factor: 1e-3, dims: D(0, 1) },
  t: { factor: 1e3, dims: D(0, 1) }, // tonne
  s: { factor: 1, dims: D(0, 0, 1) },
  min: { factor: 60, dims: D(0, 0, 1) },
  h: { factor: 3600, dims: D(0, 0, 1) },
  day: { factor: 86400, dims: D(0, 0, 1) },
  yr: { factor: 3.15576e7, dims: D(0, 0, 1) },
  A: { factor: 1, dims: D(0, 0, 0, 1) },
  K: { factor: 1, dims: D(0, 0, 0, 0, 1) },
  mol: { factor: 1, dims: D(0, 0, 0, 0, 0, 1) },
  L: { factor: 1e-3, dims: D(3) },
  l: { factor: 1e-3, dims: D(3) },
  N: { factor: 1, dims: D(1, 1, -2) },
  J: { factor: 1, dims: D(2, 1, -2) },
  W: { factor: 1, dims: D(2, 1, -3) },
  Pa: { factor: 1, dims: D(-1, 1, -2) },
  bar: { factor: 1e5, dims: D(-1, 1, -2) },
  C: { factor: 1, dims: D(0, 0, 1, 1) },
  V: { factor: 1, dims: D(2, 1, -3, -1) },
  Ω: { factor: 1, dims: D(2, 1, -3, -2) },
  ohm: { factor: 1, dims: D(2, 1, -3, -2) },
  F: { factor: 1, dims: D(-2, -1, 4, 2) },
  H: { factor: 1, dims: D(2, 1, -2, -2) },
  T: { factor: 1, dims: D(0, 1, -2, -1) },
  Hz: { factor: 1, dims: D(0, 0, -1) },
  Bq: { factor: 1, dims: D(0, 0, -1) },
  eV: { factor: 1.602176634e-19, dims: D(2, 1, -2) },
  u: { factor: 1.66053906660e-27, dims: D(0, 1) },
  M: { factor: 1e3, dims: D(-3, 0, 0, 0, 0, 1) }, // mol/L
};

const PREFIXES: Record<string, number> = {
  G: 1e9, M: 1e6, k: 1e3, h: 1e2, d: 1e-1, c: 1e-2, m: 1e-3, µ: 1e-6, μ: 1e-6, u: 1e-6, n: 1e-9, p: 1e-12,
};

/** Arabic names students write, mapped to symbols. */
const ARABIC_UNITS: Array<[RegExp, string]> = [
  [/^(?:متر|م)$/, "m"],
  [/^(?:سنتيمتر|سم)$/, "cm"],
  [/^(?:مليمتر|مم)$/, "mm"],
  [/^(?:كيلومتر|كلم)$/, "km"],
  [/^(?:كيلوغرام|كغ)$/, "kg"],
  [/^(?:غرام|غ)$/, "g"],
  [/^(?:ثانية|ثا)$/, "s"],
  [/^(?:دقيقة|د)$/, "min"],
  [/^(?:ساعة|ساعات|سا)$/, "h"],
  [/^(?:يوم|أيام|يوما|يوماً)$/, "day"],
  [/^(?:سنة|سنوات|عام)$/, "yr"],
  [/^(?:مول)$/, "mol"],
  [/^(?:ميلي ?مول)$/, "mmol"],
  [/^بكريل$/, "Bq"],
  [/^نيوتن$/, "N"],
  [/^جول$/, "J"],
  [/^واط$/, "W"],
  [/^(?:فولط|فولت)$/, "V"],
  [/^أمبير$/, "A"],
  [/^كولوم$/, "C"],
  [/^هرتز$/, "Hz"],
  [/^مول$/, "mol"],
  [/^أوم$/, "Ω"],
];

const SUPERSCRIPT: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };

function lookup(symbol: string): Unit | null {
  if (BASE[symbol]) return BASE[symbol];
  // A prefixed unit: km, ms, µC, mJ, kΩ, MeV… (not for min/h/mol, read whole above).
  for (const [prefix, factor] of Object.entries(PREFIXES)) {
    if (symbol.startsWith(prefix) && symbol.length > prefix.length) {
      const base = BASE[symbol.slice(prefix.length)];
      if (base) return { factor: factor * base.factor, dims: base.dims };
    }
  }
  return null;
}

/** A unit expression: "m/s²", "m.s^-2", "m·s⁻¹", "mol/L", "kg·m/s", "µC". Null when not a unit. */
export function parseUnit(raw: string): Unit | null {
  let text = raw.trim();
  for (const [pattern, symbol] of ARABIC_UNITS) if (pattern.test(text)) text = symbol;
  // Arabic unit names inside a compound unit: "ساعة⁻¹", "مول/لتر".
  text = text.replace(/[\u0621-\u064A]+/g, word => ARABIC_UNITS.find(([pattern]) => pattern.test(word))?.[1] ?? (word === "لتر" ? "L" : word));
  text = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, run => "^" + Array.from(run).map(c => SUPERSCRIPT[c]).join(""));
  const result: Unit = { factor: 1, dims: D() };
  let sign = 1;
  // Tokens: unit symbols with optional exponents, separated by * · . or /.
  const tokens = text.split(/\s*([/·*.]|\s)\s*/).filter(token => token !== "" && token !== " ");
  if (!tokens.length) return null;
  for (const token of tokens) {
    if (token === "/") {
      sign = -1;
      continue;
    }
    if (token === "·" || token === "*" || token === ".") continue;
    const match = /^([A-Za-zµμΩ]+)(?:\^?([+-]?\d+))?$/.exec(token);
    if (!match) return null;
    const unit = lookup(match[1]);
    if (!unit) return null;
    const power = sign * (match[2] ? Number(match[2]) : 1);
    result.factor *= unit.factor ** power;
    result.dims = result.dims.map((value, index) => value + unit.dims[index] * power) as Dims;
  }
  return result;
}

const sameDims = (a: Dims, b: Dims) => a.every((value, index) => value === b[index]);

function normalize(text: string): string {
  return text
    .trim()
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[−–—]/g, "-")
    .replace(/٫/g, ".")
    .replace(/(\d)\s*[,،]\s*(\d)/g, "$1.$2")
    .replace(/\s+/g, " ");
}

/** A plain arithmetic expression (digits, + − × ÷ ^, parentheses), or null. No variables. */
function evaluateArithmetic(text: string): number | null {
  const source = text.replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  if (!/^[\d.+\-*/^()eE]+$/.test(source) || !/[+\-*/^]/.test(source.replace(/^[+-]/, "").replace(/e[+-]/gi, ""))) return null;
  let index = 0;
  const peek = () => source[index];
  const number = (): number => {
    const match = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(index));
    if (!match) throw new Error("number expected");
    index += match[0].length;
    return Number(match[0]);
  };
  const primary = (): number => {
    if (peek() === "(") {
      index += 1;
      const value = sum();
      if (peek() !== ")") throw new Error(") expected");
      index += 1;
      return value;
    }
    if (peek() === "-") {
      index += 1;
      return -primary();
    }
    if (peek() === "+") {
      index += 1;
      return primary();
    }
    return number();
  };
  const power = (): number => {
    const base = primary();
    if (peek() === "^") {
      index += 1;
      return base ** power();
    }
    return base;
  };
  const product = (): number => {
    let value = power();
    while (peek() === "*" || peek() === "/") {
      const op = source[index++];
      const right = power();
      value = op === "*" ? value * right : value / right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const op = source[index++];
      const right = product();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  };
  try {
    const value = sum();
    return index === source.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export type ParsedAnswer =
  | { kind: "quantity"; value: number; unit: Unit | null; unitText: string }
  | { kind: "unreadable" };

/**
 * The whole answer as a quantity: "2", "2 m", "2,5 s", "1.2×10⁻³ mol",
 * "1,2 x 10^-3 mol/L", "٢٠٠ سم", or an arithmetic expression ("2+100" →
 * 102, "3/4" → 0.75). Anything else — words, a number followed by something
 * that is not a unit — is unreadable, never "its first number".
 */
export function parseAnswer(raw: string): ParsedAnswer {
  let text = normalize(raw).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, run => "^" + Array.from(run).map(c => SUPERSCRIPT[c]).join(""));
  // Power of ten written out: 1.2×10^-3, 1.2 x 10^(-3), 1.2*10^-3, 1.2.10^-3.
  text = text.replace(/(\d)\s*(?:[×x*·]|\.)\s*10\s*\^\s*\(?\s*([+-]?\d+)\s*\)?/i, "$1e$2");
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(.*)$/i.exec(text);
  if (match) {
    const value = Number(match[1]);
    const rest = match[2].trim();
    if (!rest && Number.isFinite(value)) return { kind: "quantity", value, unit: null, unitText: "" };
    const unit = parseUnit(rest);
    if (unit && Number.isFinite(value)) return { kind: "quantity", value, unit, unitText: rest };
  }
  const computed = evaluateArithmetic(text);
  if (computed !== null) return { kind: "quantity", value: computed, unit: null, unitText: "" };
  return { kind: "unreadable" };
}

export type QuantityGrade =
  | { status: "correct"; credit: 1 }
  | { status: "incorrect"; credit: number; reason: "wrong_value" | "wrong_unit" | "missing_unit" }
  | { status: "unmatched"; credit: 0; reason: "unreadable" };

export type QuantityRule = {
  /** The unit the answer is expected in ("m/s²", "mJ"…); null when the item has none. */
  unit: string | null;
  /** Whether an answer without a unit loses credit (default: no). */
  unitRequired?: boolean;
  /** Relative tolerance (default 2 %). */
  tolerance?: number;
};

/**
 * Grades `given` against the expected values (in `rule.unit`). The value is
 * compared in SI after conversion; a unit of the wrong kind is wrong; a
 * missing unit is fine unless `unitRequired`, then the value earns half
 * credit (the computation was right, the answer incomplete).
 */
export function gradeQuantity(expected: number[], given: string, rule: QuantityRule): QuantityGrade {
  const parsed = parseAnswer(given);
  if (parsed.kind === "unreadable") return { status: "unmatched", credit: 0, reason: "unreadable" };
  const tolerance = rule.tolerance ?? 0.02;
  const expectedUnit = rule.unit ? parseUnit(rule.unit) : null;
  let value = parsed.value;
  if (parsed.unit) {
    // A unit we cannot compare with (the item has none): judge the number in the student's unit only if it is dimensionless-compatible.
    if (!expectedUnit) return { status: "incorrect", credit: 0, reason: "wrong_unit" };
    if (!sameDims(parsed.unit.dims, expectedUnit.dims)) return { status: "incorrect", credit: 0, reason: "wrong_unit" };
    value = (parsed.value * parsed.unit.factor) / expectedUnit.factor;
  }
  const close = expected.some(target =>
    target === 0 ? Math.abs(value) < 1e-9 : Math.abs(value - target) <= Math.abs(target) * tolerance
  );
  if (!close) return { status: "incorrect", credit: 0, reason: "wrong_value" };
  if (!parsed.unit && rule.unitRequired && expectedUnit) return { status: "incorrect", credit: 0.5, reason: "missing_unit" };
  return { status: "correct", credit: 1 };
}

/**
 * The unit a question asks for, read from its wording when the item does not
 * declare one: "بالـ m/s²", "(m/s)", "بالمتر", "بالميلي ثانية", "(بالميكروكولوم µC)".
 */
const UNIT_WORDS: Array<[RegExp, string]> = [
  [/بالمتر/, "m"],
  [/بالكيلومتر|بالكلم/, "km"],
  [/بالسنتيمتر/, "cm"],
  [/بالثانية|بالثواني/, "s"],
  [/بالميلي ?ثانية/, "ms"],
  [/بالدقائق|بالدقيقة/, "min"],
  [/بالساعات|بالساعة/, "h"],
  [/بالأيام|باليوم|بالـ ?يوم|بعد كم يوم/, "day"],
  [/بالسنوات|بالسنة/, "yr"],
  [/بالميلي ?مول/, "mmol"],
  [/بالمول/, "mol"],
  [/بالكيلوغرام/, "kg"],
  [/بالغرام/, "g"],
  [/بالبكريل/, "Bq"],
  [/بالفولط/, "V"],
  [/بالجول/, "J"],
  [/بالنيوتن/, "N"],
  [/بالواط/, "W"],
  [/بالكولوم/, "C"],
  [/بالأمبير/, "A"],
];

export function unitFromPrompt(prompt: string): string | null {
  // An explicit symbol after "بالـ" or between parentheses wins: "بالـ m/s²", "(m/s)", "(بالميلي جول mJ)".
  const symbol =
    /بالـ\s*([A-Za-zµμΩ][A-Za-zµμΩ/·.^⁰¹²³⁴⁵⁶⁷⁸⁹⁻\-\d]*)/.exec(prompt)?.[1] ??
    /\(\s*(?:[؀-ۿ ]+\s)?([A-Za-zµμΩ][A-Za-zµμΩ/·.^⁰¹²³⁴⁵⁶⁷⁸⁹⁻\-\d]*)\s*\)/.exec(prompt)?.[1];
  if (symbol && parseUnit(symbol)) return symbol;
  // "بوحدة ساعة⁻¹", "بـ mol/L": a unit written after these words.
  const named = /(?:بوحدة|بـ)\s*([^\s)،.؟]+)/.exec(prompt)?.[1];
  if (named && parseUnit(named)) return named;
  for (const [pattern, unit] of UNIT_WORDS) if (pattern.test(prompt)) return unit;
  return null;
}
