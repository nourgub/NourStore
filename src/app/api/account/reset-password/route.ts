import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { findMerchantByPhone } from "@/lib/merchants";
import { hashPassword } from "@/lib/password";
import { consumeResetCode } from "@/lib/password-reset";
import { createMerchantSessionToken, MERCHANT_SESSION_COOKIE } from "@/lib/merchant-auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  phone: z.string().trim().min(1),
  code: z.string().trim().regex(/^\d{6}$/, "الرمز يجب أن يتكون من 6 أرقام"),
  newPassword: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(100),
});

export async function POST(request: Request) {
  const limit = rateLimit(`reset-password:${getClientIp(request)}`, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة جدًا، حاول لاحقًا" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const merchant = await findMerchantByPhone(parsed.data.phone);
  if (!merchant) {
    return NextResponse.json({ error: "الرمز غير صحيح أو منتهي الصلاحية" }, { status: 400 });
  }

  const valid = await consumeResetCode(merchant.id, parsed.data.code);
  if (!valid) {
    return NextResponse.json({ error: "الرمز غير صحيح أو منتهي الصلاحية" }, { status: 400 });
  }

  await db.merchant.update({
    where: { id: merchant.id },
    data: { passwordHash: hashPassword(parsed.data.newPassword) },
  });

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
