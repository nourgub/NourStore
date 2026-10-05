import { describe, expect, it } from "vitest";
import { outputsMatch, parseInputString, runPseudocode } from "./pseudocodeInterpreter";

describe("runPseudocode", () => {
  it("runs the SUM(A,B) example from the exercise contract", () => {
    const code = `
      DEBUT
      READ(A)
      READ(B)
      SUM ← A + B
      WRITE(SUM)
      FIN
    `;
    const result = runPseudocode(code, parseInputString("2, 3"));
    expect(result.ok).toBe(true);
    expect(result.output).toEqual(["5"]);
    expect(outputsMatch(result.output, "5")).toBe(true);
  });

  it("rejects a learner who fakes the required pattern without real logic", () => {
    // Old regex-based grading only checked for these substrings — a student
    // could pass by literally writing "READ(A)" as a comment/no-op. The real
    // interpreter actually executes it and gets the real (wrong) answer.
    const code = `
      DEBUT
      READ(A)
      READ(B)
      SUM ← A - B
      WRITE(SUM)
      FIN
    `;
    const result = runPseudocode(code, parseInputString("2, 3"));
    expect(result.ok).toBe(true);
    expect(outputsMatch(result.output, "5")).toBe(false);
  });

  it("evaluates IF/ALORS/SINON correctly", () => {
    const code = `
      DEBUT
      LIRE(N)
      SI N > 10 ALORS
        ECRIRE("BIG")
      SINON
        ECRIRE(N)
      FINSI
      FIN
    `;
    // "BIG" is not a supported string literal in this numeric-only grammar,
    // so use a numeric branch instead for this test.
    const code2 = `
      DEBUT
      LIRE(N)
      SI N > 10 ALORS
        R ← 1
      SINON
        R ← 0
      FINSI
      ECRIRE(R)
      FIN
    `;
    expect(runPseudocode(code2, [15]).output).toEqual(["1"]);
    expect(runPseudocode(code2, [5]).output).toEqual(["0"]);
  });

  it("evaluates a FOR loop (sum 1..N)", () => {
    const code = `
      DEBUT
      LIRE(N)
      S ← 0
      POUR I DE 1 A N FAIRE
        S ← S + I
      FINPOUR
      ECRIRE(S)
      FIN
    `;
    expect(runPseudocode(code, [5]).output).toEqual(["15"]);
  });

  it("evaluates a WHILE loop", () => {
    const code = `
      DEBUT
      LIRE(N)
      C ← 0
      TANTQUE N > 1 FAIRE
        SI N MOD 2 = 0 ALORS
          N ← N / 2
        SINON
          N ← N * 3 + 1
        FINSI
        C ← C + 1
      FINTANTQUE
      ECRIRE(C)
      FIN
    `;
    // Collatz steps for 6: 6->3->10->5->16->8->4->2->1 = 8 steps
    expect(runPseudocode(code, [6]).output).toEqual(["8"]);
  });

  it("reports a clean syntax error instead of crashing", () => {
    const result = runPseudocode("DEBUT\nX ←← 1\nFIN", [1]);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("reports division by zero as a runtime error, not a JS exception leak", () => {
    const code = `DEBUT\nLIRE(A)\nX ← A / 0\nECRIRE(X)\nFIN`;
    const result = runPseudocode(code, [5]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("قسمة على صفر");
  });

  it("stops a runaway infinite loop via the step guard", () => {
    const code = `DEBUT\nX ← 1\nTANTQUE X > 0 FAIRE\nX ← X + 1\nFINTANTQUE\nFIN`;
    const result = runPseudocode(code, []);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("حلقة لا نهائية");
  }, 10000);

  it("throws a clear error for reading a variable before it's set", () => {
    const code = `DEBUT\nECRIRE(X)\nFIN`;
    const result = runPseudocode(code, []);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("X");
  });
});

describe("parseInputString", () => {
  it("parses comma-separated numeric inputs", () => {
    expect(parseInputString("2, 3")).toEqual([2, 3]);
    expect(parseInputString("")).toEqual([]);
    expect(parseInputString("7")).toEqual([7]);
  });
});
