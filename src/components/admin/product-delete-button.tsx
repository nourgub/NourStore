"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductDeleteButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setError(null);
    const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "تعذر الحذف");
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span>حذف {productName}؟</span>
        <button onClick={handleDelete} className="font-semibold text-red-600">
          نعم
        </button>
        <button onClick={() => setConfirming(false)} className="text-muted-foreground">
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setConfirming(true)}
        className="text-sm font-semibold text-red-600 hover:underline"
      >
        حذف
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
