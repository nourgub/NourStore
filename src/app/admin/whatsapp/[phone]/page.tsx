import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { AdminNav } from "@/components/admin-nav";
import { WhatsappReplyForm } from "@/components/admin/whatsapp-reply-form";

export const dynamic = "force-dynamic";

export default async function AdminWhatsappThreadPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone: encodedPhone } = await params;
  const phone = decodeURIComponent(encodedPhone);

  const messages = await db.whatsappMessage.findMany({
    where: { phone },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <AdminNav />
      <h1 className="font-mono text-2xl font-extrabold text-foreground">{phone}</h1>

      <div className="mt-6 space-y-3 rounded-2xl border border-line bg-card p-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
              message.direction === "outbound"
                ? "ms-auto bg-brand text-white"
                : "bg-muted text-foreground",
            )}
          >
            <p>{message.body}</p>
            <p
              className={cn(
                "mt-1 text-[11px]",
                message.direction === "outbound" ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {new Intl.DateTimeFormat("ar-DZ", { dateStyle: "short", timeStyle: "short" }).format(
                message.createdAt,
              )}
              {message.status && message.direction === "outbound" ? ` · ${message.status}` : ""}
            </p>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground">لا توجد رسائل بعد.</p>
        )}
      </div>

      <div className="mt-4">
        <WhatsappReplyForm phone={phone} />
      </div>
    </div>
  );
}
