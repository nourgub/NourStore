import { NextRequest, NextResponse } from "next/server";
import { confirmPasswordResetWithToken, PasswordResetError } from "@/lib/passwordReset";
import { enforceRateLimit, getClientIp, RateLimitError } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`reset-confirm:${getClientIp(request)}`, 10, 60 * 60);
  } catch (err) {
    if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
    throw err;
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!token || !newPassword) {
    return NextResponse.json({ error: "الرابط وكلمة المرور الجديدة مطلوبان" }, { status: 400 });
  }

  try {
    confirmPasswordResetWithToken(token, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PasswordResetError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
