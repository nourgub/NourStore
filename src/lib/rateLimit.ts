import { NextRequest } from "next/server";
import { checkAndIncrementRateLimit } from "./db";

export class RateLimitError extends Error {}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Throws a clear Arabic error once the (key) bucket exceeds maxAttempts
// within windowSeconds. Callers build the key from whatever makes sense for
// that endpoint (IP alone for signup/forgot-password; IP+email for login, so
// one attacker can't lock out a real teacher's email from a different IP).
export function enforceRateLimit(key: string, maxAttempts: number, windowSeconds: number): void {
  const allowed = checkAndIncrementRateLimit(key, maxAttempts, windowSeconds);
  if (!allowed) {
    throw new RateLimitError("محاولات كثيرة جدًا — الرجاء الانتظار قليلاً ثم المحاولة مرة أخرى.");
  }
}
