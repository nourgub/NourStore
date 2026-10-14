import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, History, XCircle } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { listLessonPrepsForTeacher } from "@/lib/lessonPrep";
import { SiteHeader } from "@/components/SiteHeader";
import { LessonPrepForm } from "@/components/LessonPrepForm";
import { SUBJECTS } from "@/lib/agents/subjects";
import type { SubjectId } from "@/lib/types";

export default async function LessonPrepListPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  if (!(subjectId in SUBJECTS)) notFound();

  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (teacher.subscriptionStatus !== "active") redirect("/billing");

  const lessonPreps = listLessonPrepsForTeacher(teacher.id, subjectId as SubjectId);

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/subjects/${subjectId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ArrowRight size={14} /> العودة إلى المادة
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-brand-900">تحضير الدرس — {SUBJECTS[subjectId as SubjectId].displayName}</h1>

        <section className="mb-10">
          <LessonPrepForm subjectId={subjectId as SubjectId} />
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-brand-800">
            <History size={18} className="text-brand-500" /> تحضيرات سابقة ({lessonPreps.length})
          </h2>
          {lessonPreps.length === 0 ? (
            <p className="text-sm text-brand-500">لم يتم تحضير أي درس بعد.</p>
          ) : (
            <ul className="space-y-2">
              {lessonPreps.map((lp) => (
                <li key={lp.id}>
                  <Link
                    href={`/subjects/${subjectId}/lesson-prep/${lp.id}`}
                    className="flex items-center justify-between rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-brand-300 hover:shadow-md"
                  >
                    <span>
                      <span className="font-semibold text-brand-800">{lp.lessonTitle}</span>{" "}
                      <span className="text-brand-500">— {lp.gradeLevel} — {new Date(lp.createdAt).toLocaleString("ar")}</span>
                    </span>
                    {lp.status === "failed" && (
                      <span className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        <XCircle size={12} /> فشل
                      </span>
                    )}
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
