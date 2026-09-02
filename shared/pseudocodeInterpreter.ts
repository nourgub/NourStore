// ---------------------------------------------------------------------------
// A real, from-scratch interpreter for the bounded pseudocode dialect used in
// the Algerian bac "Informatique" curriculum (READ/LIRE, WRITE/ECRIRE, ← or =
// assignment, IF/SI...THEN/ALORS...ELSE/SINON, FOR/POUR, WHILE/TANTQUE).
//
// This replaces the previous "check for required substrings via regex"
// approach with genuine execution: the learner's code actually runs against
// real input values, and the actual printed output is compared to the
// expected output.
//
// Why a custom interpreter instead of `eval`/`new Function`/a real sandbox:
// arbitrary JS/Python execution would be a genuine security risk (no sandbox
// infrastructure exists in this environment — see AUDIT.md). This grammar is
// deliberately small and non-Turing-complete-in-a-dangerous-way: no file I/O,
// no network, no imports, nothing but arithmetic, conditionals, loops, and
// read/write against an in-memory variable table. A step counter bounds
// runaway loops so a bad WHILE condition can't hang the process.
//
// Known, honestly-stated limits (not silently pretended to be complete):
// - No arrays/tableaux, no functions/procedures, no strings beyond variable
//   names and numeric literals.
// - Only numeric variables (integers and floats). No booleans as first-class
//   values (only usable directly inside IF/WHILE conditions).
// ---------------------------------------------------------------------------

export type PseudoResult = {
  ok: boolean;
  output: string[];
  error: string | null;
  steps: number;
};

const MAX_STEPS = 200_000;

// --- Tokenizer -------------------------------------------------------------

type TokenType =
  | "NUM"
  | "IDENT"
  | "OP"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "NEWLINE"
  | "EOF";

type Token = { type: TokenType; value: string; line: number };

const KEYWORDS = new Set([
  "READ",
  "LIRE",
  "WRITE",
  "ECRIRE",
  "ÉCRIRE",
  "IF",
  "SI",
  "THEN",
  "ALORS",
  "ELSE",
  "SINON",
  "ENDIF",
  "FINSI",
  "FOR",
  "POUR",
  "TO",
  "DO",
  "FAIRE",
  "ENDFOR",
  "FINPOUR",
  "WHILE",
  "TANTQUE",
  "ENDWHILE",
  "FINTANTQUE",
  "DEBUT",
  "BEGIN",
  "FIN",
  "END",
  "MOD",
  "DIV",
  "AND",
  "ET",
  "OR",
  "OU",
  "NOT",
  "NON",
  "VAR",
  "ALGORITHME",
  "ALGORITHM",
]);

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "\n") {
      tokens.push({ type: "NEWLINE", value: "\n", line });
      line++;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < n && /[0-9.]/.test(src[j])) j++;
      tokens.push({ type: "NUM", value: src.slice(i, j), line });
      i = j;
      continue;
    }
    if (/[A-Za-zÀ-ÿ_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-zÀ-ÿ0-9_]/.test(src[j])) j++;
      tokens.push({ type: "IDENT", value: src.slice(i, j), line });
      i = j;
      continue;
    }
    if (c === "←" || (c === "<" && src[i + 1] === "-")) {
      tokens.push({ type: "OP", value: ":=", line });
      i += c === "←" ? 1 : 2;
      continue;
    }
    if (c === "<" && src[i + 1] === "=") {
      tokens.push({ type: "OP", value: "<=", line });
      i += 2;
      continue;
    }
    if (c === ">" && src[i + 1] === "=") {
      tokens.push({ type: "OP", value: ">=", line });
      i += 2;
      continue;
    }
    if (c === "<" && src[i + 1] === ">") {
      tokens.push({ type: "OP", value: "<>", line });
      i += 2;
      continue;
    }
    if ("+-*/=<>^".includes(c)) {
      tokens.push({ type: "OP", value: c, line });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "LPAREN", value: c, line });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "RPAREN", value: c, line });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ type: "COMMA", value: c, line });
      i++;
      continue;
    }
    if (c === ";" || c === ":") {
      i++;
      continue;
    }
    throw new SyntaxError(`رمز غير معروف "${c}" في السطر ${line}`);
  }
  tokens.push({ type: "EOF", value: "", line });
  return tokens;
}

// --- AST ---------------------------------------------------------------

