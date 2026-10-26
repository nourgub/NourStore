import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import { getKbSource, getKbSourceDocument } from "@/lib/db";
import { extractSourceDocument } from "@/lib/knowledgeBase/service";

// Deliberately manual: the admin pastes text they have already read and
// confirmed on the source page/file themselves — this route never fetches
// or scrapes the document's url on its own. The source's CURRENT license
// status is read server-side (never trusted from the request body), so a
// client can't bypass canStoreFullText/canStoreExcerpt by claiming a more
// permissive license than what's actually on file.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminTeacher(teacher)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const document = getKbSourceDocument(id);
  if (!document) return NextResponse.json({ error: "وثيقة غير موجودة" }, { status: 404 });
  const source = getKbSource(document.sourceId);
  if (!source) return NextResponse.json({ error: "مصدر الوثيقة غير موجود" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const extractedText = body?.extractedText;
  if (typeof extractedText !== "string" || !extractedText.trim()) {
    return NextResponse.json({ error: "النص المستخرج فارغ" }, { status: 400 });
  }

  const result = extractSourceDocument({
    documentId: id,
    sourceLicenseStatus: source.licenseStatus,
    extractedText,
  });
  return NextResponse.json(result);
}
