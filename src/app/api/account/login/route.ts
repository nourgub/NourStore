import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyMerchantCredentials } from "@/lib/merchants";
import { createMerchantSessionToken, MERCHANT_SESSION_COOKIE } from "@/lib/merchant-auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  phone: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const limit = rateLimit(`account-login:${getClientIp(request)}`, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة جدًا، حاول لاحقًا" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const merchant = await verifyMerchantCredentials(parsed.data.phone, parsed.data.password);
  if (!merchant) {
    return NextResponse.json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const token = await createMerchantSessionToken(merchant.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(MERCHANT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
