import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, FileDown } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { getLessonPrep } from "@/lib/lessonPrep";
import { SiteHeader } from "@/components/SiteHeader";

export default async function LessonPrepDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string; id: string }>;
}) {
  const { subjectId, id } = await params;
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const lessonPrep = getLessonPrep(id, teacher.id);
  if (!lessonPrep) notFound();

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/subjects/${subjectId}/lesson-prep`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ArrowRight size={14} /> العودة إلى تحضير الدرس
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-brand-900">{lessonPrep.lessonTitle}</h1>
        <p className="mb-8 text-sm text-brand-600">
          {lessonPrep.gradeLevel}
          {lessonPrep.sourceFileNames.length > 0 && ` — بالاستناد إلى: ${lessonPrep.sourceFileNames.join("، ")}`}
        </p>

        {lessonPrep.status === "failed" && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            فشل تحضير هذا الدرس: {lessonPrep.failureReason}
          </div>
        )}

        {lessonPrep.status === "done" && (
          <>
            {lessonPrep.steps.length > 0 && (
              <section className="mb-8 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 font-bold text-brand-800">سجل عمل فريق الوكلاء</h2>
                <ol className="space-y-3">
                  {lessonPrep.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-brand-800">
                          {s.agent} — {s.label}
                        </p>
                        {s.detail && <p className="text-brand-600">{s.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="mb-8">
              <a
                href={`/api/download/lesson-prep/${lessonPrep.id}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-brand-300 bg-white px-4 py-4 text-center text-sm font-semibold text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-md"
              >
                <FileDown size={20} /> تنزيل تحضير الدرس (Word)
              </a>
            </section>

            {lessonPrep.tableColumns.length > 0 ? (
              <section className="space-y-4">
                <h2 className="font-bold text-brand-800">معاينة التحضير (بشكل نموذجك الخاص)</h2>
                {(lessonPrep.headerValues.length > 0 || lessonPrep.noteValues.length > 0) && (
                  <div className="space-y-2 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                    {[...lessonPrep.headerValues, ...lessonPrep.noteValues].map((f, i) => (
                      <p key={i} className="text-sm text-brand-700">
                        <span className="font-semibold text-brand-800">{f.label}: </span>
                        {f.value || "—"}
                      </p>
                    ))}
                  </div>
                )}
                <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white shadow-sm">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-brand-200 bg-brand-50">
                        {lessonPrep.tableColumns.map((col, i) => (
                          <th key={i} className="px-4 py-2 font-bold text-brand-800">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lessonPrep.tableRows.map((row, i) => (
                        <tr key={i} className="border-b border-brand-100 last:border-0">
                          {row.cells.map((cell, j) => (
                            <td key={j} className="whitespace-pre-wrap px-4 py-3 align-top text-brand-700">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className="space-y-4">
                <h2 className="font-bold text-brand-800">معاينة التحضير</h2>
                {lessonPrep.sections.map((s, i) => (
                  <div key={i} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-2 font-bold text-brand-800">{s.heading}</h3>
                    <p className="whitespace-pre-wrap text-sm text-brand-700">{s.body}</p>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
