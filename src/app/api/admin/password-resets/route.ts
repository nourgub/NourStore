import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import { listPendingPasswordResetsForAdmin } from "@/lib/passwordReset";

export async function GET() {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminTeacher(teacher)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const requests = listPendingPasswordResetsForAdmin();
  return NextResponse.json({ requests });
}
