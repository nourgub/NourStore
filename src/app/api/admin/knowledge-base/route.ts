import { NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import { getAllSources } from "@/lib/knowledgeBase/service";
import { countKbRows, listKbSourceDocuments, listKbExams, listKbExercises, listKbLessons } from "@/lib/db";

// Single overview endpoint for the admin KB panel — sources, their
// documents, classified content, and aggregate stats in one response. Kept
// as one call (rather than four small endpoints) since the panel always
// needs all of it together and the dataset is still small in this phase.
export async function GET() {
  const teacher = await getCurrentTeacher();
  if (!teacher || !isAdminTeacher(teacher)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  return NextResponse.json({
    stats: countKbRows(),
    sources: getAllSources(),
    documents: listKbSourceDocuments(),
    lessons: listKbLessons(),
    exercises: listKbExercises(),
    exams: listKbExams(),
  });
}