type Expr =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "bin"; op: string; left: Expr; right: Expr }
  | { kind: "neg"; expr: Expr };

type Stmt =
  | { kind: "read"; names: string[] }
  | { kind: "write"; exprs: Expr[] }
  | { kind: "assign"; name: string; expr: Expr }
  | { kind: "if"; cond: Expr; then: Stmt[]; else: Stmt[] }
  | { kind: "for"; name: string; from: Expr; to: Expr; body: Stmt[] }
  | { kind: "while"; cond: Expr; body: Stmt[] };

// --- Parser (recursive descent) ----------------------------------------

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }
  private next(): Token {
    return this.tokens[this.pos++];
  }
  private isKw(t: Token, ...kws: string[]) {
    return (
      t.type === "IDENT" && kws.includes(t.value.toUpperCase())
    );
  }
  private skipNewlines() {
    while (this.peek().type === "NEWLINE") this.pos++;
  }
  private expectKw(...kws: string[]): Token {
    this.skipNewlines();
    const t = this.peek();
    if (!this.isKw(t, ...kws)) {
      throw new SyntaxError(
        `متوقّع إحدى الكلمات (${kws.join("/")}) عند السطر ${t.line}, وجدت "${t.value || "EOF"}"`
      );
    }
    return this.next();
  }

  parseProgram(): Stmt[] {
    this.skipNewlines();
    // optional header (ALGORITHME ... / DEBUT ... FIN) — ignored, just skip
    if (this.isKw(this.peek(), "ALGORITHME", "ALGORITHM")) {
      while (this.peek().type !== "NEWLINE" && this.peek().type !== "EOF")
        this.pos++;
    }
    this.skipNewlines();
    if (this.isKw(this.peek(), "VAR")) {
      // skip a variable-declaration block until DEBUT/BEGIN or first statement line
      while (
        !this.isKw(this.peek(), "DEBUT", "BEGIN") &&
        this.peek().type !== "EOF"
      )
        this.pos++;
    }
    if (this.isKw(this.peek(), "DEBUT", "BEGIN")) this.next();
    this.skipNewlines();
    const stmts = this.parseStmtList(["FIN", "END"]);
    return stmts;
  }

  private parseStmtList(stopKws: string[]): Stmt[] {
    const stmts: Stmt[] = [];
    this.skipNewlines();
    while (
      this.peek().type !== "EOF" &&
      !this.isKw(this.peek(), ...stopKws)
    ) {
      stmts.push(this.parseStmt());
      this.skipNewlines();
    }
    return stmts;
  }

  private parseStmt(): Stmt {
    const t = this.peek();
    if (this.isKw(t, "READ", "LIRE")) {
      this.next();
      this.expectLParen();
      const names: string[] = [this.expectIdent()];
      while (this.peek().type === "COMMA") {
        this.next();
        names.push(this.expectIdent());
      }
      this.expectRParen();
      return { kind: "read", names };
    }
    if (this.isKw(t, "WRITE", "ECRIRE", "ÉCRIRE")) {
      this.next();
      this.expectLParen();
      const exprs: Expr[] = [this.parseExpr()];
      while (this.peek().type === "COMMA") {
        this.next();
        exprs.push(this.parseExpr());
      }
      this.expectRParen();
      return { kind: "write", exprs };
    }
    if (this.isKw(t, "IF", "SI")) {
      this.next();
      const cond = this.parseExpr();
      this.expectKw("THEN", "ALORS");
      const thenBranch = this.parseStmtList([
        "ELSE",
        "SINON",
        "ENDIF",
        "FINSI",
      ]);
      let elseBranch: Stmt[] = [];
      if (this.isKw(this.peek(), "ELSE", "SINON")) {
        this.next();
        elseBranch = this.parseStmtList(["ENDIF", "FINSI"]);
      }
      this.expectKw("ENDIF", "FINSI");
      return { kind: "if", cond, then: thenBranch, else: elseBranch };
    }
    if (this.isKw(t, "FOR", "POUR")) {
      this.next();
      const name = this.expectIdent();
      // accept "FROM"/"DE" optionally before the start value
      if (this.isKw(this.peek(), "FROM", "DE")) this.next();
      else this.expectOp(":=", "=");
      const from = this.parseExpr();
      this.expectKw("TO", "A");
      const to = this.parseExpr();
      this.expectKw("DO", "FAIRE");
      const body = this.parseStmtList(["ENDFOR", "FINPOUR"]);
      this.expectKw("ENDFOR", "FINPOUR");
      return { kind: "for", name, from, to, body };
    }
    if (this.isKw(t, "WHILE", "TANTQUE")) {
      this.next();
      const cond = this.parseExpr();
      this.expectKw("DO", "FAIRE");
      const body = this.parseStmtList(["ENDWHILE", "FINTANTQUE"]);
      this.expectKw("ENDWHILE", "FINTANTQUE");
      return { kind: "while", cond, body };
    }
    if (t.type === "IDENT") {
      const name = this.next().value;
      this.expectOp(":=", "=");
      const expr = this.parseExpr();
      return { kind: "assign", name, expr };
    }
    throw new SyntaxError(
      `جملة غير مفهومة عند السطر ${t.line} ("${t.value || "EOF"}")`
    );
  }

  private expectLParen() {
    this.skipNewlines();
    if (this.peek().type !== "LPAREN")
      throw new SyntaxError(`متوقّع "(" عند السطر ${this.peek().line}`);
    this.next();
  }
  private expectRParen() {
    if (this.peek().type !== "RPAREN")
      throw new SyntaxError(`متوقّع ")" عند السطر ${this.peek().line}`);
    this.next();
  }
  private expectIdent(): string {
    const t = this.peek();
    if (t.type !== "IDENT" || KEYWORDS.has(t.value.toUpperCase()))
      throw new SyntaxError(`متوقّع اسم متغيّر عند السطر ${t.line}`);
    this.next();
    return t.value;
  }
  private expectOp(...ops: string[]) {
    const t = this.peek();
    if (t.type !== "OP" || !ops.includes(t.value))
      throw new SyntaxError(
        `متوقّع أحد الرموز (${ops.join("/")}) عند السطر ${t.line}`
      );
    this.next();
  }

  // expr grammar: comparison > additive > multiplicative > unary > primary
  private parseExpr(): Expr {
    let left = this.parseComparison();
    while (
      this.isKw(this.peek(), "AND", "ET", "OR", "OU")
    ) {
      const op = this.next().value.toUpperCase();
      const right = this.parseComparison();
      left = { kind: "bin", op: op === "ET" ? "AND" : op === "OU" ? "OR" : op, left, right };
    }
    return left;
  }
  private parseComparison(): Expr {
    let left = this.parseAdditive();
    const t = this.peek();
    if (t.type === "OP" && ["=", "<", ">", "<=", ">=", "<>"].includes(t.value)) {
      this.next();
      const right = this.parseAdditive();
      left = { kind: "bin", op: t.value, left, right };
    }
    return left;
  }
  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    while (
      this.peek().type === "OP" &&
      ["+", "-"].includes(this.peek().value)
    ) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }
  private parseMultiplicative(): Expr {
    let left = this.parseUnary();
    while (
      (this.peek().type === "OP" && ["*", "/", "^"].includes(this.peek().value)) ||
      this.isKw(this.peek(), "MOD", "DIV")
    ) {
      const opTok = this.next();
      const op = opTok.type === "OP" ? opTok.value : opTok.value.toUpperCase();
      const right = this.parseUnary();
      left = { kind: "bin", op, left, right };
    }
    return left;
  }
  private parseUnary(): Expr {
    if (this.peek().type === "OP" && this.peek().value === "-") {
      this.next();
      return { kind: "neg", expr: this.parseUnary() };
    }
    if (this.isKw(this.peek(), "NOT", "NON")) {
      this.next();
      return { kind: "bin", op: "NOT", left: this.parseUnary(), right: { kind: "num", value: 0 } };
    }
    return this.parsePrimary();
  }
  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.type === "NUM") {
      this.next();
      return { kind: "num", value: parseFloat(t.value) };
    }
    if (t.type === "LPAREN") {
      this.next();
      const e = this.parseExpr();
      this.expectRParen();
      return e;
    }
    if (t.type === "IDENT" && !KEYWORDS.has(t.value.toUpperCase())) {
      this.next();
      return { kind: "var", name: t.value };
    }
    throw new SyntaxError(`تعبير غير مفهوم عند السطر ${t.line}`);
  }
}

