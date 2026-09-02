import Link from "next/link";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminWhatsappPage() {
  const messages = await db.whatsappMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const threads = new Map<string, (typeof messages)[number]>();
  for (const message of messages) {
    if (!threads.has(message.phone)) threads.set(message.phone, message);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <AdminNav />
      <h1 className="text-2xl font-extrabold text-foreground">محادثات واتساب</h1>
      <p className="mt-1 text-sm text-muted-foreground">{threads.size} محادثة</p>

      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
        {Array.from(threads.values()).map((message) => (
          <Link
            key={message.phone}
            href={`/admin/whatsapp/${encodeURIComponent(message.phone)}`}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-foreground">{message.phone}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{message.body}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("ar-DZ", { dateStyle: "short", timeStyle: "short" }).format(
                message.createdAt,
              )}
            </span>
          </Link>
        ))}

        {threads.size === 0 && (
          <p className="px-5 py-10 text-center text-muted-foreground">
            لا توجد محادثات بعد. ستظهر هنا الرسائل المرسلة تلقائيًا للتجار والرسائل الواردة بعد
            ربط WhatsApp Cloud API (راجع README).
          </p>
        )}
      </div>
    </div>
  );
}
