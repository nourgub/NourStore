// Teacher assistant — "تحضير الدروس" (maths lesson preparation).
//
// One Claude Messages API call: the teacher gives a level, a topic, a lesson
// length and (optionally) the class's prior knowledge, and gets back a full
// Arabic lesson plan — objectives, a real-world hook, a timed breakdown,
// two worked examples, four graded exercises, and the three mistakes this
// topic reliably produces. The pedagogical contract lives in
// server/prompts/mathLessonPlan.ts; this file is only the transport.
//
// Same rule as every other optional integration in this codebase (payments,
// S3, WhatsApp): with no ANTHROPIC_API_KEY set, this reports itself as
// unconfigured and returns a refusal the UI can show. It never falls back to
// a canned or locally-assembled "lesson plan" — a teacher walking into a
// classroom with a fabricated plan is worse than a teacher who was told the
// feature is off.

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import {
  fillMathLessonPlanPrompt,
  MATH_LESSON_PLAN_TRIGGER,
  type MathLessonPlanContext,
} from "./prompts/mathLessonPlan";

/** Used unless ANTHROPIC_MODEL overrides it. */
export const DEFAULT_LESSON_PLANNER_MODEL = "claude-opus-5";

/**
 * Generous enough for a full plan (six sections, a table and two worked
 * examples) without risking a truncated one. Non-streaming: a lesson plan is
 * a single artefact the teacher reads after it lands, not a chat stream.
 */
const MAX_TOKENS = 16000;

/** Well under any reverse-proxy limit, and far above a normal ~1 min call. */
const REQUEST_TIMEOUT_MS = 180_000;

export function isLessonPlannerConfigured(): boolean {
  return Boolean(ENV.anthropicApiKey);
}

export function lessonPlannerModel(): string {
  return ENV.anthropicModel || DEFAULT_LESSON_PLANNER_MODEL;
}

export type LessonPlanResult =
  | {
      ok: true;
      /** The plan itself, Markdown with the six `##` sections. */
      markdown: string;
      model: string;
      /** True when MAX_TOKENS cut the plan off — the UI warns instead of pretending it is complete. */
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
 * Generates one Arabic maths lesson plan. Never throws for an expected
 * failure (unconfigured, refusal, API error) — those come back as a
 * discriminated result the caller maps onto a tRPC error, exactly like
 * server/chargilyProvider.ts does for payments.
 */
export async function generateMathLessonPlan(
  context: MathLessonPlanContext
): Promise<LessonPlanResult> {
  if (!isLessonPlannerConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "مساعد تحضير الدروس غير مفعَّل بعد. اضبط ANTHROPIC_API_KEY (مفتاح من https://console.anthropic.com/settings/keys) لتفعيله.",
    };
  }
  const systemPrompt = fillMathLessonPlanPrompt(context);
  try {
    const response = await getClient().beta.messages.create({
      // Server-side fallback: if a safety classifier declines this request,
      // the API re-runs it on a fallback model inside the same call instead
      // of leaving the teacher with nothing. "default" lets Anthropic route
      // by refusal category, so there is no model list to maintain here.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      model: lessonPlannerModel(),
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: MATH_LESSON_PLAN_TRIGGER }],
    });
    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        reason: "refused",
        message:
          response.stop_details?.explanation ||
          "تعذّر توليد هذا الدرس. أعد صياغة العنوان أو المستوى وحاول مجدداً.",
      };
    }
    const markdown = response.content
      .filter(
        (block): block is Anthropic.Beta.BetaTextBlock => block.type === "text"
      )
      .map(block => block.text)
      .join("\n")
      .trim();
    if (!markdown) {
      return {
        ok: false,
        reason: "provider_error",
        message: "وصل ردّ فارغ من Claude. حاول مرة أخرى.",
      };
    }
    return {
      ok: true,
      markdown,
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
export function resetLessonPlannerClient(): void {
  client = null;
}
