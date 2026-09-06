import { NextRequest, NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { hashPassword, isValidEmail } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import type { Teacher } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "صيغة البريد الإلكتروني غير صحيحة" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور يجب ألا تقل عن 8 أحرف" }, { status: 400 });
  }

  const { hash, salt } = hashPassword(password);

  const result = await withDb<{ error?: string; teacher?: Teacher }>((db) => {
    if (db.teachers.some((t) => t.email === email)) {
      return { error: "هذا البريد الإلكتروني مسجل مسبقًا" };
    }
    const teacher: Teacher = {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fullName,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
    };
    db.teachers.push(teacher);
    return { teacher };
  });

  if (result.error || !result.teacher) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  await createSessionCookie(result.teacher.id);
  return NextResponse.json({ ok: true });
}
