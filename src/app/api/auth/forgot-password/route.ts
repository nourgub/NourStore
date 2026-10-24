import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/passwordReset";
import { isEmailConfigured } from "@/lib/email";
import { enforceRateLimit, getClientIp, RateLimitError } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`reset:${getClientIp(request)}`, 3, 60 * 60);
  } catch (err) {
    if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
    throw err;
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  if (!email) return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });

  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  await requestPasswordReset(email, baseUrl);
  // Always the same response, whether or not the email exists — "emailMode"
  // reflects only global server configuration (not this email's existence),
  // so the UI can describe the right next step without an enumeration leak.
  return NextResponse.json({ ok: true, emailMode: isEmailConfigured() });
}
