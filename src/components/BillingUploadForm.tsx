"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export function BillingUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("الرجاء اختيار ملف الوصل أولاً");
      return;
    }
    setError(null);
    setLoading(true);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/billing/submit", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-800">إثبات الدفع (صورة الوصل أو لقطة شاشة)</label>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-4 py-8 text-center transition hover:bg-brand-50">
          <UploadCloud size={28} className="text-brand-500" />
          <span className="font-semibold text-brand-800">
            {file ? file.name : "اضغط هنا لاختيار ملف الوصل"}
          </span>
          <span className="text-xs text-brand-500">الصيغ المقبولة: JPG, PNG, PDF</span>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "جارٍ الإرسال..." : "إرسال طلب التفعيل"}
      </button>
    </form>
  );
}
