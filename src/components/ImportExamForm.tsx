"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import type { SubjectId } from "@/lib/types";

export function ImportExamForm({ subjectId }: { subjectId: SubjectId }) {
  const router = useRouter();
  const [examTitle, setExamTitle] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [examFile, setExamFile] = useState<File | null>(null);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!examFile) {
      setError("ارفع ملف الامتحان");
      return;
    }
    if (!correctionFile) {
      setError("ارفع ملف التصحيح النموذجي");
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.set("subjectId", subjectId);
    form.set("examTitle", examTitle);
    form.set("gradeLevel", gradeLevel);
    form.set("topic", topic);
    form.set("examFile", examFile);
    form.set("correctionFile", correctionFile);

    const res = await fetch("/api/generate/import", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    router.push(`/subjects/${subjectId}/results/${data.request.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-brand-200 bg-white p-5">
      <h3 className="font-bold text-brand-800">استيراد امتحان جاهز للتصحيح مباشرة</h3>
      <p className="text-xs text-brand-600">
        لديك امتحان كتبته بنفسك مسبقًا (وليس عبر هذه المنصة)؟ ارفع ملف الامتحان وملف التصحيح النموذجي، وسيجهّزهما
        النظام للتصحيح الآلي مباشرة — بدون توليد أي محتوى جديد بالذكاء الاصطناعي. نص الامتحان يبقى كما كتبته تمامًا،
        دون أي تعديل.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">عنوان الامتحان</label>
        <input
          required
          value={examTitle}
          onChange={(e) => setExamTitle(e.target.value)}
          placeholder="مثال: الفرض الأول — الفصل الثاني"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">المستوى الدراسي</label>
        <input
          required
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          placeholder="مثال: السنة الثالثة ثانوي — شعبة علوم تجريبية"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">المحور (اختياري)</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="مثال: دراسة الدوال"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-800">ملف الامتحان (PDF أو Word)</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-300 bg-white px-3 py-4 text-xs text-brand-600 hover:bg-brand-50">
            <Upload size={14} />
            {examFile ? examFile.name : "اختر الملف"}
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => setExamFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-800">ملف التصحيح النموذجي (PDF أو Word)</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-300 bg-white px-3 py-4 text-xs text-brand-600 hover:bg-brand-50">
            <Upload size={14} />
            {correctionFile ? correctionFile.name : "اختر الملف"}
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => setCorrectionFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        يتطلب هذا الوضع تفعيل خدمة Claude على الخادم (لا يوجد بديل تجريبي لفهم ملفاتك الفعلية). نقاط كل سؤال تُقرأ من
        ملفاتك مباشرة — لا يُفرض مجموع 20 إن لم يكن هذا مجموع امتحانك الفعلي.
      </p>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "جارٍ القراءة والتجهيز..." : "استيراد الامتحان والمتابعة للتصحيح"}
      </button>
    </form>
  );
}
