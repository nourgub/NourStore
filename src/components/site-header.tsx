import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/catalog", label: "الكتالوج" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            ن
          </span>
          نور ستور
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ButtonLink href="/catalog" size="sm">
          تصفح الخدمات
        </ButtonLink>
      </div>
    </header>
  );
}
