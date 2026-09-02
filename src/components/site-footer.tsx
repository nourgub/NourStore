import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} نور ستور — أتمتة الأعمال للتجار.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/catalog" className="hover:text-foreground">
            الكتالوج
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            الشروط والأحكام
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            سياسة الخصوصية
          </Link>
          <Link href="/admin/login" className="hover:text-foreground">
            دخول الإدارة
          </Link>
        </div>
      </div>
    </footer>
  );
}
