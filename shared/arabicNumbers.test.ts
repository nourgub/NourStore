import { describe, expect, it } from "vitest";
import { integerWords, numbersInWords } from "./arabicNumbers";

describe("numbers in Arabic words", () => {
  it("says whole numbers", () => {
    expect(integerWords(0)).toBe("صفر");
    expect(integerWords(7)).toBe("سبعة");
    expect(integerWords(12)).toBe("اثنا عشر");
    expect(integerWords(25)).toBe("خمسة وعشرون");
    expect(integerWords(40)).toBe("أربعون");
    expect(integerWords(100)).toBe("مئة");
    expect(integerWords(305)).toBe("ثلاثمئة وخمسة");
    expect(integerWords(2000)).toBe("ألفان");
    expect(integerWords(3250)).toBe("ثلاثة آلاف ومئتان وخمسون");
    expect(integerWords(45000)).toBe("خمسة وأربعون ألف");
  });

  it("says the numbers inside a sentence", () => {
    expect(numbersInWords("6 إكس ناقص 5")).toBe("ستة إكس ناقص خمسة");
    expect(numbersInWords("النتيجة 2.5 و 0.05 و 50%")).toBe("النتيجة اثنان فاصل خمسة و صفر فاصل صفر خمسة و خمسون بالمئة");
  });
});
