import { describe, expect, it } from "vitest";
import { truncate } from "./og-words";

describe("truncate", () => {
  it("returns short text unchanged", () => {
    expect(truncate("قصير", 10)).toBe("قصير");
  });

  it("truncates at the last word boundary within the limit", () => {
    expect(truncate("مزامنة الطلبات مع Google Sheets", 28)).toBe("مزامنة الطلبات مع Google…");
  });

  it("falls back to a hard cut when there is no space to break on", () => {
    expect(truncate("supercalifragilisticexpialidocious", 10)).toBe("supercalif…");
  });

  it("does not mutate text exactly at the limit", () => {
    const text = "12345";
    expect(truncate(text, 5)).toBe(text);
  });
});
