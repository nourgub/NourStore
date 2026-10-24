import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacher } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { PLANS } from "@/lib/plans";
import { countPapersNeedingReviewForTeacher } from "@/lib/db";
import { askTeacherAssistant, TeacherAssistantError } from "@/lib/agents/teacherAssistantAgent";

export async function POST(request: NextRequest) {
  const teacher = await getCurrentTeacher();
  if (!teacher) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message : "";

  // Only this teacher's own, already-fetched data ever enters the prompt —
  // the agent has no tool or query access of its own to reach anyone else's.
  const planLabel = teacher.planId ? PLANS[teacher.planId].displayName : "لا توجد باقة مفعّلة بعد";
  const usage = getUsageSummary(teacher)
    .filter((u) => u.enabled)
    .map((u) => `${u.label}: ${u.used}/${u.limit} هذا الشهر`)
    .join("، ");
  const needsReview = countPapersNeedingReviewForTeacher(teacher.id);

  const context = `الاسم: ${teacher.fullName}
حالة الاشتراك: ${teacher.subscriptionStatus} — الباقة: ${planLabel}
الاستخدام الشهري: ${usage || "لا توجد ميزات مفعّلة بعد"}
عدد أوراق التصحيح التي تحتاج مراجعتك الآن: ${needsReview}`;

  try {
    const reply = await askTeacherAssistant(message, context);
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof TeacherAssistantError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