// --- Interpreter ---------------------------------------------------------

class StepLimitError extends Error {}

function evalExpr(e: Expr, vars: Map<string, number>): number {
  switch (e.kind) {
    case "num":
      return e.value;
    case "var": {
      const key = e.name.toUpperCase();
      if (!vars.has(key))
        throw new RangeError(`المتغيّر "${e.name}" غير معرّف (لم تتم قراءته أو تعيينه بعد)`);
      return vars.get(key)!;
    }
    case "neg":
      return -evalExpr(e.expr, vars);
    case "bin": {
      const l = evalExpr(e.left, vars);
      const r = evalExpr(e.right, vars);
      switch (e.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          if (r === 0) throw new RangeError("قسمة على صفر");
          return l / r;
        case "^":
          return Math.pow(l, r);
        case "MOD":
          if (r === 0) throw new RangeError("قسمة على صفر (MOD)");
          return l % r;
        case "DIV":
          if (r === 0) throw new RangeError("قسمة على صفر (DIV)");
          return Math.trunc(l / r);
        case "=":
          return l === r ? 1 : 0;
        case "<>":
          return l !== r ? 1 : 0;
        case "<":
          return l < r ? 1 : 0;
        case ">":
          return l > r ? 1 : 0;
        case "<=":
          return l <= r ? 1 : 0;
        case ">=":
          return l >= r ? 1 : 0;
        case "AND":
          return l !== 0 && r !== 0 ? 1 : 0;
        case "OR":
          return l !== 0 || r !== 0 ? 1 : 0;
        case "NOT":
          return l === 0 ? 1 : 0;
        default:
          throw new SyntaxError(`عملية غير معروفة: ${e.op}`);
      }
    }
  }
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1e6) / 1e6);
}

