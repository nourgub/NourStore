import Link from "next/link";
import type { ProductListItem } from "@/lib/products";
import { formatDzd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-card p-6 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-2xl">
          {product.icon}
        </span>
        <Badge>{product.category}</Badge>
      </div>
      <h3 className="mt-4 text-lg font-bold text-foreground group-hover:text-brand-dark">
        {product.name}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{product.tagline}</p>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <span className="font-bold text-foreground">{formatDzd(product.priceDzd)}</span>
        <span className="text-sm font-semibold text-brand-dark">التفاصيل ←</span>
      </div>
    </Link>
  );
}
