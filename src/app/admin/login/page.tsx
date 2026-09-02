"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "تعذر تسجيل الدخول");
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-extrabold text-foreground">دخول الإدارة</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        هذه اللوحة مخصصة لصاحب المتجر فقط لمتابعة الطلبات والكتالوج.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            اسم المستخدم
          </label>
          <input
            name="username"
            required
            className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            كلمة المرور
          </label>
          <input
            type="password"
            name="password"
            required
            className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "جارٍ التحقق..." : "دخول"}
        </Button>
      </form>
    </div>
  );
}
