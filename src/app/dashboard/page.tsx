import Link from "next/link";
import { redirect } from "next/navigation";
import { Calculator, BookOpen, Atom, ArrowLeft } from "lucide-react";
import { getCurrentTeacher } from "@/lib/session";
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
    description: "قريبًا — نفس التدفق يُطبَّق على مادة جديدة بعد تجربة الرياضيات.",
    icon: BookOpen,
    available: false,
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
