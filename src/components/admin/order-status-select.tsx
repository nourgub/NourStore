"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const statusOptions = [
  { value: "pending_payment", label: "بانتظار الدفع" },
  { value: "proof_submitted", label: "تم إرسال إثبات الدفع" },
  { value: "paid", label: "تم الدفع" },
  { value: "fulfilled", label: "تم التفعيل" },
  { value: "cancelled", label: "ملغى" },
] as const;

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  async function handleChange(newStatus: string) {
    setValue(newStatus);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm outline-none focus:border-brand"
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
