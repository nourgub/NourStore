import { CheckCircle2, XCircle, ListChecks } from "lucide-react";
import type { StructuralReview } from "@/lib/examStructuralReview";

// Purely a display of a deterministic, code-computed result — never an AI
// call, so there is no "not reviewed yet" state to poll for, unlike
// ExamReviewPanel (Gemini's independent pedagogical review, shown
// separately). Mixing the two into one panel would blur an important
// distinction the teacher needs: this panel says the arithmetic and
// structure are sound; it says nothing about whether the questions or
// solutions are pedagogically correct.
export function StructuralReviewPanel({ review }: { review: StructuralReview }) {
  return (
    <section className="mb-8 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-brand-800">
        <ListChecks size={18} className="text-brand-500" /> الفحص الهيكلي والحسابي الآلي
      </h2>
      <p className="mb-3 text-xs text-brand-500">
        فحص حسابي مباشر من الكود (عدد الأسئلة، مجموع النقاط، سلامة المعرّفات) — لا علاقة له بصحة محتوى الأسئلة أو
        الحلول نفسها؛ ذلك شأن مراجعتك أنت ومراجعة Gemini المستقلة أدناه.
      </p>
      <ul className="space-y-1.5 text-sm">
        {review.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            {c.passed ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
            )}
            <span className={c.passed ? "text-brand-800" : "text-rose-700"}>
              {c.label}
              <span className="block text-xs text-brand-500">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-semibold text-brand-600">مجموع نقاط الامتحان: {review.totalPoints}</p>
    </section>
  );
}
