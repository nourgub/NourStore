"use client";

import { useEffect, useState } from "react";
import { FileText, CheckCircle2, XCircle } from "lucide-react";

interface PendingRequest {
  id: string;
  teacherName: string;
  teacherEmail: string;
  receiptMimeType: string;
  createdAt: string;
}

export function AdminPaymentRequestsList() {
  const [requests, setRequests] = useState<PendingRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/payment-requests");
    const data = await res.json();
    if (res.ok) setRequests(data.requests);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/payment-requests/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
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
  if (requests.length === 0) return <p className="text-sm text-brand-500">لا توجد طلبات تفعيل بانتظار المراجعة.</p>;

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

          {r.receiptMimeType === "application/pdf" ? (
            <a
              href={`/api/admin/receipts/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              <FileText size={16} /> عرض ملف PDF
            </a>
          ) : (
            <a href={`/api/admin/receipts/${r.id}`} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/receipts/${r.id}`}
                alt="وصل الدفع"
                className="mb-3 max-h-64 rounded-lg border border-brand-100 object-contain"
              />
            </a>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => decide(r.id, "approve")}
              disabled={busyId === r.id}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 size={16} /> تفعيل الحساب
            </button>
            <button
              onClick={() => decide(r.id, "reject")}
              disabled={busyId === r.id}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
            >
              <XCircle size={16} /> رفض
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
