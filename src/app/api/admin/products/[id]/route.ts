import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { productInputSchema } from "@/lib/product-schema";

const toggleSchema = z.object({ active: z.boolean() }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const toggleOnly = toggleSchema.safeParse(body);
  if (toggleOnly.success) {
    const product = await db.product.update({
      where: { id },
      data: { active: toggleOnly.data.active },
    });
    return NextResponse.json({ product });
  }

  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const existingWithSlug = await db.product.findUnique({ where: { slug: parsed.data.slug } });
  if (existingWithSlug && existingWithSlug.id !== id) {
    return NextResponse.json({ error: "هذا الرابط مستخدم لخدمة أخرى" }, { status: 409 });
  }

  const { features, ...rest } = parsed.data;
  const product = await db.product.update({
    where: { id },
    data: { ...rest, features: JSON.stringify(features) },
  });

  return NextResponse.json({ product });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const orderCount = await db.order.count({ where: { productId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      {
        error: `لا يمكن حذف هذه الخدمة لوجود ${orderCount} طلب مرتبط بها. عطّلها بدل حذفها.`,
      },
      { status: 409 },
    );
  }

  await db.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
