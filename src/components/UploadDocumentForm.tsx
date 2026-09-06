"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SubjectId } from "@/lib/types";

export function UploadDocumentForm({ subjectId }: { subjectId: SubjectId }) {
  const router = useRouter();
  const [gradeLevel, setGradeLevel] = useState("");
  const [topics, setTopics] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData();
    form.set("subjectId", subjectId);
    form.set("gradeLevel", gradeLevel);
    form.set("topics", topics);
    form.set("styleNotes", styleNotes);
    if (file) form.set("file", file);

    const res = await fetch("/api/documents", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setGradeLevel("");
    setTopics("");
    setStyleNotes("");
    setFile(null);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
      >
        + رفع منهج / وثيقة جديدة
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-brand-200 bg-white p-5">
      <h3 className="font-bold text-brand-800">رفع منهج أو وثيقة أسلوب</h3>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">المستوى الدراسي</label>
        <input
          required
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          placeholder="مثال: السنة الثانية ثانوي — شعبة علوم تجريبية"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">المحاور (مفصولة بفاصلة)</label>
        <input
          required
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder="مثال: المعادلات الخطية، الدوال، الهندسة"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">ملاحظات حول أسلوبك في وضع الأسئلة (اختياري)</label>
        <textarea
          value={styleNotes}
          onChange={(e) => setStyleNotes(e.target.value)}
          rows={3}
          placeholder="مثال: أفضّل أسئلة تطبيقية من الحياة اليومية، وصياغة قصيرة ومباشرة"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">ملف المنهج (اختياري — PDF أو Word)</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-brand-700"
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "جارٍ الحفظ..." : "حفظ الوثيقة"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50">
          إلغاء
        </button>
      </div>
    </form>
  );
}
