import { db } from "@/lib/db";
import { formatDzd } from "@/lib/utils";
import { AdminNav } from "@/components/admin-nav";
import { statusLabels } from "@/components/status-badge";

export const dynamic = "force-dynamic";

const REVENUE_STATUSES = new Set(["paid", "fulfilled"]);
const STATUS_ORDER = ["pending_payment", "proof_submitted", "paid", "fulfilled", "cancelled"];

export default async function AdminDashboardPage() {
  const orders = await db.order.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = orders
    .filter((o) => REVENUE_STATUSES.has(o.status))
    .reduce((sum, o) => sum + o.product.priceDzd, 0);

  const statusCounts = new Map<string, number>();
  for (const status of STATUS_ORDER) statusCounts.set(status, 0);
  for (const order of orders) {
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  }

  const productCounts = new Map<string, { name: string; icon: string; count: number }>();
  for (const order of orders) {
    const entry = productCounts.get(order.productId);
    if (entry) {
      entry.count += 1;
    } else {
      productCounts.set(order.productId, {
        name: order.product.name,
        icon: order.product.icon,
        count: 1,
      });
    }
  }
  const topProducts = Array.from(productCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminNav />
      <h1 className="text-2xl font-extrabold text-foreground">لوحة المعلومات</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="الإيرادات (مدفوع + مفعّل)" value={formatDzd(totalRevenue)} />
        <StatCard label="إجمالي الطلبات" value={String(orders.length)} />
        <StatCard
          label="بانتظار المتابعة"
          value={String(
            (statusCounts.get("pending_payment") ?? 0) + (statusCounts.get("proof_submitted") ?? 0),
          )}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="font-bold text-foreground">الطلبات حسب الحالة</h2>
          <div className="mt-4 space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = statusCounts.get(status) ?? 0;
              const pct = orders.length ? Math.round((count / orders.length) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{statusLabels[status]}</span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="font-bold text-foreground">الأكثر مبيعًا</h2>
          <div className="mt-4 space-y-3">
            {topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{product.icon}</span>
                  <span className="text-foreground">{product.name}</span>
                </span>
                <span className="font-semibold text-muted-foreground">{product.count} طلب</span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="font-bold text-foreground">أحدث الطلبات</h2>
        <div className="mt-4 space-y-2">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0"
            >
              <span className="font-mono text-xs text-muted-foreground">{order.orderNumber}</span>
              <span className="text-foreground">{order.merchantName}</span>
              <span className="text-muted-foreground">{order.product.name}</span>
              <span className="font-semibold text-foreground">{formatDzd(order.product.priceDzd)}</span>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}
