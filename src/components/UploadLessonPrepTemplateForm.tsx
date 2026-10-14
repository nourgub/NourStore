"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, Trash2, UploadCloud } from "lucide-react";
import type { LessonPrepTemplate, SubjectId } from "@/lib/types";

export function UploadLessonPrepTemplateForm({
  subjectId,
  template,
}: {
  subjectId: SubjectId;
  template: LessonPrepTemplate | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("اختر ملف النموذج الفارغ أولاً");
      return;
    }
    setError(null);
    setLoading(true);
    const form = new FormData();
    form.set("subjectId", subjectId);
    form.set("file", file);

    const res = await fetch("/api/lesson-prep-template", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setFile(null);
    setOpen(false);
    router.refresh();
  }

  async function handleRemove() {
    if (!template) return;
    setLoading(true);
    await fetch(`/api/lesson-prep-template?id=${template.id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  if (template && !open) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
        <span className="flex items-center gap-2 text-emerald-800">
          <FileCheck2 size={18} className="shrink-0" />
          يُستخدم حاليًا نموذجك الخاص المرفوع: <span className="font-semibold">{template.fileName}</span> — كل تحضير جديد سيُبنى بنفس شكله.
        </span>
        <span className="flex shrink-0 gap-2">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            استبدال
          </button>
          <button
            onClick={handleRemove}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          >
            <Trash2 size={13} /> إزالة
          </button>
        </span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-4 py-4 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
      >
        + رفع نموذج التحضير الخاص بك (ورقة فارغة) ليُستخدم شكله في كل تحضير
      </button>
    );
  }

  return (
    <form onSubmit={handleUpload} className="space-y-3 rounded-2xl border border-brand-200 bg-white p-5">
      <h3 className="font-bold text-brand-800">رفع نموذج التحضير الخاص بك</h3>
      <p className="text-sm text-brand-600">
        ارفع صورة لورقة التحضير الفارغة التي تستخدمها (أو ملف PDF/Word)، وستحلّل المنصة شكلها وتبني كل تحضير لاحق بنفس
        الحقول والجدول بالضبط.
      </p>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-4 py-6 text-center transition hover:bg-brand-50">
        <UploadCloud size={24} className="text-brand-500" />
        <span className="font-semibold text-brand-800">{file ? file.name : "اضغط هنا لاختيار الملف"}</span>
        <span className="text-xs text-brand-500">صورة JPG/PNG (الأنسب)، أو PDF، أو Word (.docx)</span>
        <input
          type="file"
          accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "جارٍ تحليل النموذج..." : "حفظ النموذج"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50">
          إلغاء
        </button>
      </div>
    </form>
  );
}
