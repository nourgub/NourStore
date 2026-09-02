"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function WhatsappReplyForm({ phone }: { phone: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("body") ?? "").trim();

    const response = await fetch("/api/admin/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, body }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError("تعذر الإرسال");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="body"
        required
        placeholder="اكتب ردًا..."
        className="flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? "..." : "إرسال"}
      </Button>
      {error && <p className="self-center text-sm text-red-600">{error}</p>}
    </form>
  );
}
