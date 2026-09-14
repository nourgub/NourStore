// Turns the maths notation the assistant writes into something a human can
// actually read on screen and on paper.
//
// The prompts ask Claude to wrap formulas in $...$ (see
// server/prompts/mathLessonPlan.ts). Nothing in this codebase renders LaTeX —
// no KaTeX, no MathJax — so without this a teacher reads "$x^2 + \Delta$"
// literally, in the UI and in every exported Word/PDF file. Adding a full
// maths renderer to a Word export is not on the table; converting the common
// notation to real Unicode is, and it is what a printed Algerian lesson plan
// uses anyway (x², √, Δ, ≤).
//
// Deliberately small and predictable: it handles the notation these prompts
// actually produce and leaves anything else untouched rather than mangling
// it. Unconverted LaTeX stays visible as itself — a teacher who sees
// "\binom{n}{k}" knows something was not handled, which is better than a
// silently wrong formula.

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  n: "ⁿ",
  i: "ⁱ",
};
const SUBSCRIPT: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  n: "ₙ",
  i: "ᵢ",
  k: "ₖ",
};
const SYMBOLS: Record<string, string> = {
  "\\Delta": "Δ",
  "\\delta": "δ",
  "\\alpha": "α",
  "\\beta": "β",
  "\\pi": "π",
  "\\theta": "θ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\pm": "±",
  "\\leq": "≤",
  "\\le": "≤",
  "\\geq": "≥",
  "\\ge": "≥",
  "\\neq": "≠",
  "\\ne": "≠",
  "\\approx": "≈",
  "\\equiv": "≡",
  "\\infty": "∞",
  "\\in": "∈",
  "\\notin": "∉",
  "\\subset": "⊂",
  "\\cup": "∪",
  "\\cap": "∩",
  "\\forall": "∀",
  "\\exists": "∃",
  "\\rightarrow": "→",
  "\\to": "→",
  "\\Rightarrow": "⇒",
  "\\mathbb{R}": "ℝ",
  "\\mathbb{N}": "ℕ",
  "\\mathbb{Z}": "ℤ",
  "\\mathbb{Q}": "ℚ",
  "\\ldots": "…",
  "\\dots": "…",
};

function toScript(run: string, table: Record<string, string>): string | null {
  let out = "";
  for (const character of run) {
    const mapped = table[character];
    if (!mapped) return null; // one unmappable character: leave the whole run alone
    out += mapped;
  }
  return out;
}

/**
 * Converts one formula's inner text (what was between the $ signs, or a bare
 * run of notation) to Unicode.
 */
export function mathToUnicode(input: string): string {
  let text = input;
  for (const [latex, symbol] of Object.entries(SYMBOLS)) {
    text = text.split(latex).join(symbol);
  }
  // \sqrt BEFORE \frac: a root inside a fraction leaves braces in the
  // numerator, and the fraction pattern deliberately does not recurse into
  // nested braces — converting the root first is what makes the common
  // "(-b + √Δ)/2a" come out whole.
  text = text.replace(
    /\\sqrt\s*\{([^{}]*)\}/g,
    (_m, inner: string) => `√(${inner})`
  );
  text = text.replace(/\\sqrt\s*(\w)/g, (_m, inner: string) => `√${inner}`);
  // \frac{a}{b} -> a/b, parenthesised when either side is compound.
  text = text.replace(
    /\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
    (_m, top: string, bottom: string) => {
      // Parenthesised unless the side is a single symbol or a plain number:
      // "(-b + √Δ)/2a" is ambiguous on paper, "/(2a)" is not.
      const wrap = (part: string) => {
        const trimmed = part.trim();
        return trimmed.length <= 1 || /^\d+$/.test(trimmed)
          ? trimmed
          : `(${trimmed})`;
      };
      return `${wrap(top)}/${wrap(bottom)}`;
    }
  );
  // ^{...} / _{...} and the single-character forms.
  text = text.replace(
    /\^\{([^{}]*)\}/g,
    (match, run: string) => toScript(run, SUPERSCRIPT) ?? match
  );
  text = text.replace(
    /\^(\w)/g,
    (match, run: string) => toScript(run, SUPERSCRIPT) ?? match
  );
  text = text.replace(
    /_\{([^{}]*)\}/g,
    (match, run: string) => toScript(run, SUBSCRIPT) ?? match
  );
  text = text.replace(
    /_(\w)/g,
    (match, run: string) => toScript(run, SUBSCRIPT) ?? match
  );
  // Spacing and grouping macros carry no meaning once rendered as text.
  text = text.replace(/\\(?:left|right|,|;|!|quad|qquad)\s?/g, "");
  return text;
}

/**
 * Rewrites a whole document: every $...$ span becomes readable maths, the
 * dollar signs disappear, and everything outside them is untouched. A lone
 * unmatched `$` (a price, a stray character) is left exactly as it was.
 */
export function renderMathText(body: string): string {
  // $$display$$ first, so the outer pair is not mistaken for two inline spans.
  const withDisplay = body.replace(/\$\$([^$]+)\$\$/g, (_m, inner: string) =>
    mathToUnicode(inner).trim()
  );
  return withDisplay.replace(/\$([^$\n]+)\$/g, (_m, inner: string) =>
    mathToUnicode(inner).trim()
  );
}
