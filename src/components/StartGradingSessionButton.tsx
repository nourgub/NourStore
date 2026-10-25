"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartGradingSessionButton({
  examRequestId,
  examTitle,
  examApproved,
}: {
  examRequestId: string;
  examTitle: string;
  // When false, the server will refuse anyway (see createGradingSession) —
  // disabling here just avoids making the teacher click through to find
  // that out, and explains why in the same place as the approve action.
  examApproved: boolean;
}) {
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

  if (!examApproved) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
        اعتمد الامتحان أولًا (أعلاه) قبل أن تتمكن من بدء جلسة تصحيح حقيقية لأوراق التلاميذ.
      </p>
    );
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
