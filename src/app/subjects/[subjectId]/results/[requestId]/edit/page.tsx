import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { getGenerationForTeacher } from "@/lib/generation";
import { SiteHeader } from "@/components/SiteHeader";
import { EditExamForm } from "@/components/EditExamForm";

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ subjectId: string; requestId: string }>;
}) {
  const { subjectId, requestId } = await params;
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const generation = await getGenerationForTeacher(teacher.id, requestId);
  if (!generation) notFound();
  if (generation.status !== "done") redirect(`/subjects/${subjectId}/results/${requestId}`);

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/subjects/${subjectId}/results/${requestId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ArrowRight size={14} /> العودة لنتائج الامتحان
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-brand-900">تعديل الأسئلة وسلم التنقيط</h1>
        <p className="mb-6 text-sm text-brand-600">
          {generation.examTitle} — يمكنك تعديل نص الأسئلة والحلول ومعايير التصحيح ونقاطها. يجب أن يبقى مجموع نقاط
          الامتحان 20 بالضبط، ومجموع معايير كل سؤال مساويًا لنقاط ذلك السؤال. الجلسات والأوراق المصحَّحة سابقًا لن
          تتأثر بهذا التعديل.
        </p>
        <EditExamForm subjectId={subjectId} requestId={requestId} initialQuestions={generation.questions} />
      </main>
    </>
  );
}
