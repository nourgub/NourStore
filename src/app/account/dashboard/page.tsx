import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentMerchant } from "@/lib/current-merchant";
import { formatDzd } from "@/lib/utils";
import { AccountNav } from "@/components/account-nav";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function AccountDashboardPage() {
  const merchant = await getCurrentMerchant();
  if (!merchant) redirect("/account/login");

  const orders = await db.order.findMany({
    where: { merchantId: merchant.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <AccountNav storeName={merchant.storeName} />

      <h1 className="text-2xl font-extrabold text-foreground">طلباتي</h1>
      <p className="mt-1 text-sm text-muted-foreground">{orders.length} طلب</p>

      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-xl">
                  {order.product.icon}
                </span>
                <div>
                  <p className="font-bold text-foreground">{order.product.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{order.orderNumber}</p>
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="text-sm text-muted-foreground">
                {formatDzd(order.product.priceDzd)} ·{" "}
                {new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(
                  order.createdAt,
                )}
              </div>
              <a
                href={`/api/invoices/${order.orderNumber}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-brand-dark underline"
              >
                تحميل الفاتورة
              </a>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted-foreground">
            لا توجد طلبات بعد.{" "}
            <a href="/catalog" className="font-semibold text-brand-dark">
              تصفح الكتالوج
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
