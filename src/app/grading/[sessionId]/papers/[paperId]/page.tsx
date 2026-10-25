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
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link
          href={`/grading/${sessionId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ArrowRight size={14} /> العودة إلى جلسة التصحيح
        </Link>
        <h1 className="mb-1 text-2xl font-bold text-brand-900">{paper.studentName}</h1>

        <ApprovePaperForm initialPaper={paper} totalPoints={totalPoints} examQuestions={exam?.questions ?? []} />
      </main>
    </>
  );
}
