import { db } from "@/lib/db";
import { formatDzd } from "@/lib/utils";
import { AdminNav } from "@/components/admin-nav";
import { OrderStatusSelect } from "@/components/admin/order-status-select";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminNav />
      <h1 className="text-2xl font-extrabold text-foreground">الطلبات</h1>
      <p className="mt-1 text-sm text-muted-foreground">{orders.length} طلب إجمالًا</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-line text-right text-muted-foreground">
              <th className="px-4 py-3 font-semibold">رقم الطلب</th>
              <th className="px-4 py-3 font-semibold">التاجر</th>
              <th className="px-4 py-3 font-semibold">الخدمة</th>
              <th className="px-4 py-3 font-semibold">المبلغ</th>
              <th className="px-4 py-3 font-semibold">الدفع</th>
              <th className="px-4 py-3 font-semibold">إثبات</th>
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
                  <OrderStatusSelect orderId={order.id} status={order.status} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  لا توجد طلبات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
