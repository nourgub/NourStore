import { db } from "@/lib/db";

function parseFeatures(features: string): string[] {
  try {
    const parsed = JSON.parse(features);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type ProductListItem = Awaited<ReturnType<typeof getActiveProducts>>[number];

export async function getActiveProducts() {
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return products.map((p) => ({ ...p, features: parseFeatures(p.features) }));
}

export async function getFeaturedProducts() {
  const products = await getActiveProducts();
  return products.filter((p) => p.featured);
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findUnique({ where: { slug } });
  if (!product || !product.active) return null;
  return { ...product, features: parseFeatures(product.features) };
}
