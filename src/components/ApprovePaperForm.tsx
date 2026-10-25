"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ShieldOff,
  MessageSquareWarning,
  ImageUp,
  PencilLine,
} from "lucide-react";
import type { CriterionReviewStatus, GeneratedQuestion, StudentPaper } from "@/lib/types";

const CRITERION_STATUS_LABEL: Record<CriterionReviewStatus, { label: string; className: string }> = {
  agreed: { label: "متفق عليه بين النموذجين", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  disagreed: { label: "مختلف عليه بين النموذجين", className: "border-rose-200 bg-rose-50 text-rose-700" },
  unreadable: { label: "غير مقروء", className: "border-amber-200 bg-amber-50 text-amber-700" },
  missing_page: { label: "صفحة مفقودة", className: "border-amber-200 bg-amber-50 text-amber-700" },
  not_reviewed: { label: "لم تتم المراجعة", className: "border-brand-200 bg-brand-50 text-brand-600" },
};

const GEMINI_STATUS_LABEL: Record<StudentPaper["geminiReviewStatus"], { label: string; className: string }> = {
  not_configured: { label: "المراجعة المستقلة غير مفعّلة", className: "text-brand-500" },
  not_reviewed: { label: "بانتظار المراجعة المستقلة", className: "text-brand-500" },
  reviewing: { label: "جارية المراجعة المستقلة...", className: "text-amber-600" },
  reviewed: { label: "تمت المراجعة المستقلة", className: "text-emerald-600" },
  failed: { label: "فشلت المراجعة المستقلة", className: "text-rose-600" },
};

type OverrideState = Record<string, { value: string; reason: string }>; // key: `${questionId}:${criterionId}`

export function ApprovePaperForm({
  initialPaper,
  totalPoints,
  examQuestions,
}: {
  initialPaper: StudentPaper;
  totalPoints: number;
  // The exam's own questions, carrying the expected model solution — shown
  // side by side with the student's transcribed answer so the teacher never
  // has to leave this screen to check what the "correct" answer was.
  examQuestions: GeneratedQuestion[];
}) {
  const router = useRouter();
  const [paper, setPaper] = useState(initialPaper);
  const [overrides, setOverrides] = useState<OverrideState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [correctingQuestionId, setCorrectingQuestionId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isInFlight = paper.status === "pending" || paper.status === "grading";

  useEffect(() => {
    if (!isInFlight) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/grading/papers/${paper.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.paper) setPaper(data.paper);
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isInFlight, paper.id]);

  async function retry() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/grading/papers/${paper.id}/retry`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setPaper(data.paper);
  }

  async function submitImageReplacement() {
    if (!imageFiles || imageFiles.length === 0) {
      setError("اختر صورة واحدة على الأقل");
      return;
    }
    setLoading(true);
    setError(null);
    const form = new FormData();
    for (const file of Array.from(imageFiles)) form.append("files", file);
    const res = await fetch(`/api/grading/papers/${paper.id}/images`, { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setImageFiles(null);
    setPaper(data.paper);
  }

  async function submitTranscriptionCorrection(questionId: string) {
    if (!correctionText.trim()) {
      setError("اكتب النص المصحَّح أولًا");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/grading/papers/${paper.id}/correct-transcription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, text: correctionText.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setCorrectingQuestionId(null);
    setCorrectionText("");
    setPaper(data.paper);
  }

  function setOverride(questionId: string, criterionId: string, field: "value" | "reason", val: string) {
    const key = `${questionId}:${criterionId}`;
    setOverrides((prev) => ({ ...prev, [key]: { value: prev[key]?.value ?? "", reason: prev[key]?.reason ?? "", [field]: val } }));
  }

  async function approve() {
    setError(null);
    const body: { overrides: { questionId: string; criterionId: string; newPoints: number; reason: string }[] } = {
      overrides: [],
    };

    for (const [key, { value, reason }] of Object.entries(overrides)) {
      if (value.trim() === "") continue;
      const [questionId, criterionId] = key.split(":");
      const newPoints = Number(value);
      if (!Number.isFinite(newPoints)) {
        setError("قيمة نقطة غير صالحة في أحد التعديلات");
        return;
      }
      if (!reason.trim()) {
        setError("يجب كتابة سبب لكل تعديل على النقطة");
        return;
      }
      body.overrides.push({ questionId, criterionId, newPoints, reason: reason.trim() });
    }

    // Block client-side too (server re-checks regardless): every criterion
    // without a final value must be covered by an override above.
    const overriddenKeys = new Set(body.overrides.map((o) => `${o.questionId}:${o.criterionId}`));
    const stillPending = paper.questionResults.some((q) =>
      q.criteriaResults.some((c) => c.finalAwardedPoints === null && !overriddenKeys.has(`${q.questionId}:${c.criterionId}`)),
    );
    if (stillPending) {
      setError("توجد معايير بلا نقطة نهائية — حدد نقطة وسببًا لكل معيار غير محسوم قبل الاعتماد");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/grading/papers/${paper.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setPaper(data.paper);
    router.refresh();
  }

  if (paper.status === "failed") {
    return (
      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        <p className="mb-3 font-semibold">فشل تصحيح هذه الورقة: {paper.failureReason}</p>
        <button
          onClick={retry}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          <RefreshCw size={16} /> {loading ? "جارٍ إعادة المحاولة..." : "إعادة المحاولة"}
        </button>
        <div className="mt-4 border-t border-rose-200 pt-4">
          <p className="mb-2 text-xs">إن كان السبب صورة سيئة أو صفحة خاطئة، يمكنك استبدال صور الورقة بدل إعادة المحاولة بنفس الصور:</p>
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => setImageFiles(e.target.files)}
            className="mb-2 block w-full text-xs"
          />
          <button
            onClick={submitImageReplacement}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            <ImageUp size={14} /> استبدال الصور وإعادة التصحيح
          </button>
        </div>
        {error && <p className="mt-3 text-rose-700">{error}</p>}
      </div>
    );
  }

  if (isInFlight) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
        <Loader2 size={20} className="shrink-0 animate-spin" /> الورقة قيد التصحيح الآن (يشمل المراجعة المستقلة إن كانت مفعّلة)...
      </div>
    );
  }

  const geminiStatus = GEMINI_STATUS_LABEL[paper.geminiReviewStatus];
  const solutionByQuestionId = new Map(examQuestions.map((q) => [q.id, q]));

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {paper.imagePaths.length > 0 ? (
        <div className="order-2 space-y-3 lg:order-1 lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs font-semibold text-brand-600">ورقة إجابة التلميذ ({paper.imagePaths.length} صفحة)</p>
          {paper.imagePaths.map((_, i) => (
            <a key={i} href={`/api/grading/images/${paper.id}/${i}`} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element -- served from our own API route, not a static asset Next can optimize */}
              <img
                src={`/api/grading/images/${paper.id}/${i}`}
                alt={`صفحة ${i + 1} من ورقة ${paper.studentName}`}
                className="w-full rounded-xl border border-brand-200 shadow-sm"
              />
            </a>
          ))}
          <p className="text-[11px] text-brand-400">اضغط على أي صورة لفتحها بحجمها الكامل في تبويب جديد.</p>
        </div>
      ) : (
        <div className="order-2 lg:order-1 rounded-xl border border-brand-100 bg-brand-50/40 p-3 text-xs text-brand-500 lg:sticky lg:top-4 lg:self-start">
          صور هذه الورقة لم تعد متوفرة (حُذفت ضمن سياسة الاحتفاظ بالبيانات بعد الاعتماد) — التصحيح المحفوظ يبقى كما هو.
        </div>
      )}

      <div className="order-1 space-y-4 lg:order-2">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
        <span className="flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-brand-600">
          Claude: {paper.claudeModel ?? "—"}
        </span>
        <span className={`flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 ${geminiStatus.className}`}>
          {paper.geminiReviewStatus === "reviewed" ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
          {geminiStatus.label}
          {paper.geminiModel ? ` (${paper.geminiModel})` : ""}
        </span>
        {paper.geminiReviewStatus === "failed" && (
          <button
            onClick={retry}
            disabled={loading}
            className="flex items-center gap-1 rounded-full border border-rose-300 px-2.5 py-1 text-rose-700 hover:bg-rose-50"
          >
            <RefreshCw size={13} /> إعادة محاولة المراجعة
          </button>
        )}
      </div>

      {paper.status !== "approved" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <p className="mb-2 font-semibold">صورة الإجابة غير واضحة أو خاطئة؟</p>
          <p className="mb-2">يمكنك استبدال صور الورقة كاملة وإعادة التصحيح تلقائيًا، بدل اعتماد نقطة غير دقيقة:</p>
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => setImageFiles(e.target.files)}
            className="mb-2 block w-full"
          />
          <button
            onClick={submitImageReplacement}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
          >
            <ImageUp size={14} /> استبدال الصور وإعادة التصحيح
          </button>
        </div>
      )}

      {paper.questionResults.map((q, i) => (
        <div key={q.questionId} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-brand-800">
              السؤال {i + 1} — {q.topic}
            </span>
            <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-800">
              {q.awardedPoints ?? "—"} / {q.maxPoints}
            </span>
          </div>

          {q.suspiciousNote && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              <MessageSquareWarning size={14} className="mt-0.5 shrink-0" />
              <p>تنبيه: رُصد نص في الورقة يبدو موجَّهًا للمصحح الآلي بدل إجابة السؤال — لم يُنفَّذ، ويحتاج مراجعتك: &quot;{q.suspiciousNote}&quot;</p>
            </div>
          )}

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-brand-100 bg-brand-50/30 p-2">
              <p className="mb-1 text-xs font-semibold text-brand-600">ما كُتب في الورقة (حسب القراءة الآلية)</p>
              <p className="whitespace-pre-wrap text-sm text-brand-800">{q.claudeTranscription || "—"}</p>
              {paper.geminiReviewStatus === "reviewed" && q.geminiTranscription && q.geminiTranscription !== q.claudeTranscription && (
                <p className="mt-2 whitespace-pre-wrap border-t border-brand-100 pt-2 text-xs text-brand-600">
                  <span className="font-semibold">قراءة Gemini (مختلفة): </span>
                  {q.geminiTranscription}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-2">
              <p className="mb-1 text-xs font-semibold text-emerald-700">الحل النموذجي المتوقع</p>
              <p className="whitespace-pre-wrap text-sm text-emerald-900">
                {solutionByQuestionId.get(q.questionId)?.solution || "غير متوفر"}
              </p>
            </div>
          </div>

          {paper.status !== "approved" &&
            (correctingQuestionId === q.questionId ? (
              <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50/40 p-2">
                <p className="mb-1 text-xs text-brand-600">
                  اكتب ما كتبه التلميذ فعلًا لهذا السؤال — سيُعتمد هذا النص بدل قراءة النماذج من الصورة، وتُعاد عملية التصحيح تلقائيًا:
                </p>
                <textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  rows={3}
                  className="mb-2 block w-full rounded border border-brand-200 p-2 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitTranscriptionCorrection(q.questionId)}
                    disabled={loading}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    حفظ النص وإعادة التصحيح
                  </button>
                  <button
                    onClick={() => {
                      setCorrectingQuestionId(null);
                      setCorrectionText("");
                    }}
                    className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs text-brand-600 hover:bg-brand-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCorrectingQuestionId(q.questionId);
                  setCorrectionText(q.claudeTranscription);
                }}
                className="mb-3 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
              >
                <PencilLine size={12} /> النص المستخرج غير صحيح؟ صحّحه هنا
              </button>
            ))}

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-100 text-brand-500">
                <th className="py-1.5 text-right font-semibold">المعيار</th>
                <th className="py-1.5 text-center font-semibold">Claude</th>
                <th className="py-1.5 text-center font-semibold">Gemini</th>
                <th className="py-1.5 text-center font-semibold">الحالة</th>
                <th className="py-1.5 text-center font-semibold">النقطة النهائية</th>
              </tr>
            </thead>
            <tbody>
              {q.criteriaResults.map((c) => {
                const statusInfo = CRITERION_STATUS_LABEL[c.status];
                const key = `${q.questionId}:${c.criterionId}`;
                const override = overrides[key];
                const isPending = c.finalAwardedPoints === null;
                return (
                  <tr key={c.criterionId} className="border-b border-brand-50 align-top">
                    <td className="py-2 pl-2 text-brand-800">
                      {c.criterion}
                      <span className="block text-brand-400">({c.maxPoints} ن)</span>
                    </td>
                    <td className="py-2 text-center text-brand-700" title={c.claudeNote}>
                      {c.claudeAwardedPoints ?? "—"}
                    </td>
                    <td className="py-2 text-center text-brand-700" title={c.geminiNote}>
                      {paper.geminiReviewStatus === "reviewed" ? (c.geminiAwardedPoints ?? "—") : "—"}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-2">
                      {paper.status === "approved" ? (
                        <span className="block text-center font-bold text-brand-900">{c.finalAwardedPoints}</span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={c.maxPoints}
                            step={0.01}
                            placeholder={isPending ? "مطلوب" : String(c.finalAwardedPoints)}
                            value={override?.value ?? ""}
                            onChange={(e) => setOverride(q.questionId, c.criterionId, "value", e.target.value)}
                            className={`w-16 rounded border px-1.5 py-1 text-center ${isPending ? "border-rose-300" : "border-brand-200"}`}
                          />
                          <input
                            type="text"
                            placeholder="سبب التعديل"
                            value={override?.reason ?? ""}
                            onChange={(e) => setOverride(q.questionId, c.criterionId, "reason", e.target.value)}
                            className="w-28 rounded border border-brand-200 px-1.5 py-1 text-[10px]"
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-3 text-xs italic text-brand-500">{q.claudeFeedback}</p>
        </div>
      ))}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {paper.status === "approved" ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={18} /> تم اعتماد هذه الورقة — المجموع النهائي: {paper.approvedTotal} / {totalPoints}
        </div>
      ) : (
        <button
          onClick={approve}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          <CheckCircle2 size={16} /> {loading ? "جارٍ الاعتماد..." : "اعتماد النتيجة النهائية"}
        </button>
      )}

      {paper.overrideHistory.length > 0 && (
        <details className="rounded-2xl border border-brand-100 bg-white p-4 text-xs text-brand-600">
          <summary className="cursor-pointer font-semibold text-brand-700">سجل تعديلات الأستاذ ({paper.overrideHistory.length})</summary>
          <ul className="mt-2 space-y-1">
            {paper.overrideHistory.map((h, i) => (
              <li key={i} className="flex items-center gap-2">
                <AlertTriangle size={12} className="shrink-0" />
                {h.criterionId}: {h.previousPoints ?? "—"} ← {h.newPoints} ({h.reason}) — {new Date(h.changedAt).toLocaleString("ar")}
              </li>
            ))}
          </ul>
        </details>
      )}
      </div>
    </div>
  );
}
