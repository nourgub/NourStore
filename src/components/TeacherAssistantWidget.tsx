"use client";

import { useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

export function TeacherAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = message.trim();
    if (!text) return;
    setTurns((prev) => [...prev, { role: "user", text }]);
    setMessage("");
    setLoading(true);
    setError(null);
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "حدث خطأ غير متوقع");
      return;
    }
    setTurns((prev) => [...prev, { role: "assistant", text: data.reply }]);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-700"
      >
        <Bot size={18} /> مساعد الأستاذ
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 left-5 flex w-80 flex-col rounded-2xl border border-brand-200 bg-white shadow-xl">
      <div className="flex items-center justify-between rounded-t-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
        <span className="flex items-center gap-2">
          <Bot size={16} /> مساعد الأستاذ
        </span>
        <button onClick={() => setOpen(false)}>✕</button>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto p-3 text-sm">
        {turns.length === 0 && <p className="text-brand-400">اسأل عن أي شيء في المنصة — تحضير الدروس، الاختبارات، التصحيح، أو اشتراكك.</p>}
        {turns.map((t, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-2 ${t.role === "user" ? "bg-brand-50 text-brand-800" : "bg-brand-100 text-brand-900"}`}
          >
            {t.text}
          </div>
        ))}
        {loading && <Loader2 size={16} className="animate-spin text-brand-400" />}
        {error && <p className="text-rose-600">{error}</p>}
      </div>
      <div className="flex gap-2 border-t border-brand-100 p-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="اكتب سؤالك..."
          className="flex-1 rounded-lg border border-brand-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button onClick={send} disabled={loading} className="rounded-lg bg-brand-600 px-3 py-1.5 text-white disabled:opacity-60">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
