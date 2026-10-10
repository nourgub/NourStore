import { describe, expect, it } from "vitest";
import { spokenSegments } from "../../shared/spokenArabic";
import { teacherMessageSpeech } from "../../shared/bacPlatform";
import { prosePieces, teacherMessageSentences, variantSentences, warmupPieces, warmupSentences } from "./ttsWarmup";

describe("voice warm-up", () => {
  it("prepares every fixed sentence once, in Fusha and Darja, each a single request", () => {
    const sentences = warmupSentences();
    expect(new Set(sentences).size).toBe(sentences.length);
    expect(sentences).toContain("أتمنى أن تكون بخير.");
    expect(sentences).toContain("إن شاء الله راك لاباس.");
    for (const sentence of sentences) expect(sentence.length).toBeLessThanOrEqual(180);
    // The whole fixed corpus fits well inside one month of Azure's free tier, for both voices.
    expect(2 * sentences.reduce((sum, sentence) => sum + sentence.length, 0)).toBeLessThan(450_000);
  });

  it("prepares the maths vocabulary assembled sentences are made of", () => {
    const pieces = warmupPieces();
    for (const word of ["إكس", "تربيع", "ناقص", "يساوي", "0", "12", "100"]) expect(pieces).toContain(word);
    for (const word of pieces) expect(spokenSegments(word)[0].math).toBe(true);
  });

  it("prepares the spoken variants of the generated exercises, never a student's own sentence", () => {
    const one = variantSentences(1);
    const two = variantSentences(2);
    expect(one.length).toBeGreaterThan(500);
    expect(two.length).toBeGreaterThan(one.length);
    expect(two.slice(0, one.length)).toEqual(one); // variant 1 of everything comes first
    expect(one.some(sentence => sentence.includes("ظظظ"))).toBe(false);
    expect(one).toContain("قل جوابك أو اكتبه.");
  });

  it("prepares the prose between the maths, so any maths sentence can be assembled", () => {
    expect(prosePieces(["إذن الجواب: 6 إكس ناقص 5.", "أتمنى أن تكون بخير."])).toEqual(["إذن الجواب:"]);
  });

  it("reads the BAC teacher's structured messages part by part, never the section labels", () => {
    const text = teacherMessageSpeech({
      title: "مثال محلول — الاشتقاق",
      explanation: "نطبّق القاعدة على مثال.",
      formula: ["(xⁿ)′ = n·xⁿ⁻¹"],
      example: { problem: "f(x) = x³", steps: ["…"], answer: "f′(x) = 3x²" },
      question: "ما أول خطوة؟",
    });
    expect(text.split("\n")).toHaveLength(6);
    expect(text).not.toMatch(/العنوان|الشرح|سؤال للطالب/);
    const sentences = teacherMessageSentences(1);
    expect(sentences).toContain("هل فهمت هذه الخطوة؟");
    expect(sentences).toContain("هل فهمت هادي الخطوة؟"); // Darja
    for (const sentence of sentences) expect(sentence.length).toBeLessThanOrEqual(180);
  });
});
