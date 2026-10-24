import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { createGeneration, GenerationError } from "@/lib/generation";
import { assertFeatureAllowed, recordUsage, UsageLimitError } from "@/lib/usage";
import type { SubjectId } from "@/lib/types";

export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    assertFeatureAllowed(teacher, "exams");
  } catch (err) {
    if (err instanceof UsageLimitError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const pageExercises = Array.isArray(body.pageExercises)
    ? body.pageExercises
        .filter(
          (e: unknown): e is { pageNumber: unknown; promptText: unknown } =>
            typeof e === "object" && e !== null,
        )
        .map((e: { pageNumber: unknown; promptText: unknown }) => ({
          pageNumber: Number(e.pageNumber) || 0,
          promptText: typeof e.promptText === "string" ? e.promptText : "",
        }))
        .filter((e: { pageNumber: number; promptText: string }) => e.promptText.trim().length > 0)
    : undefined;

  try {
    const request_ = await createGeneration({
      teacherId: teacher.id,
      subjectId: (body.subjectId as SubjectId) || "math",
      documentId: body.documentId || null,
      examTitle: String(body.examTitle ?? ""),
      gradeLevel: String(body.gradeLevel ?? ""),
      topics: Array.isArray(body.topics) ? body.topics.filter((t: unknown) => typeof t === "string") : [],
      numQuestions: Number(body.numQuestions) || 6,
      difficultyMix: body.difficultyMix === "سهل" || body.difficultyMix === "صعب" ? body.difficultyMix : "متوازن",
      pageExercises,
    });
    recordUsage(teacher, "exams");
    return NextResponse.json({ request: request_ });
  } catch (err) {
    if (err instanceof GenerationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
