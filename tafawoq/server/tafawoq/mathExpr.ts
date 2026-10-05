// Tafawoq AI Teacher — a small, dependency-free math expression engine.
//
// Used to grade typed answers by mathematical equivalence instead of
// string equality: "2(3x² − 2)", "6x^2-4" and "-4 + 6·x²" are the same
// answer. Both expressions are evaluated at several sample points; they
// are equivalent when they agree at every point where both are defined.
// Understands what students actually type: unicode superscripts, √, π,
// implicit multiplication (2x, 3(x+1), x(x−1)), |x|, e^x, ln x, Arabic
// digits and decimal commas, and a leading "f′(x) =" / "y =" prefix.

type Node =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "neg"; arg: Node }
  | { kind: "bin"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { kind: "fn"; name: string; arg: Node };

const FUNCTIONS = ["sqrt", "exp", "ln", "log", "sin", "cos", "tan", "abs"];
const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺⁽⁾ⁿˣ";
const SUPERSCRIPT_PLAIN = "0123456789-+()nx";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function prepareExpression(raw: string): string {
  let text = raw.trim().toLowerCase();
  text = text.replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)));
  text = text.replace(/[۰-۹]/g, digit => String(PERSIAN_DIGITS.indexOf(digit)));
  text = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺⁽⁾ⁿˣ]+/g, run => {
    const plain = Array.from(run)
      .map(char => SUPERSCRIPT_PLAIN[SUPERSCRIPT.indexOf(char)])
      .join("");
    return `^(${plain})`;
  });
  text = text
    .replace(/[−–—]/g, "-")
    .replace(/[×·✕∙]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[٫,،]/g, ".")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/[′’']/g, "")
    .replace(/\s+/g, "");
  // "f(x)=…", "y=…", "un=…": grade the right-hand side.
  const equals = text.lastIndexOf("=");
  if (equals >= 0) text = text.slice(equals + 1);
  return text;
}

class Parser {
  private position = 0;
  constructor(private readonly text: string) {}

  parse(): Node {
    const node = this.expression();
    if (this.position !== this.text.length) throw new Error("trailing input");
    return node;
  }

  private peek() {
    return this.text[this.position];
  }

  private expression(): Node {
    let node = this.term();
    while (this.peek() === "+" || this.peek() === "-") {
      const op = this.text[this.position++] as "+" | "-";
      node = { kind: "bin", op, left: node, right: this.term() };
    }
    return node;
  }

