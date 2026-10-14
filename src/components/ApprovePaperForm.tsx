"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function ApprovePaperForm({
  paperId,
  defaultTotal,
  totalPoints,
  alreadyApproved,
}: {
  paperId: string;
  defaultTotal: number;
  totalPoints: number;
  alreadyApproved: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/grading/papers/${paperId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedTotal: value }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-5">
      <h3 className="mb-3 font-bold text-brand-800">{alreadyApproved ? "النقطة المعتمدة" : "اعتماد النقطة"}</h3>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="number"
          step={0.5}
          min={0}
          max={totalPoints}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={alreadyApproved}
          className="w-24 rounded-lg border border-brand-200 px-3 py-2 text-center text-lg font-bold text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-brand-50"
        />
        <span className="text-brand-600">/ {totalPoints}</span>
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!alreadyApproved && (
        <button
          onClick={approve}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          <CheckCircle2 size={16} /> {loading ? "جارٍ الاعتماد..." : "اعتماد النقطة"}
        </button>
      )}
    </div>
  );
}
