import { NextResponse } from "next/server";
import { z } from "zod";
import { findMerchantByPhone } from "@/lib/merchants";
import { createResetCode } from "@/lib/password-reset";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ phone: z.string().trim().min(1) });

export async function POST(request: Request) {
  const limit = rateLimit(`forgot-password:${getClientIp(request)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة جدًا، حاول لاحقًا" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  // Always respond with the same generic message, whether or not the phone is
  // registered, so this endpoint can't be used to enumerate accounts.
  const merchant = await findMerchantByPhone(parsed.data.phone);
  if (merchant) {
    const code = await createResetCode(merchant.id);
    void sendWhatsappMessage(
      merchant.phone,
      `رمز إعادة تعيين كلمة المرور الخاص بك في نور ستور هو: ${code}\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.`,
    );
  }

  return NextResponse.json({
    message: "إذا كان هذا الرقم مسجَّلًا، أرسلنا رمز إعادة التعيين عبر واتساب.",
  });
}
