import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { getGenerationForTeacher } from "@/lib/generation";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ subjectId: string; requestId: string }>;
}) {
  const { subjectId, requestId } = await params;
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const generation = await getGenerationForTeacher(teacher.id, requestId);
  if (!generation) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href={`/subjects/${subjectId}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← العودة إلى المادة
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">{generation.examTitle}</h1>
      <p className="mb-8 text-sm text-brand-600">
        {generation.gradeLevel} — {generation.questions.length} أسئلة — {generation.difficultyMix}
      </p>

      <section className="mb-8 rounded-2xl border border-brand-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-brand-800">سجل عمل فريق الوكلاء</h2>
        <ol className="space-y-3">
          {generation.steps.map((s, i) => (
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

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <a
          href={`/api/download/${generation.id}/exam`}
          className="rounded-xl border border-brand-300 bg-white px-4 py-3 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          📄 تنزيل ملف الامتحان (Word)
        </a>
        <a
          href={`/api/download/${generation.id}/solution`}
          className="rounded-xl border border-brand-300 bg-white px-4 py-3 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          ✅ تنزيل الحل النموذجي (Word)
        </a>
        <a
          href={`/api/download/${generation.id}/rubric`}
          className="rounded-xl border border-brand-300 bg-white px-4 py-3 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          📊 تنزيل شبكة التنقيط (Word)
        </a>
      </section>

      <section className="space-y-4">
        <h2 className="font-bold text-brand-800">معاينة الأسئلة</h2>
        {generation.questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-brand-100 bg-white p-5">
            <p className="mb-1 text-xs font-semibold text-brand-500">
              السؤال {i + 1} — {q.topic} — {q.difficulty} — {q.points} ن
            </p>
            <p className="mb-3 whitespace-pre-wrap text-sm text-brand-900">{q.prompt}</p>
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-brand-600">عرض الحل ومعايير التصحيح</summary>
              <p className="mt-2 whitespace-pre-wrap text-brand-700">{q.solution}</p>
              <ul className="mt-2 list-inside list-disc text-brand-700">
                {q.rubric.map((r, idx) => (
                  <li key={idx}>
                    {r.criterion} — {r.points} ن
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </section>
    </main>
  );
}
