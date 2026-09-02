import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/catalog", label: "الكتالوج" },
  { href: "/account/dashboard", label: "حسابي" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm shadow-brand/30">
            ن
          </span>
          نور ستور
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
              <span className="absolute -bottom-1 right-0 h-0.5 w-0 bg-brand transition-all duration-200 group-hover:w-full" />
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
