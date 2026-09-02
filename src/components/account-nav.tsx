"use client";

import { useRouter } from "next/navigation";

export function AccountNav({ storeName }: { storeName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/account/login");
    router.refresh();
  }

  return (
    <div className="mb-8 flex items-center justify-between border-b border-line pb-4">
      <div>
        <p className="text-xs text-muted-foreground">مرحبًا بك،</p>
        <p className="font-bold text-foreground">{storeName}</p>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        تسجيل الخروج
      </button>
    </div>
  );
}
