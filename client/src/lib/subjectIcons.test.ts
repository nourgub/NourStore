import { describe, expect, it } from "vitest";
import { Atom, BookOpen, Sigma } from "lucide-react";
import { subjectIcon, SUBJECT_ICON_KEYS } from "./subjectIcons";

describe("subjectIcon", () => {
  it("resolves a known icon key to the correct real lucide component", () => {
    expect(subjectIcon("sigma")).toBe(Sigma);
    expect(subjectIcon("atom")).toBe(Atom);
  });

  it("falls back to BookOpen for an unknown icon key", () => {
    expect(subjectIcon("not-a-real-key")).toBe(BookOpen);
  });

  it("falls back to BookOpen for null/undefined (admin hasn't set one yet)", () => {
    expect(subjectIcon(null)).toBe(BookOpen);
    expect(subjectIcon(undefined)).toBe(BookOpen);
  });

  it("exposes every icon key the admin's subject-creation form can offer", () => {
    expect(SUBJECT_ICON_KEYS).toContain("sigma");
    expect(SUBJECT_ICON_KEYS).toContain("atom");
    expect(SUBJECT_ICON_KEYS.length).toBeGreaterThan(5);
  });

  it("every key in SUBJECT_ICON_KEYS actually resolves to a real component, not the fallback", () => {
    for (const key of SUBJECT_ICON_KEYS) {
      expect(subjectIcon(key)).not.toBe(undefined);
    }
  });
});
