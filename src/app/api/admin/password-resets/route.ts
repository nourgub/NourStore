import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminEmail } from "@/lib/billingConfig";
import { listPendingPasswordResetsForAdmin } from "@/lib/passwordReset";

export async function GET() {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminEmail(teacher.email)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const requests = listPendingPasswordResetsForAdmin();
  return NextResponse.json({ requests });
}
