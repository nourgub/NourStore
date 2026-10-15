import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Sparkles size={22} />
          </span>
          <span className="text-lg font-extrabold text-brand-900">نور</span>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-brand-900">استعادة كلمة المرور</h1>
          <p className="mb-6 text-sm text-brand-600">
            أدخل بريدك الإلكتروني وستراجع الإدارة طلبك لمساعدتك على استعادة الدخول.
          </p>
          <ForgotPasswordForm />
          <p className="mt-6 text-center text-sm text-brand-700">
            تذكّرت كلمة المرور؟{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              سجّل الدخول
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
