import Link from "next/link";
import { redirect } from "next/navigation";
import { Calculator, BookOpen, Atom, ArrowLeft, AlertCircle, Gift } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
import { getUsageSummary, hasFreeTrialAvailable } from "@/lib/usage";
import { PLANS } from "@/lib/plans";
import { SiteHeader } from "@/components/SiteHeader";

const SUBJECTS = [
  {
    id: "math",
    name: "الرياضيات",
    description: "فريق وكلاء متخصص: تحليل المنهج، صياغة الأسئلة، الحلول النموذجية، وشبكة التنقيط.",
    icon: Calculator,
    available: true,
  },
  {
    id: "arabic",
    name: "اللغة العربية",
    description: "فريق وكلاء متخصص: قواعد، صرف، فهم قرائي، بلاغة، وإملاء — بنفس تدفق الرياضيات.",
    icon: BookOpen,
    available: true,
  },
  { id: "physics", name: "الفيزياء", description: "قريبًا.", icon: Atom, available: false },
];

export default async function DashboardPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-900">مرحبًا، {teacher.fullName}</h1>
          <p className="mt-1 text-sm text-brand-600">اختر مادة لبدء العمل مع فريق الوكلاء الخاص بها</p>
        </div>

        {teacher.subscriptionStatus === "pending" && hasFreeTrialAvailable(teacher) && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <Gift size={20} className="shrink-0" />
            <p className="text-sm font-semibold">
              لديك تجربة مجانية واحدة — جرّب أي ميزة تريدها (تحضير درس، توليد امتحان، أو تصحيح ورقة) مجانًا قبل الاشتراك.
            </p>
          </div>
        )}

        {teacher.subscriptionStatus !== "active" && !hasFreeTrialAvailable(teacher) && (
          <Link
            href="/billing"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 transition hover:bg-amber-100"
          >
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-semibold">
              {teacher.subscriptionStatus === "pending"
                ? "استعملت تجربتك المجانية — فعّل اشتراكك لمتابعة الاستخدام — اضغط هنا لإتمام الدفع."
                : teacher.subscriptionStatus === "expired"
                  ? "انتهت مدة اشتراكك — اضغط هنا لتجديده ومتابعة استخدام المنصة."
                  : "لم نتمكن من تأكيد وصل الدفع السابق — اضغط هنا لإرسال وصل جديد."}
            </p>
          </Link>
        )}

        {teacher.subscriptionStatus === "active" && teacher.planId && (
          <section className="mb-8 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-brand-800">باقتك: {PLANS[teacher.planId].displayName}</h2>
              <Link href="/billing" className="text-xs font-semibold text-brand-600 hover:underline">
                تغيير الباقة
              </Link>
            </div>
            <div className="space-y-2">
              {getUsageSummary(teacher)
                .filter((entry) => entry.enabled)
                .map((entry) => {
                  const pct = entry.limit > 0 ? Math.min(100, Math.round((entry.used / entry.limit) * 100)) : 0;
                  return (
                    <div key={entry.feature}>
                      <div className="mb-1 flex justify-between text-xs text-brand-600">
                        <span>{entry.label}</span>
                        <span>
                          {entry.used} / {entry.limit} هذا الشهر
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : "bg-brand-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {SUBJECTS.map((s) => {
            const Icon = s.icon;
            return s.available ? (
              <Link
                key={s.id}
                href={`/subjects/${s.id}`}
                className="group rounded-2xl border border-brand-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon size={20} />
                </div>
                <h2 className="text-lg font-bold text-brand-800">{s.name}</h2>
                <p className="mt-2 text-sm text-brand-600">{s.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition group-hover:gap-2">
                  ابدأ الآن <ArrowLeft size={14} />
                </span>
              </Link>
            ) : (
              <div key={s.id} className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-6 opacity-70">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100/70 text-brand-500">
                  <Icon size={20} />
                </div>
                <h2 className="text-lg font-bold text-brand-800">{s.name}</h2>
                <p className="mt-2 text-sm text-brand-600">{s.description}</p>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