  private term(): Node {
    let node = this.unary();
    for (;;) {
      const next = this.peek();
      if (next === "*" || next === "/") {
        this.position += 1;
        node = { kind: "bin", op: next, left: node, right: this.unary() };
      } else if (next !== undefined && /[0-9a-z.(]/.test(next)) {
        // Implicit multiplication: 2x, 3(x+1), x(x−1), 2sqrt(x).
        node = { kind: "bin", op: "*", left: node, right: this.power() };
      } else {
        return node;
      }
    }
  }

  private unary(): Node {
    if (this.peek() === "-") {
      this.position += 1;
      return { kind: "neg", arg: this.unary() };
    }
    if (this.peek() === "+") {
      this.position += 1;
      return this.unary();
    }
    return this.power();
  }

  private power(): Node {
    const base = this.atom();
    if (this.peek() === "^") {
      this.position += 1;
      return { kind: "bin", op: "^", left: base, right: this.unary() };
    }
    return base;
  }

  private atom(): Node {
    const char = this.peek();
    if (char === undefined) throw new Error("unexpected end");
    if (char === "(") {
      this.position += 1;
      const inner = this.expression();
      if (this.peek() !== ")") throw new Error("missing )");
      this.position += 1;
      return inner;
    }
    if (char === "|") {
      this.position += 1;
      const inner = this.expression();
      if (this.peek() !== "|") throw new Error("missing |");
      this.position += 1;
      return { kind: "fn", name: "abs", arg: inner };
    }
    if (/[0-9.]/.test(char)) {
      const match = /^\d*\.?\d+|^\d+\.?/.exec(this.text.slice(this.position));
      if (!match) throw new Error("bad number");
      this.position += match[0].length;
      return { kind: "num", value: Number(match[0]) };
    }
    if (/[a-z]/.test(char)) {
      const rest = this.text.slice(this.position);
      const fn = FUNCTIONS.find(name => rest.startsWith(name));
      if (fn) {
        this.position += fn.length;
        // ln(x) or ln x — without parentheses the argument binds tightly.
        const arg = this.peek() === "(" ? this.atom() : this.power();
        return { kind: "fn", name: fn, arg };
      }
      if (rest.startsWith("pi")) {
        this.position += 2;
        return { kind: "num", value: Math.PI };
      }
      this.position += 1;
      if (char === "e") return { kind: "num", value: Math.E };
      return { kind: "var", name: char };
    }
    throw new Error(`unexpected ${char}`);
  }
}

export function parseExpression(raw: string): Node | null {
  const text = prepareExpression(raw);
  if (!text) return null;
  try {
    return new Parser(text).parse();
  } catch {
    return null;
  }
}

function evaluate(node: Node, scope: Record<string, number>): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var":
      return scope[node.name] ?? NaN;
    case "neg":
      return -evaluate(node.arg, scope);
    case "bin": {
      const left = evaluate(node.left, scope);
      const right = evaluate(node.right, scope);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        default:
          return Math.pow(left, right);
      }
    }
    case "fn": {
      const value = evaluate(node.arg, scope);
      switch (node.name) {
        case "sqrt":
          return Math.sqrt(value);
        case "exp":
          return Math.exp(value);
        case "ln":
          return Math.log(value);
        case "log":
          return Math.log10(value);
        case "sin":
          return Math.sin(value);
        case "cos":
          return Math.cos(value);
        case "tan":
          return Math.tan(value);
        default:
          return Math.abs(value);
      }
    }
  }
}

function variables(node: Node, into = new Set<string>()): Set<string> {
  if (node.kind === "var") into.add(node.name);
  else if (node.kind === "neg" || node.kind === "fn") variables(node.arg, into);
  else if (node.kind === "bin") {
    variables(node.left, into);
    variables(node.right, into);
  }
  return into;
}

/** Evaluates a closed expression (no variables), or null. */
export function evaluateConstant(raw: string): number | null {
  const node = parseExpression(raw);
  if (!node || variables(node).size) return null;
  const value = evaluate(node, {});
  return Number.isFinite(value) ? value : null;
}

// Fixed sample points (deterministic grading), deliberately non-integer so
// coincidences like x² = x at 1 can't occur. Mostly positive so ln/√ are
// defined; two negatives so |x| ≠ x. Points where either side is
// undefined are skipped (2 ln x vs ln(x²) differ only in domain), but at
// least three points must be compared.
const SAMPLES = [0.37, 1.13, 1.71, -0.61, 2.29, 0.83, -1.47, 2.93];

export function expressionsEquivalent(expected: string, given: string): boolean {
  const a = parseExpression(expected);
  const b = parseExpression(given);
  if (!a || !b) return false;
  const names = Array.from(new Set([...Array.from(variables(a)), ...Array.from(variables(b))]));
  let compared = 0;
  for (let trial = 0; trial < SAMPLES.length; trial += 1) {
    const scope: Record<string, number> = {};
    names.forEach((name, index) => {
      scope[name] = SAMPLES[(trial + index * 2) % SAMPLES.length] + index * 0.071;
    });
    const left = evaluate(a, scope);
    const right = evaluate(b, scope);
    const leftOk = Number.isFinite(left);
    const rightOk = Number.isFinite(right);
    if (!leftOk || !rightOk) continue;
    if (Math.abs(left - right) > 1e-7 * Math.max(1, Math.abs(left), Math.abs(right))) return false;
    compared += 1;
    if (!names.length) break;
  }
  return compared > 0 && (names.length === 0 || compared >= 3);
}
