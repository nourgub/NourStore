// Covers the fallback engine decision: when no Claude key is configured,
// Gemini (which has a genuine free tier) becomes the PRIMARY grader instead
// of grading being unavailable — never a mock, since gradeStudentPaper has
// no mock path and neither does reviewStudentPaperWithGemini. A real
// independent (dual-model) review only ever runs when both providers are
// configured, since reviewing Gemini's own grading with Gemini again would
// not be an independent second opinion.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nourstore-grading-priority-test-"));
process.env.DATA_DIR = tmpDir;

let isPrimaryGraderClaude: typeof import("../src/lib/grading").isPrimaryGraderClaude;
let shouldRunIndependentGeminiReview: typeof import("../src/lib/grading").shouldRunIndependentGeminiReview;

before(async () => {
  const grading = await import("../src/lib/grading");
  isPrimaryGraderClaude = grading.isPrimaryGraderClaude;
  shouldRunIndependentGeminiReview = grading.shouldRunIndependentGeminiReview;
});

// Each sub-test manipulates process.env directly and restores it immediately
// after, since isPrimaryGraderClaude/shouldRunIndependentGeminiReview read
// the env live on every call (no caching) — see isGradingConfigured /
// isGeminiConfigured.
function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) previous[key] = process.env[key];
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Claude is the primary grader when its key is configured, regardless of Gemini", () => {
  withEnv({ ANTHROPIC_API_KEY: "sk-ant-test", GEMINI_API_KEY: undefined }, () => {
    assert.equal(isPrimaryGraderClaude(), true);
  });
  withEnv({ ANTHROPIC_API_KEY: "sk-ant-test", GEMINI_API_KEY: "test-gemini-key" }, () => {
    assert.equal(isPrimaryGraderClaude(), true);
  });
});

test("Gemini becomes the primary grader when Claude is not configured", () => {
  withEnv({ ANTHROPIC_API_KEY: undefined, GEMINI_API_KEY: "test-gemini-key" }, () => {
    assert.equal(isPrimaryGraderClaude(), false);
  });
});

test("an independent (dual-model) review only ever runs when BOTH providers are configured", () => {
  withEnv({ ANTHROPIC_API_KEY: "sk-ant-test", GEMINI_API_KEY: "test-gemini-key" }, () => {
    assert.equal(shouldRunIndependentGeminiReview(), true);
  });
  withEnv({ ANTHROPIC_API_KEY: "sk-ant-test", GEMINI_API_KEY: undefined }, () => {
    assert.equal(
      shouldRunIndependentGeminiReview(),
      false,
      "Claude alone, with no Gemini configured, has no second model to review it",
    );
  });
  withEnv({ ANTHROPIC_API_KEY: undefined, GEMINI_API_KEY: "test-gemini-key" }, () => {
    assert.equal(
      shouldRunIndependentGeminiReview(),
      false,
      "Gemini grading itself a second time is not an independent review",
    );
  });
  withEnv({ ANTHROPIC_API_KEY: undefined, GEMINI_API_KEY: undefined }, () => {
    assert.equal(shouldRunIndependentGeminiReview(), false);
  });
});
