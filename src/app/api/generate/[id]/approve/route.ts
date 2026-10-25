import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { approveGeneration, GenerationError } from "@/lib/generation";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  try {
    const generation = await approveGeneration(teacher.id, id);
    return NextResponse.json({ generation });
  } catch (err) {
    if (err instanceof GenerationError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
