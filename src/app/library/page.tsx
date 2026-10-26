import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/lib/session";
import { SiteHeader } from "@/components/SiteHeader";
import { LibraryBrowser } from "@/components/LibraryBrowser";

export default async function LibraryPage() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/login");

  return (
    <>
      <SiteHeader teacherName={teacher.fullName} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-brand-900">المكتبة التعليمية</h1>
        <p className="mb-8 text-sm text-brand-600">
          دروس وتمارين وامتحانات من المنهاج الجزائري، راجعها الإداري واعتمدها قبل النشر هنا.
        </p>
        <LibraryBrowser />
      </main>
    </>
  );
}
