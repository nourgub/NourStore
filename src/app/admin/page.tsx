import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminTeacher } from "@/lib/billingConfig";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminPaymentRequestsList } from "@/components/AdminPaymentRequestsList";
import { AdminPasswordResetsList } from "@/components/AdminPasswordResetsList";
import { AdminCleanupOldPapers } from "@/components/AdminCleanupOldPapers";

export default async function AdminPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (!isAdminTeacher(teacher)) redirect("/dashboard");

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
      </main>
    </>
  );
}
