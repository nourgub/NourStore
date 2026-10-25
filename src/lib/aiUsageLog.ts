import { insertAiUsageLog, getAiUsageCostSummary, getPlatformAiUsageCostSummary, type AiUsageCostSummary } from "./db";
import { estimateCostUsd } from "./aiPricing";

export interface RecordAiUsageInput {
  teacherId: string;
  feature: string; // "grading", "exams", "lessonPrep" — a free string, not UsageFeature, since this logs per-provider-call, not per billing feature
  operationId: string;
  provider: "claude" | "gemini";
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  pageCount?: number;
}

// Records exactly one real provider call — never estimated token counts,
// only whatever the provider's own response reported. Never throws: a
// logging failure must not fail the actual operation it's recording (the
// grade/exam/lesson prep result already succeeded by the time this runs).
export function recordAiUsage(input: RecordAiUsageInput): void {
  try {
    insertAiUsageLog({
      id: `aiu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      teacherId: input.teacherId,
      feature: input.feature,
      operationId: input.operationId,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      estimatedCostUsd: estimateCostUsd(input.model, input.inputTokens, input.outputTokens),
      durationMs: input.durationMs,
      pageCount: input.pageCount ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Never let a logging failure surface to the caller — this is
    // observability, not a correctness requirement of the feature it's
    // attached to.
  }
}

export { getAiUsageCostSummary, getPlatformAiUsageCostSummary, type AiUsageCostSummary };
