"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2, AlertTriangle, XCircle, ShieldOff } from "lucide-react";
import type { ExamReview } from "@/lib/types";

const SEVERITY_STYLES: Record<string, string> = {
  خطأ: "border-rose-200 bg-rose-50 text-rose-700",
  تحذير: "border-amber-200 bg-amber-50 text-amber-700",
};

export function ExamReviewPanel({ requestId, initialReview }: { requestId: string; initialReview: ExamReview }) {
  const [review, setReview] = useState(initialReview);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (review.status !== "not_reviewed" && review.status !== "reviewing") return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/generate/${requestId}/review`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.review) setReview(data.review);
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [review.status, requestId]);

  if (review.status === "not_configured") {
    return (
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 text-sm text-brand-600">
        <ShieldOff size={18} className="shrink-0" />
        <p>لم تتم المراجعة المستقلة عبر Gemini — مفتاح GEMINI_API_KEY غير مُعدّ على الخادم.</p>
      </div>
    );
  }

  if (review.status === "not_reviewed" || review.status === "reviewing") {
    return (
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 text-sm text-brand-600">
        <Loader2 size={18} className="shrink-0 animate-spin" />
        <p>جارية المراجعة المستقلة عبر Gemini...</p>
      </div>
    );
  }

  if (review.status === "failed") {
    return (
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        <XCircle size={18} className="shrink-0" />
        <p>فشلت المراجعة المستقلة عبر Gemini: {review.failureReason ?? "سبب غير معروف"}</p>
      </div>
    );
  }

  // status === "reviewed"
  return (
    <section className="mb-8 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-brand-800">
        <ShieldCheck size={18} className="text-emerald-600" /> مراجعة مستقلة عبر Gemini ({review.model})
      </h2>
      {review.issues.length === 0 ? (
        <p className="text-sm text-emerald-700">لم تُسجَّل أي ملاحظة من المراجعة المستقلة.</p>
      ) : (
        <ul className="space-y-2">
          {review.issues.map((issue, i) => (
            <li
              key={i}
              className={`rounded-xl border p-3 text-sm ${SEVERITY_STYLES[issue.severity] ?? "border-brand-200 bg-brand-50 text-brand-700"}`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs font-bold">
                <AlertTriangle size={14} />
                {issue.severity} — {issue.category.replace(/_/g, " ")}
              </div>
              <p className="mb-1">{issue.description}</p>
              <p className="text-xs opacity-80">الاقتراح: {issue.suggestion}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
