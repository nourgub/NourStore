import { describe, expect, it } from "vitest";
import { spokenSegments } from "../../shared/spokenArabic";
import { warmupPieces, warmupSentences } from "./ttsWarmup";

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
});
