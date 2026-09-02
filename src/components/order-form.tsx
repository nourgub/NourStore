"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const paymentOptions = [
  { value: "baridimob", label: "BaridiMob" },
  { value: "ccp", label: "CCP" },
  { value: "bank_transfer", label: "تحويل بنكي" },
] as const;

export function OrderForm({ productSlug }: { productSlug: string }) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof paymentOptions)[number]["value"]>("baridimob");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set("productSlug", productSlug);
    formData.set("paymentMethod", paymentMethod);

    try {
      const response = await fetch("/api/orders", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
        setSubmitting(false);
        return;
      }
      router.push(`/order/confirmation/${data.orderNumber}`);
    } catch {
      setError("تعذر الاتصال بالخادم، تحقق من اتصالك وحاول مرة أخرى");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="الاسم الكامل" name="merchantName" required placeholder="مثال: أحمد بلقاسم" />
        <Field label="اسم المتجر/المحل" name="storeName" required placeholder="مثال: متجر الأناقة" />
        <Field
          label="رقم الهاتف"
          name="phone"
          required
          type="tel"
          placeholder="0555 12 34 56"
        />
        <Field
          label="رقم واتساب (اختياري)"
          name="whatsapp"
          type="tel"
          placeholder="إن كان مختلفًا عن الهاتف"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          ملاحظات إضافية (اختياري)
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="أي تفاصيل تساعدنا على تجهيز الخدمة بشكل أفضل"
          className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="rounded-xl border border-line bg-muted/40 p-4">
        <Field
          label="كلمة مرور الحساب"
          name="password"
          required
          type="password"
          placeholder="6 أحرف على الأقل"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          سننشئ لك حسابًا تلقائيًا لمتابعة كل طلباتك وفواتيرك من صفحة{" "}
          <span className="font-semibold text-foreground">حسابي</span>. إن كان لديك حساب بنفس
          رقم الهاتف، أدخل كلمة مروره لتسجيل الدخول تلقائيًا.
        </p>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-foreground">طريقة الدفع</span>
        <div className="flex flex-wrap gap-2">
          {paymentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPaymentMethod(option.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                paymentMethod === option.value
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground">
          إثبات الدفع (اختياري الآن، يمكن إرساله لاحقًا عبر واتساب)
        </label>
        <input
          type="file"
          name="proofImage"
          accept="image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-muted-foreground file:me-4 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-dark"
        />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        بإرسال الطلب فإنك توافق على{" "}
        <Link href="/terms" className="underline">
          الشروط والأحكام
        </Link>{" "}
        و{" "}
        <Link href="/privacy" className="underline">
          سياسة الخصوصية
        </Link>
        .
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
      />
    </div>
  );
}
