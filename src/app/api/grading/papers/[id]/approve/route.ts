import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { approvePaperGrade, GradingError, type GradeOverrideInput } from "@/lib/grading";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const rawOverrides = Array.isArray(body?.overrides) ? body.overrides : [];

  // Validated shape only — approvePaperGrade re-validates every value
  // (range, reason, that the criterion exists) against the server's own
  // stored paper. The client never gets to assert a trusted total.
  let overrides: GradeOverrideInput[];
  try {
    overrides = rawOverrides.map((o: unknown) => {
      const entry = o as Record<string, unknown>;
      if (typeof entry?.questionId !== "string" || typeof entry?.criterionId !== "string") {
        throw new GradingError("بيانات تعديل غير صالحة");
      }
      return {
        questionId: entry.questionId,
        criterionId: entry.criterionId,
        newPoints: Number(entry.newPoints),
        reason: String(entry.reason ?? ""),
      };
    });
  } catch (err) {
    if (err instanceof GradingError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  try {
    const paper = approvePaperGrade(id, teacher.id, overrides);
    return NextResponse.json({ paper });
  } catch (err) {
    if (err instanceof GradingError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
