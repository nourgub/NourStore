import { redirect } from "next/navigation";
import { MessageCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { getLatestPaymentRequest } from "@/lib/billing";
import { BILLING_CONFIG } from "@/lib/billingConfig";
import { SiteHeader } from "@/components/SiteHeader";
import { BillingUploadForm } from "@/components/BillingUploadForm";

export default async function BillingPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  const latestRequest = getLatestPaymentRequest(teacher.id);
  const whatsappMessage = encodeURIComponent(
    `مرحبًا، أنا ${teacher.fullName} (${teacher.email}) — أرسلت وصل دفع الاشتراك في منصة نور وأحتاج تفعيلًا سريعًا.`,
  );
  const whatsappUrl = `https://wa.me/${BILLING_CONFIG.whatsappNumber}?text=${whatsappMessage}`;

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-brand-900">الاشتراك في منصة نور</h1>
        <p className="mb-8 text-sm text-brand-600">فعّل حسابك لتتمكن من توليد الامتحانات والملفات</p>

        {teacher.subscriptionStatus === "active" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <CheckCircle2 size={24} />
            <p className="font-semibold">اشتراكك مفعّل — يمكنك استخدام المنصة بحرية.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {teacher.subscriptionStatus === "pending" && latestRequest?.status === "pending" && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <Clock size={20} />
                <p className="text-sm font-semibold">طلبك قيد المراجعة — سيتم تفعيل حسابك بعد التأكد من الدفع.</p>
              </div>
            )}
            {teacher.subscriptionStatus === "rejected" && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                <XCircle size={20} />
                <p className="text-sm font-semibold">لم نتمكن من تأكيد وصل الدفع السابق — تحقق من البيانات وأرسل وصلاً جديدًا.</p>
              </div>
            )}

            <section className="rounded-2xl border border-brand-200 bg-white p-5">
              <h2 className="mb-3 font-bold text-brand-800">معلومات الدفع</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-brand-600">السعر</dt>
                  <dd className="font-semibold text-brand-900">{BILLING_CONFIG.priceLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-600">اسم صاحب الحساب</dt>
                  <dd className="font-semibold text-brand-900">{BILLING_CONFIG.accountHolderName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-brand-600">رقم الحساب BaridiMob/CCP</dt>
                  <dd className="break-all text-left font-mono font-semibold text-brand-900" dir="ltr">
                    {BILLING_CONFIG.accountRip}
                  </dd>
                </div>
              </dl>
            </section>

            {(teacher.subscriptionStatus === "rejected" ||
              !latestRequest ||
              latestRequest.status !== "pending") && (
              <section className="rounded-2xl border border-brand-200 bg-white p-5">
                <h2 className="mb-3 font-bold text-brand-800">تأكيد الاشتراك</h2>
                <BillingUploadForm />
              </section>
            )}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <MessageCircle size={18} /> أو أرسل الوصل مباشرة عبر واتساب للتفعيل الفوري
            </a>
          </div>
        )}
      </main>
    </>
  );
}
