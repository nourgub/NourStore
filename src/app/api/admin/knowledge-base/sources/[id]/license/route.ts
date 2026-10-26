import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import { getKbSource } from "@/lib/db";
import { setSourceLicenseStatus } from "@/lib/knowledgeBase/service";
import type { KbLicenseStatus } from "@/lib/types";

const VALID_LICENSES: KbLicenseStatus[] = ["public_domain", "permitted_excerpt", "unknown", "restricted"];
function isKbLicenseStatus(value: unknown): value is KbLicenseStatus {
  return typeof value === "string" && (VALID_LICENSES as string[]).includes(value);
}

// The one place a human can move a source's license status. Nothing else
// in the codebase sets this on its own — see knowledgeBase/service.ts's
// canStoreFullText/canStoreExcerpt, which gate extraction on exactly this
// field.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminTeacher(teacher)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const source = getKbSource(id);
  if (!source) return NextResponse.json({ error: "مصدر غير موجود" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const licenseStatus = body?.licenseStatus;
  if (!isKbLicenseStatus(licenseStatus)) {
    return NextResponse.json({ error: "حالة ترخيص غير صالحة" }, { status: 400 });
  }

  setSourceLicenseStatus(id, licenseStatus);
  return NextResponse.json({ ok: true });
}
