// A small, safe evaluator for the whiteboard's curves: f(x) typed as in the
// lessons ("2x^2 - 3x + 1", "e^x", "ln(x)", "1/(x-1)", "√x", "sin x").
// Recursive descent over a fixed grammar — never eval(). Returns null when
// the text is not a function of x it understands.

type Fn = (x: number) => number;

const FUNCTIONS: Record<string, (value: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
};

function normalize(raw: string): string {
  return raw
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/,/g, ".")
    .replace(/^\s*(?:f\s*\(\s*x\s*\)|y)\s*=\s*/i, "")
    .toLowerCase();
}

type Token = { kind: "num"; value: number } | { kind: "id"; value: string } | { kind: "op"; value: string };

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    const number = /^\d+(?:\.\d+)?/.exec(text.slice(index));
    if (number) {
      tokens.push({ kind: "num", value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const word = /^[a-z]+/.exec(text.slice(index));
    if (word) {
      // "xsin" or "2xe" are split into known names and single letters.
      let rest = word[0];
      while (rest) {
        const name = Object.keys(FUNCTIONS).concat(["pi"]).find(entry => rest.startsWith(entry));
        const piece = name ?? rest[0];
        tokens.push({ kind: "id", value: piece });
        rest = rest.slice(piece.length);
      }
      index += word[0].length;
      continue;
    }
    if ("+-*/^()".includes(char)) {
      tokens.push({ kind: "op", value: char });
      index++;
      continue;
    }
    return null;
  }
  return tokens;
}

export function compileFunction(raw: string): Fn | null {
  const parsed = tokenize(normalize(raw));
  if (!parsed || !parsed.length || parsed.length > 200) return null;
  const tokens: Token[] = parsed;
  let position = 0;
  const peek = () => tokens[position];
  const isOp = (value: string) => peek()?.kind === "op" && peek()!.value === value;

  // expression := term (('+'|'-') term)*
  function expression(): Fn {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[position++].value;
      const right = term();
      const a = left;
      left = op === "+" ? x => a(x) + right(x) : x => a(x) - right(x);
    }
    return left;
  }
  // term := unary (('*'|'/'|implicit) unary)*
  function term(): Fn {
    let left = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = tokens[position++].value;
        const right = unary();
        const a = left;
        left = op === "*" ? x => a(x) * right(x) : x => a(x) / right(x);
      } else if (peek() && (peek()!.kind !== "op" || peek()!.value === "(")) {
        const right = unary(); // implicit product: 2x, 3(x+1), x sin x
        const a = left;
        left = x => a(x) * right(x);
      } else return left;
    }
  }
  // unary := '-' unary | power
  function unary(): Fn {
    if (isOp("-")) {
      position++;
      const inner = unary();
      return x => -inner(x);
    }
    if (isOp("+")) {
      position++;
      return unary();
    }
    return power();
  }
  // power := atom ('^' unary)?
  function power(): Fn {
    const base = atom();
    if (isOp("^")) {
      position++;
      const exponent = unary();
      return x => Math.pow(base(x), exponent(x));
    }
    return base;
  }
  function atom(): Fn {
    const token = tokens[position++];
    if (!token) throw new Error("end");
    if (token.kind === "num") return () => token.value;
    if (token.kind === "op" && token.value === "(") {
      const inner = expression();
      if (!isOp(")")) throw new Error("paren");
      position++;
      return inner;
    }
    if (token.kind === "id") {
      if (token.value === "x") return x => x;
      if (token.value === "pi") return () => Math.PI;
      if (token.value === "e") return () => Math.E;
      const fn = FUNCTIONS[token.value];
      if (fn) {
        const argument = power(); // sin x, ln(x), sqrt(x+1)
        return x => fn(argument(x));
      }
    }
    throw new Error("token");
  }

  try {
    const fn = expression();
    if (position !== tokens.length) return null;
    return fn;
  } catch {
    return null;
  }
}

/** Points of y = f(x) on [xMin, xMax], split where the curve leaves the window or is undefined. */
export function sampleCurve(fn: Fn, xMin: number, xMax: number, yLimit: number, samples = 240): Array<Array<[number, number]>> {
  const pieces: Array<Array<[number, number]>> = [];
  let current: Array<[number, number]> = [];
  for (let index = 0; index <= samples; index++) {
    const x = xMin + ((xMax - xMin) * index) / samples;
    const y = fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > yLimit * 4) {
      if (current.length > 1) pieces.push(current);
      current = [];
      continue;
    }
    current.push([x, y]);
  }
  if (current.length > 1) pieces.push(current);
  return pieces;
}
