import { describe, expect, it } from "vitest";
import { mathToUnicode, renderMathText } from "./mathText";

describe("maths notation → readable text", () => {
  it("reads the notation these prompts actually produce", () => {
    expect(mathToUnicode("x^2 + 3x - 4 = 0")).toBe("x² + 3x - 4 = 0");
    expect(mathToUnicode("\\Delta = b^2 - 4ac")).toBe("Δ = b² - 4ac");
    expect(mathToUnicode("x_1")).toBe("x₁");
    expect(mathToUnicode("\\sqrt{\\Delta}")).toBe("√(Δ)");
    expect(mathToUnicode("\\frac{-b + \\sqrt{\\Delta}}{2a}")).toBe(
      "(-b + √(Δ))/(2a)"
    );
    expect(mathToUnicode("x \\in \\mathbb{R}")).toBe("x ∈ ℝ");
    expect(mathToUnicode("\\Delta \\leq 0")).toBe("Δ ≤ 0");
  });

  it("strips the $ delimiters out of a whole lesson body", () => {
    const body =
      "نحسب المميز $\\Delta = b^2 - 4ac$ ثم نستنتج.\nإذا كان $\\Delta > 0$ فهناك حلّان.";
    expect(renderMathText(body)).toBe(
      "نحسب المميز Δ = b² - 4ac ثم نستنتج.\nإذا كان Δ > 0 فهناك حلّان."
    );
  });

  it("handles a display formula without reading its outer pair as two inline ones", () => {
    expect(renderMathText("$$x^2 + y^2 = r^2$$")).toBe("x² + y² = r²");
  });

  it("leaves a lone dollar sign and ordinary text alone", () => {
    expect(renderMathText("الثمن 500 $ فقط")).toBe("الثمن 500 $ فقط");
    expect(renderMathText("نص عادي بلا رياضيات")).toBe("نص عادي بلا رياضيات");
  });

  it("leaves notation it does not handle visible as itself, rather than mangling it", () => {
    // A teacher who sees the raw macro knows it was not converted; a silently
    // wrong formula is the outcome worth avoiding.
    expect(mathToUnicode("\\binom{n}{k}")).toBe("\\binom{n}{k}");
    // A superscript run with an unmappable character stays intact, not half-converted.
    expect(mathToUnicode("x^{ab}")).toBe("x^{ab}");
  });
});
