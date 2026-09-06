import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { AuthForm } from "@/components/AuthForm";

export default async function SignupPage() {
  const teacher = await getCurrentTeacher();
  if (teacher) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-brand-100 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-brand-900">إنشاء حساب أستاذ جديد</h1>
        <p className="mb-6 text-sm text-brand-600">مساحتك الخاصة معزولة تمامًا عن باقي الأساتذة</p>
        <AuthForm mode="signup" />
        <p className="mt-6 text-center text-sm text-brand-700">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            سجّل الدخول
          </Link>
        </p>
      </div>
    </main>
  );
}
