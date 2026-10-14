import { TextRun } from "docx";

// Converts the small set of LaTeX commands a lesson-prep prompt is allowed to
// use into plain Unicode text. This is intentionally not a LaTeX engine —
// just enough to make common Algerian-curriculum math notation readable in a
// Word document without pulling in a full TeX toolchain.

// \frac{..}{..} and \sqrt{..} arguments can themselves contain braces (e.g.
// the quadratic formula \frac{-b+\sqrt{b^2-4ac}}{2a}), so these need a
// balanced-brace scan rather than a [^{}]* regex, which stops at the first
// inner brace and leaks literal "\frac{"/"}" text into the document.
function findMatchingBrace(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function expandBracedCommands(expr: string): string {
  let out = "";
  let i = 0;
  while (i < expr.length) {
    const matchCommand = (name: string): string | null => {
      if (!expr.startsWith(name + "{", i)) return null;
      const open = i + name.length;
      const close = findMatchingBrace(expr, open);
      if (close === -1) return null;
      const content = expr.slice(open + 1, close);
      i = close + 1;
      return expandBracedCommands(content);
    };

    const fracFirst = matchCommand("\\frac");
    if (fracFirst !== null) {
      if (expr[i] === "{") {
        const secondOpen = i;
        const secondClose = findMatchingBrace(expr, secondOpen);
        if (secondClose !== -1) {
          const second = expandBracedCommands(expr.slice(secondOpen + 1, secondClose));
          i = secondClose + 1;
          out += `(${fracFirst})/(${second})`;
          continue;
        }
      }
      out += `(${fracFirst})`;
      continue;
    }

    const sqrtArg = matchCommand("\\sqrt");
    if (sqrtArg !== null) {
      out += `√(${sqrtArg})`;
      continue;
    }

    const textArg = matchCommand("\\text");
    if (textArg !== null) {
      out += textArg;
      continue;
    }

    out += expr[i];
    i++;
  }
  return out;
}

const BARE_SYMBOLS: [RegExp, string][] = [
  [/\\sqrt/g, "√"],
  [/\\times/g, "×"],
  [/\\cdot/g, "·"],
  [/\\div/g, "÷"],
  [/\\leq/g, "≤"],
  [/\\geq/g, "≥"],
  [/\\neq/g, "≠"],
  [/\\approx/g, "≈"],
  [/\\pm/g, "±"],
  [/\\infty/g, "∞"],
  [/\\rightarrow/g, "→"],
  [/\\Rightarrow/g, "⇒"],
  [/\\leftrightarrow/g, "↔"],
  [/\\in/g, "∈"],
  [/\\notin/g, "∉"],
  [/\\subset/g, "⊂"],
  [/\\cup/g, "∪"],
  [/\\cap/g, "∩"],
  [/\\forall/g, "∀"],
  [/\\exists/g, "∃"],
  [/\\emptyset/g, "∅"],
  [/\\sum/g, "∑"],
  [/\\int/g, "∫"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\gamma/g, "γ"],
  [/\\Delta/g, "Δ"],
  [/\\delta/g, "δ"],
  [/\\pi/g, "π"],
  [/\\theta/g, "θ"],
  [/\\lambda/g, "λ"],
  [/\\mu/g, "μ"],
  [/\\omega/g, "ω"],
  [/\\left/g, ""],
  [/\\right/g, ""],
  [/\\,/g, " "],
  [/\\%/g, "%"],
  // Catch-all: any remaining \word (e.g. \sin, \cos, \log, \lim) keeps just the word.
  [/\\([a-zA-Z]+)/g, "$1"],
];

function normalizeMathExpr(expr: string): string {
  let out = expandBracedCommands(expr);
  for (const [re, rep] of BARE_SYMBOLS) out = out.replace(re, rep);
  return out;
}

interface Segment {
  text: string;
  sup?: boolean;
  sub?: boolean;
}

function tokenizeMath(expr: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === "^" || ch === "_") {
      const isSup = ch === "^";
      i++;
      let group: string;
      if (expr[i] === "{") {
        const end = expr.indexOf("}", i);
        if (end === -1) {
          group = expr.slice(i + 1);
          i = expr.length;
        } else {
          group = expr.slice(i + 1, end);
          i = end + 1;
        }
      } else {
        group = expr[i] ?? "";
        i++;
      }
      segments.push({ text: group, sup: isSup, sub: !isSup });
    } else {
      let j = i;
      while (j < expr.length && expr[j] !== "^" && expr[j] !== "_") j++;
      segments.push({ text: expr.slice(i, j) });
      i = j;
    }
  }
  return segments;
}

function lineToSegments(line: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\$([^$]+)\$/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > lastIndex) segments.push({ text: line.slice(lastIndex, m.index) });
    segments.push(...tokenizeMath(normalizeMathExpr(m[1])).filter((s) => s.text.length > 0));
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < line.length) segments.push({ text: line.slice(lastIndex) });
  if (segments.length === 0) segments.push({ text: line });
  return segments;
}

// Splits a line of text on $...$ inline-math delimiters and returns one
// TextRun per segment, with exponents/indices rendered as super/subscript.
// `breakBefore` puts a line break before the line's first run, matching the
// multi-line convention used elsewhere in the docx builders.
export function lineToRuns(
  line: string,
  baseOpts: { rightToLeft?: boolean; bold?: boolean; italics?: boolean; color?: string } = {},
  breakBefore = false,
): TextRun[] {
  return lineToSegments(line).map(
    (seg, idx) =>
      new TextRun({
        ...baseOpts,
        text: seg.text,
        superScript: seg.sup,
        subScript: seg.sub,
        break: idx === 0 && breakBefore ? 1 : undefined,
      }),
  );
}
