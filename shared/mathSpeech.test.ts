import { describe, expect, it } from "vitest";
import { integerToArabicWords, numberToArabicWords, spellNumbers } from "./arabicNumbers";
import { spokenParts, toSpokenArabic } from "./spokenArabic";

/**
 * The maths normalizer: the screen keeps the formula, only the text sent to
 * the voice is rewritten. Cases asked for the Algerian voice, with the
 * digit-free form TassiliTTS needs (it cannot read digits).
 */
describe("maths read aloud", () => {
  const cases: Array<[string, string]> = [
    ["f’(x) = 2x + 3", "إف مشتقة إكس يساوي 2 إكس زائد 3"],
    ["f′(x) = 2x + 3", "إف مشتقة إكس يساوي 2 إكس زائد 3"],
    ["x² + 3x = 0", "إكس تربيع زائد 3 إكس يساوي 0"],
    ["√x", "جذر إكس"],
    ["sin(x)", "جيب إكس"],
    ["cos(x)", "جيب التمام إكس"],
    ["2024", "2024"],
    ["1/2", "1 على 2"],
    ["lim(x→0)", "نهاية إكس يؤول إلى 0"],
  ];
  for (const [written, spoken] of cases) {
    it(`reads ${written}`, () => expect(toSpokenArabic(written)).toBe(spoken));
  }

  it("keeps the displayed formula unchanged (the rewrite is a copy)", () => {
    const formula = "f’(x) = 2x + 3";
    toSpokenArabic(formula);
    expect(formula).toBe("f’(x) = 2x + 3");
  });

  it("leaves an ordinary apostrophe in prose alone", () => {
    expect(toSpokenArabic("l'exercice")).not.toContain("مشتقة");
  });
});

describe("numbers in words (for a voice that cannot read digits)", () => {
  const numbers: Array<[number, string]> = [
    [0, "صفر"],
    [2, "اثنان"],
    [11, "أحد عشر"],
    [21, "واحد وعشرون"],
    [100, "مائة"],
    [200, "مئتان"],
    [305, "ثلاثمائة وخمسة"],
    [1000, "ألف"],
    [2000, "ألفان"],
    [2024, "ألفان وأربعة وعشرون"],
    [3000, "ثلاثة آلاف"],
    [15000, "خمسة عشر ألف"],
    [1_000_000, "مليون"],
  ];
  for (const [value, words] of numbers) {
    it(`${value}`, () => expect(integerToArabicWords(value)).toBe(words));
  }

  it("decimals and leading zeros", () => {
    expect(numberToArabicWords("3.5")).toBe("ثلاثة فاصلة خمسة");
    expect(numberToArabicWords("0,25")).toBe("صفر فاصلة خمسة وعشرون");
    expect(numberToArabicWords("0.05")).toBe("صفر فاصلة صفر خمسة");
    expect(numberToArabicWords("007")).toBe("صفر صفر سبعة");
  });

  it("the asked examples end up with no digit and no Latin letter", () => {
    for (const written of ["f’(x) = 2x + 3", "x² + 3x = 0", "√x", "sin(x)", "cos(x)", "2024", "1/2", "lim(x→0)"]) {
      const spoken = spellNumbers(toSpokenArabic(written));
      expect(spoken, written).not.toMatch(/[0-9A-Za-z]/);
    }
    expect(spellNumbers(toSpokenArabic("f’(x) = 2x + 3"))).toBe("إف مشتقة إكس يساوي اثنان إكس زائد ثلاثة");
    expect(spellNumbers(toSpokenArabic("1/2"))).toBe("واحد على اثنان");
    expect(spellNumbers(toSpokenArabic("lim(x→0)"))).toBe("نهاية إكس يؤول إلى صفر");
  });

  it("the voice's parts of a lesson sentence keep the maths readable", () => {
    const parts = spokenParts("المشتقة: f’(x) = 2x + 3", null);
    expect(parts.map(part => part.text).join(" ")).toContain("مشتقة إكس");
  });
});
