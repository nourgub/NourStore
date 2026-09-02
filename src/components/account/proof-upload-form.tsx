"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProofUploadForm({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/account/orders/${orderNumber}/proof`, {
      method: "POST",
      body: formData,
    });

    setSubmitting(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "تعذر الرفع");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
      <input
        type="file"
        name="proofImage"
        required
        accept="image/png,image/jpeg,image/webp"
        className="flex-1 text-xs text-muted-foreground file:me-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-dark"
      />
      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? "جارٍ الرفع..." : "رفع إثبات الدفع"}
      </Button>
      {error && <p className="w-full text-xs font-medium text-red-600">{error}</p>}
    </form>
  );
}
