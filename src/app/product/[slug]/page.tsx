import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getProductBySlug } from "@/lib/products";
import { formatDzd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="flex items-start gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-3xl">
          {product.icon}
        </span>
        <div>
          <Badge>{product.category}</Badge>
          <h1 className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{product.tagline}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <h2 className="text-lg font-bold text-foreground">عن هذه الخدمة</h2>
          <p className="mt-3 leading-8 text-muted-foreground">{product.description}</p>

          <h2 className="mt-8 text-lg font-bold text-foreground">ماذا تتضمن؟</h2>
          <ul className="mt-4 space-y-3">
            {product.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="h-fit rounded-2xl border border-line bg-card p-6 shadow-sm shadow-brand/5 sm:sticky sm:top-24">
          <p className="text-sm text-muted-foreground">السعر</p>
          <p className="mt-1 text-3xl font-extrabold text-foreground">
            {formatDzd(product.priceDzd)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">دفعة واحدة لتفعيل الخدمة</p>
          <ButtonLink href={`/order/${product.slug}`} className="mt-6 w-full" size="lg">
            اطلب هذه الخدمة
          </ButtonLink>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            الدفع عبر BaridiMob أو تحويل بنكي — بدون بطاقة ائتمان
          </p>
        </div>
      </div>
    </div>
  );
}
