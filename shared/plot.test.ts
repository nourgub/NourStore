import { describe, expect, it } from "vitest";
import { compileFunction, sampleCurve } from "./plot";

describe("whiteboard curves", () => {
  it("evaluates the functions of the lessons", () => {
    const cases: Array<[string, number, number]> = [
      ["2x^2 - 3x + 1", 2, 3],
      ["f(x) = x³ − 2x", 2, 4],
      ["y = e^x", 0, 1],
      ["ln(x)", Math.E, 1],
      ["1/(x-1)", 3, 0.5],
      ["√x", 9, 3],
      ["3(x+1)", 1, 6],
      ["-x^2", 3, -9],
      ["2,5x", 2, 5],
      ["x sin x", Math.PI / 2, Math.PI / 2],
    ];
    for (const [text, x, y] of cases) expect(compileFunction(text)!(x), text).toBeCloseTo(y, 9);
  });

  it("refuses what it does not understand instead of guessing", () => {
    for (const text of ["", "x +", "alert(1)", "2 ** x", "y = = x", "(x+1", "x; 1"]) expect(compileFunction(text), text).toBeNull();
  });

  it("splits a curve at a vertical asymptote", () => {
    const pieces = sampleCurve(compileFunction("1/(x-1)")!, -4, 4, 6);
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    expect(sampleCurve(compileFunction("sqrt(x)")!, -4, 4, 6).every(piece => piece.every(([x]) => x >= 0))).toBe(true);
  });
});
