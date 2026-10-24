import { GoogleGenAI, ApiError } from "@google/genai";

// "gemini-flash-latest" is Google's official rolling alias for its current
// Flash-tier model — re-confirmed live against ai.google.dev/gemini-api/docs/models
// on 2026-10-24 (still that page's own example of the "latest" naming
// pattern), after first being verified against the installed @google/genai
// SDK's type definitions (v2.31.0). It auto-tracks whichever model Google
// currently serves as "Flash", so it needs no code change as the lineup
// moves forward. Flash is the default here because this is an auxiliary
// independent-review role, not primary content generation. To pin an exact
// model instead of following the rolling alias, set GEMINI_MODEL on the
// server (e.g. a specific, currently-available Pro-tier id) — check the
// docs link above first, since Google's lineup changes frequently.
const DEFAULT_MODEL = "gemini-flash-latest";

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

  return { text, model };
}