/**
 * Runs pseudocode against a sequence of numeric inputs (consumed in order by
 * successive READ() calls) and returns everything WRITE() printed, joined by
 * commas — plus a step counter to guard against runaway loops.
 */
export function runPseudocode(code: string, inputs: number[]): PseudoResult {
  let stmts: Stmt[];
  try {
    const tokens = tokenize(code);
    stmts = new Parser(tokens).parseProgram();
  } catch (err) {
    return {
      ok: false,
      output: [],
      error: err instanceof Error ? err.message : String(err),
      steps: 0,
    };
  }

  const vars = new Map<string, number>();
  const output: string[] = [];
  let inputIdx = 0;
  let steps = 0;

  function step() {
    steps++;
    if (steps > MAX_STEPS) throw new StepLimitError("تجاوز الحد الأقصى لعدد الخطوات (احتمال حلقة لا نهائية)");
  }

  function exec(list: Stmt[]) {
    for (const s of list) {
      step();
      switch (s.kind) {
        case "read":
          for (const name of s.names) {
            if (inputIdx >= inputs.length)
              throw new RangeError(`لا توجد قيمة إدخال كافية لـ READ(${name})`);
            vars.set(name.toUpperCase(), inputs[inputIdx++]);
          }
          break;
        case "write":
          output.push(s.exprs.map(e => formatNum(evalExpr(e, vars))).join(", "));
          break;
        case "assign":
          vars.set(s.name.toUpperCase(), evalExpr(s.expr, vars));
          break;
        case "if":
          if (evalExpr(s.cond, vars) !== 0) exec(s.then);
          else exec(s.else);
          break;
        case "for": {
          const from = evalExpr(s.from, vars);
          const to = evalExpr(s.to, vars);
          for (let i = from; i <= to; i++) {
            step();
            vars.set(s.name.toUpperCase(), i);
            exec(s.body);
          }
          break;
        }
        case "while":
          while (evalExpr(s.cond, vars) !== 0) {
            step();
            exec(s.body);
          }
          break;
      }
    }
  }

  try {
    exec(stmts);
  } catch (err) {
    return {
      ok: false,
      output,
      error: err instanceof Error ? err.message : String(err),
      steps,
    };
  }
  return { ok: true, output, error: null, steps };
}

/** Parses a comma-separated "2, 3" input string into numeric READ() inputs. */
export function parseInputString(input: string): number[] {
  if (!input.trim()) return [];
  return input
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      const n = parseFloat(s);
      if (Number.isNaN(n)) throw new RangeError(`قيمة إدخال غير رقمية: "${s}"`);
      return n;
    });
}

/** Normalizes WRITE() output vs an expected "output" string for comparison. */
export function outputsMatch(actual: string[], expected: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();
  return norm(actual.join(",")) === norm(expected);
}
