import { describe, expect, it } from "vitest";
import { gradeDeterministic } from "./grading";
import { gradeQuantity, parseAnswer, parseUnit, unitFromPrompt } from "./quantity";
import { LESSONS } from "./curriculum";
import { createRng } from "./generators/core";

const metres = { type: "short" as const, answer: "2", grading: "numeric" as const, prompt: "ما المسافة التي تقطعها (بالمتر)؟" };
const status = (given: string, item: Parameters<typeof gradeDeterministic>[0] = metres) => gradeDeterministic(item, given).status;

describe("numeric answers: the whole answer, with its unit (regression)", () => {
  it("refuses another quantity's unit for 2 m (2 kg, 2 s) and a wrong value in a compatible unit (2 cm)", () => {
    expect(status("2 kg")).toBe("incorrect");
    expect(status("2 s")).toBe("incorrect");
    expect(status("2 cm")).toBe("incorrect");
  });

  it("does not read 2+100 as 2", () => {
    expect(status("2+100")).toBe("incorrect");
    expect(parseAnswer("2+100")).toMatchObject({ kind: "quantity", value: 102 });
  });

  it("accepts the right value in any compatible unit, written any usual way", () => {
    for (const given of ["2", "2 m", "2m", "200 cm", "0.002 km", "2000 mm", "2,0 m", "٢ م", "2 متر", "2×10⁰ m", "2e0 m", "4/2"]) {
      expect(status(given), given).toBe("correct");
    }
  });

  it("tells an unreadable answer from a wrong one", () => {
    expect(status("deux mètres")).toBe("unmatched");
    expect(status("2 ف")).toBe("unmatched");
    expect(status("3")).toBe("incorrect");
  });

  it("a required unit: the right value without it earns half credit", () => {
    const item = { ...metres, unitRequired: true };
    expect(gradeDeterministic(item, "2")).toMatchObject({ status: "incorrect", reason: "missing_unit", credit: 0.5 });
    expect(gradeDeterministic(item, "2 m")).toEqual({ status: "correct" });
    expect(gradeDeterministic(item, "2 kg")).toMatchObject({ status: "incorrect", reason: "wrong_unit", credit: 0 });
  });

  it("tolerance per question", () => {
    expect(status("2.03", metres)).toBe("correct"); // 1.5 % within the default 2 %
    expect(status("2.03", { ...metres, tolerance: 0.001 })).toBe("incorrect");
  });

  it("scientific notation, decimal commas, Arabic digits, compound units", () => {
    expect(parseAnswer("1,2 x 10^-3 mol/L")).toMatchObject({ kind: "quantity", value: 1.2e-3, unitText: "mol/L" });
    expect(parseAnswer("1.2×10⁻³")).toMatchObject({ kind: "quantity", value: 1.2e-3 });
    expect(parseAnswer("٣٫٥ s")).toMatchObject({ kind: "quantity", value: 3.5 });
    expect(gradeQuantity([9.8], "9,8 m/s²", { unit: "m/s²" }).status).toBe("correct");
    expect(gradeQuantity([9.8], "9.8 m.s^-2", { unit: "m/s²" }).status).toBe("correct");
    expect(gradeQuantity([9.8], "9.8 m/s", { unit: "m/s²" })).toMatchObject({ reason: "wrong_unit" });
    expect(gradeQuantity([5], "5000 µC", { unit: "mC" }).status).toBe("correct");
    expect(gradeQuantity([2], "120 s", { unit: "min" }).status).toBe("correct");
    expect(gradeQuantity([1.5], "1.5 MeV", { unit: "MeV" }).status).toBe("correct");
    expect(parseUnit("kg")?.dims).toEqual(parseUnit("g")?.dims);
    expect(parseUnit("N")?.dims).toEqual(parseUnit("kg·m/s²")?.dims);
  });

  it("reads the unit a question asks for from its wording", () => {
    expect(unitFromPrompt("احسب تسارعه بالـ m/s² (g = 10 m/s²).")).toBe("m/s²");
    expect(unitFromPrompt("ما سرعته (m/s) بعد 3 s؟")).toBe("m/s");
    expect(unitFromPrompt("ما المسافة (بالمتر)؟")).toBe("m");
    expect(unitFromPrompt("احسب ثابت الزمن τ بالميلي ثانية.")).toBe("ms");
    expect(unitFromPrompt("احسب شحنة المكثفة (بالميكروكولوم µC).")).toBe("µC");
    expect(unitFromPrompt("احسب دوره T بالدقائق.")).toBe("min");
  });

  it("multiple choice and text answers are graded as before", () => {
    const mcq = { type: "mcq" as const, answer: "ب", options: ["أ", "ب", "ج", "د"] };
    expect(status("ب", mcq)).toBe("correct");
    expect(status("أ", mcq)).toBe("incorrect");
    const expression = { type: "short" as const, answer: "6x² − 4" };
    expect(status("2(3x²−2)", expression)).toBe("correct");
  });
});

describe("every numeric question of the curriculum", () => {
  const numeric: Array<{ lesson: string; prompt: string; answer: string; accept?: string[]; unit?: string }> = [];
  for (const lesson of LESSONS) {
    for (const question of lesson.bank) if (question.grading === "numeric") numeric.push({ lesson: lesson.key, ...question });
    for (const generator of lesson.generators ?? []) {
      for (let seed = 1; seed <= 3; seed += 1) {
        const item = generator.generate(createRng(seed));
        if (item.grading === "numeric") numeric.push({ lesson: lesson.key, ...item });
      }
    }
    for (const problem of lesson.problems ?? []) {
      const draw = problem.generate(createRng(7));
      for (const part of draw.parts as Array<{ prompt: string; answer: string; grading?: string }>) {
        if (part.grading === "numeric") numeric.push({ lesson: lesson.key, prompt: part.prompt, answer: part.answer });
      }
    }
  }

  it("exist (physics and chemistry)", () => expect(numeric.length).toBeGreaterThan(40));

  it("accept their own answer, alone and with the asked unit, and refuse it with a unit of another kind", () => {
    const failures: string[] = [];
    for (const item of numeric) {
      const question = { type: "short" as const, grading: "numeric" as const, ...item };
      const unit = item.unit ?? unitFromPrompt(item.prompt);
      if (gradeDeterministic(question, item.answer).status !== "correct") failures.push(`${item.lesson}: own answer ${item.answer}`);
      if (unit) {
        if (gradeDeterministic(question, `${item.answer} ${unit}`).status !== "correct") failures.push(`${item.lesson}: ${item.answer} ${unit} | ${item.prompt.slice(0, 60)}`);
        const other = parseUnit(unit)?.dims[1] ? "s" : "kg";
        if (gradeDeterministic(question, `${item.answer} ${other}`).status === "correct") failures.push(`${item.lesson}: ${item.answer} ${other} accepted`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("report: questions whose expected unit is not stated in a readable way", () => {
    const unknown = numeric.filter(item => !(item.unit ?? unitFromPrompt(item.prompt)));
    // Counts (number of decays…), ratios and pH have no unit: listed so a reviewer can check them.
    console.info(`[units] ${numeric.length} numeric items, ${unknown.length} without a unit:`, unknown.slice(0, 12).map(item => `${item.lesson}: ${item.prompt.slice(0, 70)}`));
    expect(unknown.length).toBeLessThan(numeric.length);
  });
});
