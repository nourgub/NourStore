import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productInputSchema } from "@/lib/product-schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const existing = await db.product.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "هذا الرابط مستخدم لخدمة أخرى" }, { status: 409 });
  }

  const { features, ...rest } = parsed.data;
  const product = await db.product.create({
    data: { ...rest, features: JSON.stringify(features) },
  });

  return NextResponse.json({ product }, { status: 201 });
}
