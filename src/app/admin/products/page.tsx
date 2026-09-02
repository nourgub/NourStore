import { db } from "@/lib/db";
import { formatDzd } from "@/lib/utils";
import { AdminNav } from "@/components/admin-nav";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminNav />
      <h1 className="text-2xl font-extrabold text-foreground">الكتالوج</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {products.length} خدمة — لإضافة أو تعديل التفاصيل الكاملة عدّل قاعدة البيانات مباشرة
        عبر <code className="font-mono">prisma/seed.ts</code> حاليًا.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-line text-right text-muted-foreground">
              <th className="px-4 py-3 font-semibold">الخدمة</th>
              <th className="px-4 py-3 font-semibold">التصنيف</th>
              <th className="px-4 py-3 font-semibold">السعر</th>
              <th className="px-4 py-3 font-semibold">مميّز</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <span className="me-2">{product.icon}</span>
                  <span className="font-semibold text-foreground">{product.name}</span>
                </td>
                <td className="px-4 py-3">{product.category}</td>
                <td className="px-4 py-3">{formatDzd(product.priceDzd)}</td>
                <td className="px-4 py-3">{product.featured ? "نعم" : "—"}</td>
                <td className="px-4 py-3">
                  <ProductActiveToggle productId={product.id} active={product.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
