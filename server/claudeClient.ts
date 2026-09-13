// Shared transport for the teacher assistant's four Claude calls (lesson
// preparation, exam design, model solutions, paper grading). The pedagogy
// lives in server/prompts/*; this file only knows how to send a system
// prompt and hand back text.
//
// Same rule as every other optional integration in this codebase (payments,
// S3, WhatsApp): with no ANTHROPIC_API_KEY set, this reports itself as
// unconfigured and returns a refusal the UI can show. It never falls back to
// a canned or locally-assembled answer — a teacher walking into a classroom
// with a fabricated lesson plan, or handing back a fabricated mark, is worse
// than a teacher who was told the feature is off.

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";

/** Used unless ANTHROPIC_MODEL overrides it. */
export const DEFAULT_CLAUDE_MODEL = "claude-opus-5";

/**
 * Generous enough for the longest of the four outputs (a full model solution
 * with a per-step grading scale for every question) without truncating.
 * Non-streaming: each of these is a single artefact the teacher reads once it
 * lands, not a chat stream.
 */
const DEFAULT_MAX_TOKENS = 16000;

/** Well under any reverse-proxy limit, and far above a normal call. */
const REQUEST_TIMEOUT_MS = 180_000;

export function isClaudeConfigured(): boolean {
  return Boolean(ENV.anthropicApiKey);
}

export function claudeModel(): string {
  return ENV.anthropicModel || DEFAULT_CLAUDE_MODEL;
}

export const NOT_CONFIGURED_MESSAGE =
  "مساعد الأستاذ غير مفعَّل بعد. اضبط ANTHROPIC_API_KEY (مفتاح من https://console.anthropic.com/settings/keys) لتفعيله.";

export type ClaudeTextResult =
  | {
      ok: true;
      text: string;
      model: string;
      /** True when max_tokens cut the answer off — callers warn instead of pretending it is complete. */
      truncated: boolean;
    }
  | {
      ok: false;
      reason: "not_configured" | "refused" | "provider_error";
      message: string;
    };

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Built on first use, not at module load: ENV is read at import time, and
  // tests stub ANTHROPIC_API_KEY then re-import this module.
  if (!client) {
    client = new Anthropic({
      apiKey: ENV.anthropicApiKey,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return client;
}

/**
 * One Claude call. Never throws for an expected failure (unconfigured,
 * refusal, API error) — those come back as a discriminated result the caller
 * maps onto a tRPC error, exactly like server/chargilyProvider.ts does for
 * payments.
 */
export async function askClaude(input: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<ClaudeTextResult> {
  if (!isClaudeConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message: NOT_CONFIGURED_MESSAGE,
    };
  }
  try {
    const response = await getClient().beta.messages.create({
      // Server-side fallback: if a safety classifier declines this request,
      // the API re-runs it on a fallback model inside the same call instead
      // of leaving the teacher with nothing. "default" lets Anthropic route
      // by refusal category, so there is no model list to maintain here.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      model: claudeModel(),
      max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
    });
    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        reason: "refused",
        message:
          response.stop_details?.explanation ||
          "تعذّر توليد هذا المحتوى. أعد صياغة المعطيات وحاول مجدداً.",
      };
    }
    const text = response.content
      .filter(
        (block): block is Anthropic.Beta.BetaTextBlock => block.type === "text"
      )
      .map(block => block.text)
      .join("\n")
      .trim();
    if (!text) {
      return {
        ok: false,
        reason: "provider_error",
        message: "وصل ردّ فارغ من Claude. حاول مرة أخرى.",
      };
    }
    return {
      ok: true,
      text,
      model: response.model,
      truncated: response.stop_reason === "max_tokens",
    };
  } catch (error) {
    // Most specific first — a 401 is a deployment mistake to fix, a 429 is
    // worth retrying in a minute, and the two deserve different messages.
    if (error instanceof Anthropic.AuthenticationError) {
      return {
        ok: false,
        reason: "provider_error",
        message: "مفتاح ANTHROPIC_API_KEY مرفوض. تحقّق من صلاحيته.",
      };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return {
        ok: false,
        reason: "provider_error",
        message: "تم تجاوز حدّ الطلبات مؤقتاً. أعد المحاولة بعد دقيقة.",
      };
    }
    if (error instanceof Anthropic.APIError) {
      return {
        ok: false,
        reason: "provider_error",
        message: `رفضت واجهة Claude الطلب (HTTP ${error.status ?? "?"}).`,
      };
    }
    return {
      ok: false,
      reason: "provider_error",
      message: `فشل الاتصال بـ Claude: ${(error as Error).message}`,
    };
  }
}

/** Test seam: drops the memoised client so a re-stubbed ENV is picked up. */
export function resetClaudeClient(): void {
  client = null;
}
