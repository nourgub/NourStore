import { NextRequest, NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
  }

  const teacher = await withDb((db) => db.teachers.find((t) => t.email === email) ?? null);

  if (!teacher || !verifyPassword(password, teacher.passwordHash, teacher.passwordSalt)) {
    return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
  }

  await createSessionCookie(teacher.id);
  return NextResponse.json({ ok: true });
}
