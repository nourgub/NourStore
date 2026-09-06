import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { listDocumentsForTeacher } from "@/lib/documents";
import { listGenerationsForTeacher } from "@/lib/generation";
import { UploadDocumentForm } from "@/components/UploadDocumentForm";
import { GenerateExamForm } from "@/components/GenerateExamForm";
import type { SubjectId } from "@/lib/types";

const SUBJECT_NAMES: Record<string, string> = { math: "الرياضيات" };

export default async function SubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  if (subjectId !== "math") notFound();

  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const [documents, generations] = await Promise.all([
    listDocumentsForTeacher(teacher.id, subjectId as SubjectId),
    listGenerationsForTeacher(teacher.id, subjectId as SubjectId),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← العودة إلى المواد
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">فريق وكلاء {SUBJECT_NAMES[subjectId]}</h1>
      <p className="mb-8 text-sm text-brand-600">
        محلّل المنهج ← واضع الأسئلة ← معدّ الحلول ← مصمم شبكة التنقيط ← المراجع
      </p>

      <section className="mb-6 space-y-4">
        <h2 className="text-lg font-bold text-brand-800">وثائق المنهج المرفوعة ({documents.length})</h2>
        {documents.length > 0 && (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li key={d.id} className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm">
                <span className="font-semibold text-brand-800">{d.fileName}</span> — {d.gradeLevel} — المحاور:{" "}
                {d.topics.join("، ")}
              </li>
            ))}
          </ul>
        )}
        <UploadDocumentForm subjectId={subjectId as SubjectId} />
      </section>

      <section className="mb-10">
        <GenerateExamForm subjectId={subjectId as SubjectId} documents={documents} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-brand-800">الامتحانات السابقة ({generations.length})</h2>
        {generations.length === 0 ? (
          <p className="text-sm text-brand-500">لم يتم توليد أي امتحان بعد.</p>
        ) : (
          <ul className="space-y-2">
            {generations.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/subjects/${subjectId}/results/${g.id}`}
                  className="block rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm transition hover:border-brand-300"
                >
                  <span className="font-semibold text-brand-800">{g.examTitle}</span> — {g.gradeLevel} —{" "}
                  {g.questions.length} أسئلة —{" "}
                  <span className="text-brand-500">{new Date(g.createdAt).toLocaleString("ar")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
