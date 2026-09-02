import Link from "next/link";
import { db } from "@/lib/db";
import { formatDzd, cn } from "@/lib/utils";
import { AdminNav } from "@/components/admin-nav";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { statusLabels } from "@/components/status-badge";
import { buildOrderWhere, ORDER_STATUS_VALUES } from "@/lib/order-filters";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const where = buildOrderWhere({ status, q });

  const [orders, totalCount] = await Promise.all([
    db.order.findMany({ where, include: { product: true }, orderBy: { createdAt: "desc" } }),
    db.order.count(),
  ]);

  const exportQuery = new URLSearchParams();
  if (status) exportQuery.set("status", status);
  if (q) exportQuery.set("q", q);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminNav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">الطلبات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} من {totalCount} طلب
          </p>
        </div>
        <a
          href={`/api/admin/orders/export?${exportQuery.toString()}`}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          تصدير CSV
        </a>
      </div>

      <form className="mt-6 flex flex-wrap gap-2" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="بحث بالاسم، الهاتف، أو رقم الطلب"
          className="min-w-[240px] flex-1 rounded-full border border-line bg-card px-4 py-1.5 text-sm outline-none focus:border-brand"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-full border border-line bg-card px-4 py-1.5 text-sm outline-none focus:border-brand"
        >
          <option value="">كل الحالات</option>
          {ORDER_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-brand px-5 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          تصفية
        </button>
        {(status || q) && (
          <Link
            href="/admin/orders"
            className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            إلغاء التصفية
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className={cn("border-b border-line text-right text-muted-foreground")}>
              <th className="px-4 py-3 font-semibold">رقم الطلب</th>
              <th className="px-4 py-3 font-semibold">التاجر</th>
              <th className="px-4 py-3 font-semibold">الخدمة</th>
              <th className="px-4 py-3 font-semibold">المبلغ</th>
              <th className="px-4 py-3 font-semibold">الدفع</th>
              <th className="px-4 py-3 font-semibold">إثبات</th>
              <th className="px-4 py-3 font-semibold">فاتورة</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground">{order.merchantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.storeName} · {order.phone}
                  </p>
                </td>
                <td className="px-4 py-3">{order.product.name}</td>
                <td className="px-4 py-3">{formatDzd(order.product.priceDzd)}</td>
                <td className="px-4 py-3">{order.paymentMethod}</td>
                <td className="px-4 py-3">
                  {order.proofImage ? (
                    <a
                      href={order.proofImage}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-dark underline"
                    >
                      عرض
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/api/invoices/${order.orderNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-dark underline"
                  >
                    PDF
                  </a>
                </td>
                <td className="px-4 py-3">
                  <OrderStatusSelect orderId={order.id} status={order.status} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  {status || q ? "لا توجد طلبات مطابقة." : "لا توجد طلبات بعد."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
