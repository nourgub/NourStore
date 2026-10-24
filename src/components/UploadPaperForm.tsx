"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export function UploadPaperForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim()) {
      setError("أدخل اسم التلميذ");
      return;
    }
    if (files.length === 0) {
      setError("أرفق صورة واحدة على الأقل من ورقة الإجابة");
      return;
    }
    setError(null);
    setLoading(true);
    const form = new FormData();
    form.set("studentName", studentName);
    files.forEach((f) => form.append("files", f));

    const res = await fetch(`/api/grading/sessions/${sessionId}/papers`, { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setStudentName("");
    setFiles([]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-brand-200 bg-white p-5">
      <h3 className="font-bold text-brand-800">إضافة ورقة تلميذ</h3>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">اسم التلميذ</label>
        <input
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="مثال: أمين بن عيسى"
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-800">صور ورقة الإجابة (يمكن اختيار عدة صفحات)</label>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-4 py-6 text-center transition hover:bg-brand-50">
          <UploadCloud size={24} className="text-brand-500" />
          <span className="font-semibold text-brand-800">
            {files.length > 0 ? `${files.length} صورة مختارة` : "اضغط هنا لاختيار صور الورقة"}
          </span>
          <span className="text-xs text-brand-500">JPG أو PNG — حتى 4 صفحات</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
      </div>
      <p className="text-xs text-brand-500">
        تُرسَل صور الورقة إلى Claude للتصحيح الأولي، وإلى Gemini لمراجعة مستقلة إن كانت مفعّلة على الخادم — كلاهما
        خدمتا ذكاء اصطناعي خارجيتان.
      </p>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "جارٍ الإرسال للتصحيح..." : "تصحيح هذه الورقة"}
      </button>
    </form>
  );
}
