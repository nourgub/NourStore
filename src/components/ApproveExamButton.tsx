"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export function ApproveExamButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/generate/${requestId}/approve`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
      <div className="mb-2 flex items-center gap-2 font-bold">
        <ShieldAlert size={18} className="shrink-0" />
        هذا الامتحان ما يزال مسودة
      </div>
      <p className="mb-3">
        راجع الأسئلة والحلول النموذجية وسلم التنقيط أدناه بنفسك (وملاحظات المراجعة المستقلة إن وُجدت) قبل الاعتماد — لا
        يمكن بدء جلسة تصحيح حقيقية لأوراق التلاميذ على امتحان غير معتمد.
      </p>
      <button
        onClick={approve}
        disabled={loading}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
      >
        {loading ? "جارٍ الاعتماد..." : "اعتماد الامتحان (الأسئلة والحلول والسلم)"}
      </button>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}
    </div>
  );
}
