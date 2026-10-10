import { describe, expect, it } from "vitest";
import { toSpokenArabic } from "./speech";

describe("toSpokenArabic", () => {
  it("reads polynomials the way a teacher says them", () => {
    expect(toSpokenArabic("6x² − 4")).toBe("6 إكس تربيع ناقص 4");
    expect(toSpokenArabic("f′(x) = 20x³")).toBe("إف مشتقة إكس يساوي 20 إكس تكعيب");
    expect(toSpokenArabic("6x^2-4")).toBe("6 إكس تربيع ناقص 4");
  });

  it("keeps negative numbers and fractions audible", () => {
    expect(toSpokenArabic("−5 − (−2) = −3")).toBe("ناقص 5 ناقص ناقص 2 يساوي ناقص 3");
    expect(toSpokenArabic("x ≥ −1/2")).toBe("إكس أكبر من أو يساوي ناقص 1 على 2");
  });

  it("reads analysis, complex-number and sequence notation", () => {
    expect(toSpokenArabic("lim (x → +∞) f(x)")).toContain("نهاية إكس يؤول إلى زائد ما لا نهاية");
    expect(toSpokenArabic("|z| = √13")).toBe("طويلة زد يساوي جذر 13");
    expect(toSpokenArabic("uₙ₊₁ = 2uₙ")).toBe("يو إن زائد 1 يساوي 2 يو إن");
    expect(toSpokenArabic("Δ = b² − 4ac")).toBe("دلتا يساوي بي تربيع ناقص 4 أ سي");
  });

  it("leaves Arabic prose untouched and drops decorative symbols", () => {
    expect(toSpokenArabic("أحسنت يا أحمد! ✔")).toBe("أحسنت يا أحمد!");
  });
});
