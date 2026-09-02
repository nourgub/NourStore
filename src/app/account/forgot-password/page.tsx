"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [phone, setPhone] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const submittedPhone = String(formData.get("phone") ?? "");

    const response = await fetch("/api/account/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: submittedPhone }),
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
      return;
    }

    setPhone(submittedPhone);
    setInfo(data.message);
    setStep("reset");
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/account/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        code: formData.get("code"),
        newPassword: formData.get("newPassword"),
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
      setSubmitting(false);
      return;
    }

    router.push("/account/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-extrabold text-foreground">استعادة كلمة المرور</h1>

      {step === "phone" ? (
        <div key="phone-step">
          <p className="mt-2 text-sm text-muted-foreground">
            أدخل رقم الهاتف المسجَّل، وسنرسل لك رمز تأكيد عبر واتساب.
          </p>
          <form onSubmit={handleRequestCode} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                رقم الهاتف
              </label>
              <input
                name="phone"
                type="tel"
                required
                className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "جارٍ الإرسال..." : "إرسال رمز التأكيد"}
            </Button>
          </form>
        </div>
      ) : (
        <div key="reset-step">
          {info && <p className="mt-2 text-sm text-brand-dark">{info}</p>}
          <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                رمز التأكيد (6 أرقام)
              </label>
              <input
                name="code"
                inputMode="numeric"
                pattern="\d{6}"
                required
                className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-center text-lg font-mono tracking-widest outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                كلمة المرور الجديدة
              </label>
              <input
                name="newPassword"
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
              />
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "جارٍ التحقق..." : "تعيين كلمة المرور والدخول"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              تغيير رقم الهاتف
            </button>
          </form>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        تذكّرت كلمة المرور؟{" "}
        <Link href="/account/login" className="font-semibold text-brand-dark">
          سجّل الدخول
        </Link>
      </p>
    </div>
  );
}
