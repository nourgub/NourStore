"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProductActiveToggle({
  productId,
  active,
}: {
  productId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(active);
  const [isPending, startTransition] = useTransition();

  async function toggle() {
    const next = !value;
    setValue(next);
    await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        value ? "bg-brand-soft text-brand-dark" : "bg-muted text-muted-foreground",
      )}
    >
      {value ? "منشور" : "متوقف"}
    </button>
  );
}
