import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";

const SUBJECTS = [
  {
    id: "math",
    name: "الرياضيات",
    description: "فريق وكلاء متخصص: تحليل المنهج، صياغة الأسئلة، الحلول النموذجية، وشبكة التنقيط.",
    available: true,
  },
  { id: "arabic", name: "اللغة العربية", description: "قريبًا — نفس التدفق يُطبَّق على مادة جديدة بعد تجربة الرياضيات.", available: false },
  { id: "physics", name: "الفيزياء", description: "قريبًا.", available: false },
];

export default async function DashboardPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">مرحبًا، {teacher.fullName}</h1>
          <p className="mt-1 text-sm text-brand-600">اختر مادة لبدء العمل مع فريق الوكلاء الخاص بها</p>
        </div>
        <LogoutButton />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {SUBJECTS.map((s) =>
          s.available ? (
            <Link
              key={s.id}
              href={`/subjects/${s.id}`}
              className="rounded-2xl border border-brand-200 bg-white p-6 shadow-sm transition hover:border-brand-400 hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-brand-800">{s.name}</h2>
              <p className="mt-2 text-sm text-brand-600">{s.description}</p>
            </Link>
          ) : (
            <div key={s.id} className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-6 opacity-70">
              <h2 className="text-lg font-bold text-brand-800">{s.name}</h2>
              <p className="mt-2 text-sm text-brand-600">{s.description}</p>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
