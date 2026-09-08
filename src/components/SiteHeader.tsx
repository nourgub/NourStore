import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LogoutButton } from "./LogoutButton";

export function SiteHeader({ teacherName }: { teacherName?: string }) {
  return (
    <header className="border-b border-brand-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles size={18} />
          </span>
          <span className="text-lg font-extrabold text-brand-900">نور</span>
        </Link>
        {teacherName && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-brand-600 sm:inline">مرحبًا، {teacherName}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
