import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, XCircle, FileCheck } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { getGradingSession, getPapersForSession } from "@/lib/grading";
import { getGenerationForTeacher } from "@/lib/generation";
import { SiteHeader } from "@/components/SiteHeader";
import { UploadPaperForm } from "@/components/UploadPaperForm";

const STATUS_STYLES: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "بانتظار التصحيح", className: "border-brand-200 bg-brand-50 text-brand-700", icon: Clock },
  grading: { label: "جارٍ التصحيح...", className: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock },
  graded: { label: "مُصحَّحة (مسودة)", className: "border-amber-200 bg-amber-50 text-amber-700", icon: FileCheck },
  approved: { label: "معتمدة", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "فشل التصحيح", className: "border-rose-200 bg-rose-50 text-rose-700", icon: XCircle },
};

export default async function GradingSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const session = getGradingSession(sessionId, teacher.id);
  if (!session) notFound();

  const [papers, exam] = await Promise.all([
    getPapersForSession(sessionId, teacher.id),
    getGenerationForTeacher(teacher.id, session.examRequestId),
  ]);

  const totalPoints = exam?.questions.reduce((s, q) => s + q.points, 0) ?? 20;

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        {exam && (
          <Link
            href={`/subjects/${exam.subjectId}/results/${exam.id}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
          >
            <ArrowRight size={14} /> العودة إلى الامتحان
          </Link>
        )}
        <h1 className="mb-1 text-2xl font-bold text-brand-900">{session.title}</h1>
        <p className="mb-8 text-sm text-brand-600">{papers.length} ورقة — من أصل {totalPoints} نقطة</p>

        <section className="mb-8">
          <UploadPaperForm sessionId={sessionId} />
        </section>

        <section className="space-y-2">
          <h2 className="mb-3 font-bold text-brand-800">الأوراق ({papers.length})</h2>
          {papers.length === 0 ? (
            <p className="text-sm text-brand-500">لم تُضَف أي ورقة بعد.</p>
          ) : (
            papers.map((p) => {
              const status = STATUS_STYLES[p.status];
              const Icon = status.icon;
              const score = p.status === "approved" ? p.approvedTotal : p.draftTotal;
              return (
                <Link
                  key={p.id}
                  href={`/grading/${sessionId}/papers/${p.id}`}
                  className="flex items-center justify-between rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <span className="font-semibold text-brand-800">{p.studentName}</span>
                  <span className="flex items-center gap-3">
                    {score !== null && (
                      <span className="font-bold text-brand-900">
                        {score} / {totalPoints}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                      <Icon size={12} /> {status.label}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </section>
      </main>
    </>
  );
}
