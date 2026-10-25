import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import { getPlatformAiUsageCostSummary } from "@/lib/aiUsageLog";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminPaymentRequestsList } from "@/components/AdminPaymentRequestsList";
import { AdminPasswordResetsList } from "@/components/AdminPasswordResetsList";
import { AdminCleanupOldPapers } from "@/components/AdminCleanupOldPapers";

const FEATURE_LABEL: Record<string, string> = { grading: "تصحيح الأوراق", exams: "توليد الامتحانات", lessonPrep: "تحضير الدروس" };

export default async function AdminPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (!isAdminTeacher(teacher)) redirect("/dashboard");

  const last30DaysIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const aiCost = getPlatformAiUsageCostSummary(last30DaysIso);

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-brand-900">طلبات تفعيل الاشتراك</h1>
        <p className="mb-8 text-sm text-brand-600">راجع وصل الدفع ثم فعّل الحساب أو ارفض الطلب</p>
        <AdminPaymentRequestsList />

        <h2 className="mb-1 mt-12 text-xl font-bold text-brand-900">طلبات استعادة كلمة المرور</h2>
        <p className="mb-6 text-sm text-brand-600">عيّن كلمة مرور جديدة للأستاذ وأرسلها له مباشرة</p>
        <AdminPasswordResetsList />

        <h2 className="mb-1 mt-12 text-xl font-bold text-brand-900">إدارة التخزين</h2>
        <p className="mb-6 text-sm text-brand-600">صور أوراق التلاميذ لا تُحذف تلقائيًا — نظّفها يدويًا من هنا</p>
        <AdminCleanupOldPapers />

        <h2 className="mb-1 mt-12 text-xl font-bold text-brand-900">استهلاك الذكاء الاصطناعي وتكلفته (آخر 30 يومًا)</h2>
        <p className="mb-4 text-sm text-brand-600">
          تكلفة تقديرية محسوبة من أسعار المزوّدين المُسجَّلة في الكود — ليست فاتورة رسمية، راجع فاتورة Anthropic/Google
          الفعلية للأرقام الدقيقة.
        </p>
        {aiCost.totalCalls === 0 ? (
          <p className="rounded-xl border border-brand-100 bg-white p-4 text-sm text-brand-500">
            لا يوجد استهلاك ذكاء اصطناعي مُسجَّل بعد — هذا السجل يبدأ بعد تفعيل مفتاح API حقيقي والقيام بعمليات تصحيح فعلية.
          </p>
        ) : (
          <div className="rounded-xl border border-brand-100 bg-white p-4 text-sm">
            <p className="mb-3 font-bold text-brand-900">
              الإجمالي: ${aiCost.totalCostUsd.toFixed(4)} — {aiCost.totalCalls} استدعاء — {Math.round(aiCost.totalDurationMs / 1000)} ثانية إجمالًا
            </p>
            <ul className="space-y-1 text-brand-700">
              {aiCost.byFeature.map((f) => (
                <li key={f.feature} className="flex justify-between">
                  <span>{FEATURE_LABEL[f.feature] ?? f.feature}</span>
                  <span className="font-semibold">${f.costUsd.toFixed(4)} ({f.calls} استدعاء)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
