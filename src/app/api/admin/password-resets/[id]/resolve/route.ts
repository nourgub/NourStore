import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminEmail } from "@/lib/billingConfig";
import { PasswordResetError, resolvePasswordReset } from "@/lib/passwordReset";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminEmail(teacher.email)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  try {
    resolvePasswordReset(id, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PasswordResetError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
