"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { BILLING_CONFIG } from "@/lib/billingConfig";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const whatsappMessage = encodeURIComponent(
    `مرحبًا، نسيت كلمة مرور حسابي في منصة نور (${email || "بريدي الإلكتروني"}) وأحتاج استعادتها.`,
  );
  const whatsappUrl = `https://wa.me/${BILLING_CONFIG.whatsappNumber}?text=${whatsappMessage}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          إذا كان هذا البريد مسجلاً لدينا، فقد وصل طلبك إلى الإدارة وستتم مراجعته قريبًا.
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <MessageCircle size={18} /> للأسرع — تواصل مباشرة عبر واتساب
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-800">البريد الإلكتروني</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "جارٍ الإرسال..." : "إرسال طلب الاستعادة"}
      </button>
    </form>
  );
}
