import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orders";
import { createMerchant, findMerchantByPhone } from "@/lib/merchants";
import { verifyPassword } from "@/lib/password";
import { createMerchantSessionToken, MERCHANT_SESSION_COOKIE } from "@/lib/merchant-auth";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { formatDzd } from "@/lib/utils";
import { saveUploadedImage, UploadValidationError } from "@/lib/upload";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const orderSchema = z.object({
  productSlug: z.string().min(1),
  merchantName: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  storeName: z.string().trim().min(2, "اسم المتجر قصير جدًا").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{8,20}$/, "رقم هاتف غير صالح"),
  whatsapp: z.string().trim().max(20).nullish().or(z.literal("")),
  notes: z.string().trim().max(1000).nullish().or(z.literal("")),
  paymentMethod: z.enum(["baridimob", "ccp", "bank_transfer"]),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(100),
});

export async function POST(request: Request) {
  const limit = rateLimit(`create-order:${getClientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "طلبات كثيرة جدًا خلال وقت قصير، حاول لاحقًا" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const formData = await request.formData();

  const parsed = orderSchema.safeParse({
    productSlug: formData.get("productSlug"),
    merchantName: formData.get("merchantName"),
    storeName: formData.get("storeName"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    notes: formData.get("notes"),
    paymentMethod: formData.get("paymentMethod"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const product = await db.product.findUnique({
    where: { slug: parsed.data.productSlug },
  });
  if (!product || !product.active) {
    return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });
  }

  const existingMerchant = await findMerchantByPhone(parsed.data.phone);
  let merchantId: string;
  if (existingMerchant) {
    if (!verifyPassword(parsed.data.password, existingMerchant.passwordHash)) {
      return NextResponse.json(
        {
          error:
            "رقم الهاتف مسجّل مسبقًا بحساب. أدخل كلمة المرور الصحيحة لهذا الحساب أو سجّل الدخول من صفحة الحساب.",
        },
        { status: 409 },
      );
    }
    merchantId = existingMerchant.id;
  } else {
    const merchant = await createMerchant({
      name: parsed.data.merchantName,
      storeName: parsed.data.storeName,
      phone: parsed.data.phone,
      password: parsed.data.password,
    });
    merchantId = merchant.id;
  }

  let proofImagePath: string | null = null;
  const proofFile = formData.get("proofImage");
  if (proofFile instanceof File && proofFile.size > 0) {
    try {
      proofImagePath = await saveUploadedImage(proofFile);
    } catch (error) {
      if (error instanceof UploadValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  const orderNumber = generateOrderNumber();
  const order = await db.order.create({
    data: {
      orderNumber,
      productId: product.id,
      merchantId,
      merchantName: parsed.data.merchantName,
      storeName: parsed.data.storeName,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp || null,
      notes: parsed.data.notes || null,
      paymentMethod: parsed.data.paymentMethod,
      proofImage: proofImagePath,
      status: proofImagePath ? "proof_submitted" : "pending_payment",
    },
  });

  const notifyPhone = parsed.data.whatsapp || parsed.data.phone;
  void sendWhatsappMessage(
    notifyPhone,
    `مرحبًا ${parsed.data.merchantName}، تم استلام طلبك لخدمة "${product.name}" برقم ${orderNumber} بمبلغ ${formatDzd(product.priceDzd)}. سنتواصل معك قريبًا لتأكيد الدفع.`,
  );

  const sessionToken = await createMerchantSessionToken(merchantId);
  const response = NextResponse.json({ orderNumber: order.orderNumber });
  response.cookies.set(MERCHANT_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
