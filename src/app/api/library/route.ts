import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { listPublishedExams, listPublishedExercises, listPublishedLessons } from "@/lib/knowledgeBase/service";
import type { SubjectId } from "@/lib/types";

// Read-only, any logged-in teacher — published knowledge-base content is a
// shared platform resource, not scoped per-teacher (unlike almost every
// other route in this app). Never exposes anything other than
// status === "published" rows (enforced in the service-layer functions
// themselves, not just by this route's intent).
export async function GET(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const subjectId = (request.nextUrl.searchParams.get("subjectId") as SubjectId) || "math";
  const educationLevelId = request.nextUrl.searchParams.get("educationLevelId") || undefined;

  return NextResponse.json({
    lessons: listPublishedLessons(subjectId, educationLevelId),
    exercises: listPublishedExercises(subjectId, educationLevelId),
    exams: listPublishedExams(subjectId, educationLevelId),
  });
}
