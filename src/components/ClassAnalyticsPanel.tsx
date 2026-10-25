import { BarChart3, Download, Info } from "lucide-react";
import type { ClassAnalytics } from "@/lib/classAnalytics";

// Server-rendered, no client state — the analytics are recomputed fresh on
// every page load straight from approved papers, so there is nothing to
// poll. Always labeled clearly as drawn from APPROVED results only, and
// withheld entirely (sufficientData === false) until there are enough
// approved papers to say anything meaningful — never a class average or a
// "weak skill" claim built from one or two students.
export function ClassAnalyticsPanel({ sessionId, analytics }: { sessionId: string; analytics: ClassAnalytics }) {
  return (
    <section className="mb-8 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-brand-800">
          <BarChart3 size={18} className="text-brand-500" /> نتائج القسم (الأوراق المعتمدة فقط)
        </h2>
        <a
          href={`/api/grading/sessions/${sessionId}/export`}
          className="flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          <Download size={14} /> تصدير CSV (كل الأوراق)
        </a>
      </div>

      {!analytics.sufficientData ? (
        <div className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-xs text-brand-600">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            تحتاج {analytics.minPapersRequired} أوراق معتمدة على الأقل لعرض نتائج القسم (المعتمدة حاليًا:{" "}
            {analytics.approvedPapers}) — هذا لتفادي استنتاج نتيجة من عدد غير كافٍ من التلاميذ.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-500">المعدل</p>
              <p className="font-bold text-brand-900">
                {analytics.average} / {analytics.totalPoints}
              </p>
            </div>
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-500">الأدنى</p>
              <p className="font-bold text-brand-900">{analytics.min}</p>
            </div>
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-brand-500">الأعلى</p>
              <p className="font-bold text-brand-900">{analytics.max}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-brand-600">توزيع النتائج</p>
            <div className="space-y-1">
              {analytics.distribution.map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-brand-500">{b.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{
                        width: `${analytics.approvedPapers > 0 ? (b.count / analytics.approvedPapers) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-brand-700">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold text-brand-600">متوسط النجاح لكل سؤال</p>
            <ul className="space-y-1 text-xs text-brand-700">
              {analytics.perQuestion.map((q, i) => (
                <li key={q.questionId} className="flex justify-between">
                  <span>
                    السؤال {i + 1} — {q.topic}
                  </span>
                  <span className="font-semibold">
                    {q.averageAwardedPoints} / {q.maxPoints} ({q.averagePercent}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {analytics.weakestCriteria.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-rose-600">مهارات تحتاج دعمًا (أقل معايير نجاحًا)</p>
              <ul className="space-y-1 text-xs text-rose-700">
                {analytics.weakestCriteria.map((c) => (
                  <li key={`${c.questionId}:${c.criterionId}`} className="flex justify-between">
                    <span>{c.criterion}</span>
                    <span className="font-semibold">{c.averagePercent}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
