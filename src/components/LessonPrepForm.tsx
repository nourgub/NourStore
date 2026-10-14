"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import type { LessonPrepMode, SubjectId } from "@/lib/types";

export function LessonPrepForm({ subjectId }: { subjectId: SubjectId }) {
  const router = useRouter();
  const [mode, setMode] = useState<LessonPrepMode>("generate");
  const [lessonTitle, setLessonTitle] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "merge" && files.length === 0) {
      setError("أرفق مذكرة واحدة على الأقل (PDF، Word أو صورة)");
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.set("subjectId", subjectId);
    form.set("mode", mode);
    form.set("lessonTitle", lessonTitle);
    form.set("gradeLevel", gradeLevel);
    form.set("styleNotes", styleNotes);
    files.forEach((f) => form.append("files", f));

    const res = await fetch("/api/lesson-prep", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    router.push(`/subjects/${subjectId}/lesson-prep/${data.lessonPrep.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-brand-200 bg-white p-5">
      <h3 className="font-bold text-brand-800">تحضير درس جديد</h3>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("generate")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            mode === "generate" ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 text-brand-700 hover:bg-brand-50"
          }`}
        >
          توليد من عنوان الدرس
        </button>
        <button
          type="button"
          onClick={() => setMode("merge")}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            mode === "merge" ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200 text-brand-700 hover:bg-brand-50"
          }`}
        >
          دمج مذكرات مرفوعة
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">عنوان الدرس</label>
        <input
          required
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
          placeholder="مثال: المعادلات من الدرجة الأولى بمجهول واحد"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">المستوى الدراسي</label>
        <input
          required
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          placeholder="مثال: السنة الثانية متوسط"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">ملاحظات حول أسلوبك (اختياري)</label>
        <textarea
          value={styleNotes}
          onChange={(e) => setStyleNotes(e.target.value)}
          rows={2}
          placeholder="مثال: أفضّل أمثلة من الحياة اليومية"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {mode === "merge" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-brand-800">المذكرات المراد دمجها</label>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-4 py-6 text-center transition hover:bg-brand-50">
            <UploadCloud size={24} className="text-brand-500" />
            <span className="font-semibold text-brand-800">
              {files.length > 0 ? `${files.length} ملف(ات) مختارة` : "اضغط هنا لاختيار الملفات"}
            </span>
            <span className="text-xs text-brand-500">PDF، Word (.docx)، أو صور JPG/PNG — حتى 5 ملفات</span>
            <input
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading
          ? mode === "merge"
            ? "الوكيل يقرأ المذكرات ويدمجها الآن..."
            : "فريق الوكلاء يحضّر الدرس الآن..."
          : "تحضير الدرس"}
      </button>
    </form>
  );
}
