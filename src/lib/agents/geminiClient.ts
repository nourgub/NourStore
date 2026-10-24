import { GoogleGenAI, ApiError } from "@google/genai";

// Verified against the installed @google/genai SDK's own type definitions
// (v2.31.0) rather than assumed from memory — "gemini-flash-latest" and
// "gemini-pro-latest" are official rolling aliases Google maintains, used in
// the SDK's own code examples. Flash is the default here because this is an
// auxiliary independent-review role, not primary content generation; set
// GEMINI_MODEL=gemini-pro-latest on the server for stronger (pricier) review.
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
