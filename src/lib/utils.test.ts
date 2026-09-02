import { describe, expect, it } from "vitest";
import { cn, formatDzd } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("merges conflicting Tailwind classes, keeping the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatDzd", () => {
  it("formats a price with the دج suffix", () => {
    expect(formatDzd(18000)).toBe("18.000 دج");
  });

  it("formats zero", () => {
    expect(formatDzd(0)).toBe("0 دج");
  });
});
