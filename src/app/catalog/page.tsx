import Link from "next/link";
import { cn } from "@/lib/utils";
import { getActiveProducts } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export const metadata = {
  title: "الكتالوج — نور ستور",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const products = await getActiveProducts();
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const filtered = category ? products.filter((p) => p.category === category) : products;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
          كتالوج خدمات الأتمتة
        </h1>
        <p className="mt-3 text-muted-foreground">
          اختر الخدمة التي تحل أكبر مشكلة تعيق عملك اليوم. كل خدمة قابلة للتفعيل خلال أيام
          قليلة بعد الطلب.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/catalog"
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
            !category
              ? "border-brand bg-brand text-white"
              : "border-line bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          الكل
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/catalog?category=${encodeURIComponent(c)}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              category === c
                ? "border-brand bg-brand text-white"
                : "border-line bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          لا توجد خدمات في هذا التصنيف حاليًا.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
