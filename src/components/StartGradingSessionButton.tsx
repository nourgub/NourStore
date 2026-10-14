"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartGradingSessionButton({ examRequestId, examTitle }: { examRequestId: string; examTitle: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/grading/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examRequestId, title: `تصحيح — ${examTitle}` }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      setLoading(false);
      return;
    }
    router.push(`/grading/${data.session.id}`);
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={loading}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "جارٍ الإنشاء..." : "+ بدء جلسة تصحيح جديدة"}
      </button>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
