import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import {
  KnowledgeBaseError,
  markVerifiedByHuman,
  publishContent,
  rejectContent,
  runDeterministicVerification,
  submitForVerification,
} from "@/lib/knowledgeBase/service";

type TargetType = "lesson" | "exercise" | "exam";
function isTargetType(value: string): value is TargetType {
  return value === "lesson" || value === "exercise" || value === "exam";
}

// One route for the whole review workflow on a single classified row —
// submit_verification -> verify (deterministic) -> approve/reject (human) ->
// publish — exactly the state machine in knowledgeBase/service.ts, with no
// action here able to skip a step (each service function itself enforces
// the valid prior statuses).
export async function POST(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminTeacher(teacher)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { type, id } = await params;
  if (!isTargetType(type)) return NextResponse.json({ error: "نوع عنصر غير معروف" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  try {
    if (action === "submit_verification") {
      submitForVerification(type, id);
      return NextResponse.json({ ok: true });
    }
    if (action === "verify") {
      const outcome = runDeterministicVerification(type, id);
      return NextResponse.json({ outcome });
    }
    if (action === "approve") {
      const note = typeof body?.note === "string" ? body.note : "اعتماد إداري مباشر";
      markVerifiedByHuman(type, id, teacher.id, note);
      return NextResponse.json({ ok: true });
    }
    if (action === "reject") {
      const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason : null;
      if (!reason) return NextResponse.json({ error: "سبب الرفض مطلوب" }, { status: 400 });
      rejectContent(type, id, teacher.id, reason);
      return NextResponse.json({ ok: true });
    }
    if (action === "publish") {
      publishContent(type, id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err) {
    if (err instanceof KnowledgeBaseError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
