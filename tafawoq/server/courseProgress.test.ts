import { describe, expect, it } from "vitest";
import {
  computeProgressPercent,
  isCourseComplete,
  isLessonLockedByOrder,
} from "./courseProgress";

describe("computeProgressPercent (shared between MySQL and SQLite backends)", () => {
  it("returns 0 for a course with no lessons", () => {
    expect(computeProgressPercent([], [])).toBe(0);
  });

  it("returns 0 when nothing is completed yet", () => {
    expect(computeProgressPercent([1, 2, 3, 4], [])).toBe(0);
  });

  it("returns 100 when every lesson is completed", () => {
    expect(computeProgressPercent([1, 2, 3, 4], [1, 2, 3, 4])).toBe(100);
  });

  it("rounds to the nearest whole percent for partial completion", () => {
    // 1 of 3 = 33.33...% -> rounds to 33
    expect(computeProgressPercent([1, 2, 3], [1])).toBe(33);
    // 2 of 3 = 66.66...% -> rounds to 67
    expect(computeProgressPercent([1, 2, 3], [1, 2])).toBe(67);
  });

  it("never exceeds 100 even if completed ids include ones outside the course (defensive cap)", () => {
    expect(computeProgressPercent([1, 2], [1, 2, 999, 1000])).toBe(100);
  });

  it("ignores duplicate completed ids correctly", () => {
    expect(computeProgressPercent([1, 2], [1, 1, 1])).toBe(50);
  });
});

describe("isCourseComplete", () => {
  it("is true only at exactly 100", () => {
    expect(isCourseComplete(100)).toBe(true);
    expect(isCourseComplete(99)).toBe(false);
    expect(isCourseComplete(0)).toBe(false);
  });
});

describe("isLessonLockedByOrder (shared between MySQL and SQLite backends)", () => {
  const ordered = [10, 20, 30, 40];

  it("the first lesson in a course is never locked", () => {
    expect(isLessonLockedByOrder(ordered, 10, [])).toBe(false);
  });

  it("a lesson is locked when the immediately preceding one isn't completed", () => {
    expect(isLessonLockedByOrder(ordered, 20, [])).toBe(true);
    expect(isLessonLockedByOrder(ordered, 30, [10])).toBe(true); // lesson 20 not done yet
  });

  it("a lesson unlocks once the immediately preceding one is completed", () => {
    expect(isLessonLockedByOrder(ordered, 20, [10])).toBe(false);
    expect(isLessonLockedByOrder(ordered, 30, [10, 20])).toBe(false);
  });

  it("a lesson id not found in the ordered list is treated as unlocked (index <= 0 branch)", () => {
    expect(isLessonLockedByOrder(ordered, 999, [])).toBe(false);
  });
});
