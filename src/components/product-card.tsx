import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ProductListItem } from "@/lib/products";
import { formatDzd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-2xl transition-transform duration-200 group-hover:scale-105">
          {product.icon}
        </span>
        <Badge>{product.category}</Badge>
      </div>
      <h3 className="mt-4 text-lg font-bold text-foreground transition-colors group-hover:text-brand-dark">
        {product.name}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{product.tagline}</p>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <span className="font-bold text-foreground">{formatDzd(product.priceDzd)}</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-brand-dark">
          التفاصيل
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
