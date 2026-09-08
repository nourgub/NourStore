import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, FileText, History, Search, PenLine, CheckSquare, Grid3x3, ShieldCheck } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { listDocumentsForTeacher } from "@/lib/documents";
import { listGenerationsForTeacher } from "@/lib/generation";
import { UploadDocumentForm } from "@/components/UploadDocumentForm";
import { GenerateExamForm } from "@/components/GenerateExamForm";
import { SiteHeader } from "@/components/SiteHeader";
import type { SubjectId } from "@/lib/types";

const SUBJECT_NAMES: Record<string, string> = { math: "الرياضيات" };

const PIPELINE = [
  { label: "محلّل المنهج", icon: Search },
  { label: "واضع الأسئلة", icon: PenLine },
  { label: "معدّ الحلول", icon: CheckSquare },
  { label: "شبكة التنقيط", icon: Grid3x3 },
  { label: "المراجع", icon: ShieldCheck },
];

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
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowRight size={14} /> العودة إلى المواد
        </Link>
        <h1 className="mb-3 text-2xl font-bold text-brand-900">فريق وكلاء {SUBJECT_NAMES[subjectId]}</h1>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          {PIPELINE.map((p, i) => {
            const Icon = p.icon;
            return (
              <span key={p.label} className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700">
                  <Icon size={13} /> {p.label}
                </span>
                {i < PIPELINE.length - 1 && <span className="text-brand-300">←</span>}
              </span>
            );
          })}
        </div>

        <section className="mb-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-brand-800">
            <FileText size={18} className="text-brand-500" /> وثائق المنهج المرفوعة ({documents.length})
          </h2>
          {documents.length > 0 && (
            <ul className="space-y-2">
              {documents.map((d) => (
                <li key={d.id} className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-brand-800">{d.fileName}</span>
                    {d.extractionStatus === "extracted" && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        تم استخراج محتوى الملف ({d.extractedText.length.toLocaleString("ar")} حرفًا)
                      </span>
                    )}
                    {d.extractionStatus === "unsupported" && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        نوع ملف غير مدعوم للاستخراج
                      </span>
                    )}
                    {d.extractionStatus === "failed" && (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        تعذّر استخراج المحتوى
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-brand-700">
                    {d.gradeLevel} — المحاور: {d.topics.join("، ")}
                  </div>
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
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-brand-800">
            <History size={18} className="text-brand-500" /> الامتحانات السابقة ({generations.length})
          </h2>
          {generations.length === 0 ? (
            <p className="text-sm text-brand-500">لم يتم توليد أي امتحان بعد.</p>
          ) : (
            <ul className="space-y-2">
              {generations.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/subjects/${subjectId}/results/${g.id}`}
                    className="block rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-brand-300 hover:shadow-md"
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
    </>
  );
}
