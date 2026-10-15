"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";

interface PendingReset {
  id: string;
  teacherName: string;
  teacherEmail: string;
  createdAt: string;
}

export function AdminPasswordResetsList() {
  const [requests, setRequests] = useState<PendingReset[] | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/password-resets");
    const data = await res.json();
    if (res.ok) setRequests(data.requests);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string) {
    const newPassword = passwords[id] ?? "";
    if (newPassword.length < 8) {
      setError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف");
      return;
    }
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/password-resets/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setRequests((prev) => prev?.filter((r) => r.id !== id) ?? null);
  }

  if (requests === null) return <p className="text-sm text-brand-500">جارٍ التحميل...</p>;
  if (requests.length === 0) return <p className="text-sm text-brand-500">لا توجد طلبات استعادة بانتظار المراجعة.</p>;

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {requests.map((r) => (
        <div key={r.id} className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-brand-800">{r.teacherName}</p>
              <p className="text-sm text-brand-600" dir="ltr">
                {r.teacherEmail}
              </p>
            </div>
            <span className="text-xs text-brand-500">{new Date(r.createdAt).toLocaleString("ar")}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="كلمة مرور جديدة (8 أحرف فأكثر)"
              value={passwords[r.id] ?? ""}
              onChange={(e) => setPasswords((prev) => ({ ...prev, [r.id]: e.target.value }))}
              className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={() => resolve(r.id)}
              disabled={busyId === r.id}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              <KeyRound size={16} /> تعيين كلمة المرور
            </button>
          </div>
          <p className="mt-2 text-xs text-brand-500">
            بعد التعيين، أرسل كلمة المرور الجديدة للأستاذ مباشرة (واتساب/هاتف) — لا يتم إرسالها تلقائيًا.
          </p>
        </div>
      ))}
    </div>
  );
}
