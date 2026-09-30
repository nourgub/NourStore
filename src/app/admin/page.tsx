import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { isAdminEmail } from "@/lib/billingConfig";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminPaymentRequestsList } from "@/components/AdminPaymentRequestsList";

export default async function AdminPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");
  if (!isAdminEmail(teacher.email)) redirect("/dashboard");

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-brand-900">طلبات تفعيل الاشتراك</h1>
        <p className="mb-8 text-sm text-brand-600">راجع وصل الدفع ثم فعّل الحساب أو ارفض الطلب</p>
        <AdminPaymentRequestsList />
      </main>
    </>
  );
}
