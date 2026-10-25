import { GoogleGenAI, ApiError } from "@google/genai";

// "gemini-flash-lite-latest" is Google's rolling alias for its current
// Flash-Lite tier — chosen over the (also real, also rolling) alias
// "gemini-flash-latest" after LIVE testing against a real free-tier API key
// on 2026-10-25: "gemini-flash-latest" returned repeated genuine 503 "high
// demand" errors (confirmed via the raw @google/genai SDK call, not a bug in
// this codebase), while "gemini-flash-lite-latest" succeeded reliably on the
// exact same image+structured-JSON-schema request and correctly read real
// handwritten-style math content from a test image. This is a live
// operational condition on Google's side, not a permanent quality verdict —
// if "gemini-flash-latest" becomes reliably available again, it is the
// stronger model for this workload and worth re-testing. Gemini now fills
// two roles: the original optional independent reviewer (alongside Claude),
// and — since it has a genuine free tier and Claude does not — the PRIMARY
// engine for exam generation, lesson prep, and grading whenever
// ANTHROPIC_API_KEY isn't configured. To pin a specific model instead of
// following the rolling alias, set GEMINI_MODEL on the server — check
// ai.google.dev/gemini-api/docs/models first, since Google's lineup changes
// frequently (this file's own live model-list call surfaced models up to
// the "3.8" generation as of this writing).
const DEFAULT_MODEL = "gemini-flash-lite-latest";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Thrown for every Gemini failure mode (missing key, auth, rate limit,
// network, malformed output) — callers must surface this as "لم تتم
// المراجعة" / "فشلت المراجعة", never as a successful review.
export class GeminiReviewError extends Error {}

export interface GeminiImageInput {
  data: string; // base64, no data: prefix
  mimeType: "image/jpeg" | "image/png";
}

export interface GeminiJsonCallInput {
  systemInstruction?: string;
  prompt: string;
  images?: GeminiImageInput[];
  /** Plain JSON Schema (not Zod) restricted to the subset the Gemini API supports. */
  jsonSchema: unknown;
  maxOutputTokens?: number;
}

export interface GeminiJsonCallResult {
  /** Raw JSON text — callers parse and validate it themselves (e.g. with Zod). */
  text: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Calls Gemini with structured JSON output. Never returns a fabricated
 * success: any failure (including "no key configured") raises
 * GeminiReviewError so the caller's review status becomes "not_reviewed" or
 * "failed", never a fake "reviewed".
 */
export async function callGeminiJson(input: GeminiJsonCallInput): Promise<GeminiJsonCallResult> {
  if (!isGeminiConfigured()) {
    throw new GeminiReviewError("لم تتم المراجعة — مفتاح Gemini API غير مُعدّ على الخادم");
  }

  const model = getGeminiModel();
  const parts = [
    ...(input.images ?? []).map((img) => ({ inlineData: { data: img.data, mimeType: img.mimeType } })),
    { text: input.prompt },
  ];

  let text: string | undefined;
  let usage = { inputTokens: 0, outputTokens: 0 };
  try {
    const response = await getClient().models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: input.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: input.jsonSchema,
        maxOutputTokens: input.maxOutputTokens ?? 16000,
      },
    });
    text = response.text;
    usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } catch (err) {
    // Never log `err` itself — it may embed request content (images/answers)
    // or, in rare SDK error paths, request metadata. Only ever surface a
    // fixed, safe Arabic message.
    if (err instanceof ApiError) {
      if (err.status === 401 || err.status === 403) {
        throw new GeminiReviewError("فشلت المراجعة — مفتاح Gemini API غير صالح أو منتهي الصلاحية");
      }
      if (err.status === 429) {
        throw new GeminiReviewError("فشلت المراجعة — خدمة Gemini مشغولة حاليًا، ستُعاد المحاولة لاحقًا");
      }
      if (err.status >= 500) {
        throw new GeminiReviewError("فشلت المراجعة — خطأ في خدمة Gemini، ستُعاد المحاولة لاحقًا");
      }
      throw new GeminiReviewError(`فشلت المراجعة — طلب غير صالح لخدمة Gemini (رمز ${err.status})`);
    }
    throw new GeminiReviewError("فشلت المراجعة — تعذّر الاتصال بخدمة Gemini");
  }

  if (!text) {
    throw new GeminiReviewError("فشلت المراجعة — لم تُرجع خدمة Gemini أي محتوى");
  }

  return { text, model, usage };
}
