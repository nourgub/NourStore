import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { getStudentPaper, getGradingSession } from "@/lib/grading";
import { getGenerationForTeacher } from "@/lib/generation";
import { SiteHeader } from "@/components/SiteHeader";
import { ApprovePaperForm } from "@/components/ApprovePaperForm";

export default async function StudentPaperPage({
  params,
}: {
  params: Promise<{ sessionId: string; paperId: string }>;
}) {
  const { sessionId, paperId } = await params;
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const paper = getStudentPaper(paperId, teacher.id);
  if (!paper) notFound();

  const session = getGradingSession(sessionId, teacher.id);
  const exam = session ? await getGenerationForTeacher(teacher.id, session.examRequestId) : null;
  const totalPoints = exam?.questions.reduce((s, q) => s + q.points, 0) ?? 20;

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/grading/${sessionId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ArrowRight size={14} /> العودة إلى جلسة التصحيح
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-brand-900">{paper.studentName}</h1>

        {paper.status === "failed" && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            فشل تصحيح هذه الورقة: {paper.failureReason}
          </div>
        )}

        {paper.status === "grading" && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            الورقة قيد التصحيح الآن...
          </div>
        )}

        {(paper.status === "graded" || paper.status === "approved") && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <section className="space-y-3 sm:col-span-1">
                {paper.questionResults.map((qr, i) => (
                  <div key={qr.questionId} className="rounded-2xl border border-brand-100 bg-white p-4 text-sm shadow-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold text-brand-800">
                        السؤال {i + 1} — {qr.topic}
                      </span>
                      <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-800">
                        {qr.awardedPoints} / {qr.maxPoints}
                      </span>
                    </div>
                    <p className="mb-2 whitespace-pre-wrap text-brand-700">
                      <span className="font-semibold text-brand-600">نقل الإجابة: </span>
                      {qr.transcription}
                    </p>
                    <ul className="mb-2 space-y-1 text-xs text-brand-600">
                      {qr.criteriaResults.map((c, j) => (
                        <li key={j} className="flex justify-between gap-2">
                          <span>{c.criterion}</span>
                          <span className="shrink-0 font-semibold">
                            {c.awardedPoints} / {c.maxPoints}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs italic text-brand-500">{qr.feedback}</p>
                  </div>
                ))}
              </section>

              <section className="sm:col-span-1">
                <ApprovePaperForm
                  paperId={paper.id}
                  defaultTotal={paper.approvedTotal ?? paper.draftTotal ?? 0}
                  totalPoints={totalPoints}
                  alreadyApproved={paper.status === "approved"}
                />
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}
