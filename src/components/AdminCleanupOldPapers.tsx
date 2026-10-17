"use client";

import { useState } from "react";
import { Trash2, HardDrive } from "lucide-react";

interface CleanupResult {
  papersCleaned: number;
  filesDeleted: number;
  bytesFreed: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

export function AdminCleanupOldPapers() {
  const [days, setDays] = useState(90);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCleanup() {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/cleanup-old-papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ olderThanDays: days }),
    });
    const data = await res.json();
    setBusy(false);
    setConfirming(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setResult(data);
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <HardDrive size={18} className="text-brand-500" />
        <h3 className="font-bold text-brand-800">حذف صور أوراق قديمة</h3>
      </div>
      <p className="mb-4 text-sm text-brand-600">
        يحذف نهائيًا صور صفحات الأوراق المُعتمَدة (المراجَعة والمقبولة من الأستاذ) الأقدم من المدة المحددة. العلامة
        والملاحظات والنقل النصي تبقى محفوظة — فقط الصور الحساسة تُحذف لتوفير التخزين وحماية خصوصية التلاميذ. هذا
        الإجراء لا يُراجع تلقائيًا؛ يُفعَّل يدويًا من هنا فقط.
      </p>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-brand-700">احذف الأقدم من</label>
        <input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(Number(e.target.value) || 90)}
          className="w-20 rounded-lg border border-brand-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <span className="text-sm text-brand-700">يومًا</span>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {result && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          تم تنظيف {result.papersCleaned} ورقة، وحذف {result.filesDeleted} صورة ({formatBytes(result.bytesFreed)}).
        </p>
      )}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          <Trash2 size={16} /> حذف الصور القديمة
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-rose-700">متأكدة؟ هذا الإجراء لا يمكن التراجع عنه.</p>
          <button
            onClick={runCleanup}
            disabled={busy}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {busy ? "جارٍ الحذف..." : "نعم، احذف"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
}
