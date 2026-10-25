import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, XCircle, FileCheck, AlertTriangle } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { getGradingSession, getPapersForSession, getClassAnalytics } from "@/lib/grading";
import { getGenerationForTeacher } from "@/lib/generation";
import { SiteHeader } from "@/components/SiteHeader";
import { UploadPaperForm } from "@/components/UploadPaperForm";
import { ClassAnalyticsPanel } from "@/components/ClassAnalyticsPanel";

const STATUS_STYLES: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "بانتظار التصحيح", className: "border-brand-200 bg-brand-50 text-brand-700", icon: Clock },
  grading: { label: "جارٍ التصحيح...", className: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock },
  graded: { label: "مُصحَّحة (مسودة)", className: "border-amber-200 bg-amber-50 text-amber-700", icon: FileCheck },
  needs_review: { label: "تحتاج مراجعة", className: "border-rose-200 bg-rose-50 text-rose-700", icon: AlertTriangle },
  approved: { label: "معتمدة", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "فشل التصحيح", className: "border-rose-200 bg-rose-50 text-rose-700", icon: XCircle },
};

export default async function GradingSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { sessionId } = await params;
  const { filter } = await searchParams;
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const session = getGradingSession(sessionId, teacher.id);
  if (!session) notFound();

  const [allPapers, exam] = await Promise.all([
    getPapersForSession(sessionId, teacher.id),
    getGenerationForTeacher(teacher.id, session.examRequestId),
  ]);

  const needsReviewCount = allPapers.filter((p) => p.needsReview).length;
  const papers = filter === "needs_review" ? allPapers.filter((p) => p.needsReview) : allPapers;

  const totalPoints = exam?.questions.reduce((s, q) => s + q.points, 0) ?? 20;
  const analytics = getClassAnalytics(sessionId, teacher.id);

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
        <p className="mb-8 text-sm text-brand-600">{allPapers.length} ورقة — من أصل {totalPoints} نقطة</p>

        <section className="mb-8">
          <UploadPaperForm sessionId={sessionId} />
        </section>

        {analytics && <ClassAnalyticsPanel sessionId={sessionId} analytics={analytics} />}

        <section className="space-y-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-brand-800">الأوراق ({papers.length})</h2>
            <div className="flex gap-2 text-xs font-semibold">
              <Link
                href={`/grading/${sessionId}`}
                className={`rounded-full border px-3 py-1 ${!filter ? "border-brand-600 bg-brand-50 text-brand-700" : "border-brand-200 text-brand-500"}`}
              >
                الكل
              </Link>
              <Link
                href={`/grading/${sessionId}?filter=needs_review`}
                className={`rounded-full border px-3 py-1 ${filter === "needs_review" ? "border-rose-600 bg-rose-50 text-rose-700" : "border-brand-200 text-brand-500"}`}
              >
                تحتاج مراجعة ({needsReviewCount})
              </Link>
            </div>
          </div>
          {papers.length === 0 ? (
            <p className="text-sm text-brand-500">
              {filter === "needs_review" ? "لا توجد أوراق تحتاج مراجعة حاليًا." : "لم تُضَف أي ورقة بعد."}
            </p>
          ) : (
            papers.map((p) => {
              const statusKey = p.status === "graded" && p.needsReview ? "needs_review" : p.status;
              const status = STATUS_STYLES[statusKey];
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
