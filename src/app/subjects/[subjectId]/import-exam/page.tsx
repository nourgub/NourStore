import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { hasFreeTrialAvailable } from "@/lib/usage";
import { SiteHeader } from "@/components/SiteHeader";
import { ImportExamForm } from "@/components/ImportExamForm";
import { SUBJECTS } from "@/lib/agents/subjects";
import type { SubjectId } from "@/lib/types";

export default async function ImportExamPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  if (!(subjectId in SUBJECTS)) notFound();

  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (teacher.subscriptionStatus !== "active" && !hasFreeTrialAvailable(teacher)) redirect("/billing");

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href={`/subjects/${subjectId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ArrowRight size={14} /> العودة إلى المادة
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-brand-900">استيراد امتحان جاهز</h1>
        <p className="mb-6 text-sm text-brand-600">
          استعمل هذه المنصة للتصحيح فقط — بدون الحاجة لتوليد الامتحان عبر الذكاء الاصطناعي.
        </p>
        <ImportExamForm subjectId={subjectId as SubjectId} />
      </main>
    </>
  );
}
