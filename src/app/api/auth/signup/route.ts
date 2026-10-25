import { NextRequest, NextResponse } from "next/server";
import { findTeacherByEmail, insertTeacher } from "@/lib/db";
import { hashPassword, isValidEmail } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import { shouldGrantAdminOnSignup } from "@/lib/billingConfig";
import { enforceRateLimit, getClientIp, RateLimitError } from "@/lib/rateLimit";
import type { Teacher } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(`signup:${getClientIp(request)}`, 5, 60 * 60);
  } catch (err) {
    if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
    throw err;
  }

  const body = await request.json().catch(() => null);
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const adminToken = typeof body?.adminToken === "string" ? body.adminToken : "";

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "صيغة البريد الإلكتروني غير صحيحة" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور يجب ألا تقل عن 8 أحرف" }, { status: 400 });
  }

  if (findTeacherByEmail(email)) {
    return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل مسبقًا" }, { status: 409 });
  }

  const { hash, salt } = hashPassword(password);
  // Admin status requires BOTH the email match AND proof of the server-side
  // secret (ADMIN_BOOTSTRAP_TOKEN) — matching ADMIN_EMAIL alone is no longer
  // enough. Without this, anyone who learns the admin's email (it's rarely
  // truly secret) could register it first and keep admin access forever,
  // locking the real owner out. If ADMIN_BOOTSTRAP_TOKEN isn't configured at
  // all, admin can never be granted via signup — it must be set directly by
  // whoever controls the server's database.
  const isAdmin = shouldGrantAdminOnSignup(email, adminToken);
  const teacher: Teacher = {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fullName,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    // The platform owner's own account shouldn't need to pay itself, and
    // never expires (subscriptionExpiresAt stays null).
    subscriptionStatus: isAdmin ? "active" : "pending",
    planId: isAdmin ? "full" : null,
    subscriptionExpiresAt: null,
    freeTrialUsedAt: null,
    isAdmin,
    createdAt: new Date().toISOString(),
  };

  try {
    insertTeacher(teacher);
  } catch {
    // UNIQUE constraint on email — guards the narrow race the check above can't.
    return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل مسبقًا" }, { status: 409 });
  }

  await createSessionCookie(teacher.id);
  return NextResponse.json({ ok: true });
}
