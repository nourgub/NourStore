"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/products", label: "الكتالوج" },
  { href: "/admin/whatsapp", label: "واتساب" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="mb-8 flex items-center justify-between border-b border-line pb-4">
      <nav className="flex gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              pathname === link.href || pathname.startsWith(`${link.href}/`)
                ? "bg-brand text-white"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        تسجيل الخروج
      </button>
    </div>
  );
}
