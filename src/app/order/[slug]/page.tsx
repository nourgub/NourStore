import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { formatDzd } from "@/lib/utils";
import { OrderForm } from "@/components/order-form";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-xl">
            {product.icon}
          </span>
          <div>
            <p className="font-bold text-foreground">{product.name}</p>
            <p className="text-sm text-muted-foreground">{formatDzd(product.priceDzd)}</p>
          </div>
        </div>
      </div>

      <h1 className="mt-8 text-2xl font-extrabold text-foreground sm:text-3xl">
        أكمل بيانات الطلب
      </h1>
      <p className="mt-2 text-muted-foreground">
        سيتواصل معك فريقنا خلال 24 ساعة لتأكيد الطلب وتفعيل الخدمة.
      </p>

      <div className="mt-8">
        <OrderForm productSlug={product.slug} />
      </div>
    </div>
  );
}
