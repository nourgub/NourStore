import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin-nav";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  let features: string[] = [];
  try {
    const parsed = JSON.parse(product.features);
    if (Array.isArray(parsed)) features = parsed;
  } catch {
    features = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <AdminNav />
      <h1 className="text-2xl font-extrabold text-foreground">تعديل: {product.name}</h1>
      <div className="mt-6">
        <ProductForm
          initial={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            tagline: product.tagline,
            description: product.description,
            category: product.category,
            icon: product.icon,
            priceDzd: product.priceDzd,
            features,
            featured: product.featured,
            active: product.active,
            sortOrder: product.sortOrder,
          }}
        />
      </div>
    </div>
  );
}
