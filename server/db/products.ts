// Standalone, one-time-purchase digital products (books/PDFs, the full-book
// ZIP bundle) — see the `products`/`productPurchases` table comments in
// drizzle/schema.ts for how this is deliberately kept separate from
// subscriptionPlans/userSubscriptions. CRUD here mirrors server/db/blog.ts's
// admin-authoring pattern; the upload path mirrors uploadLessonAsset in
// server/db/courses/authoring.ts.
import { and, desc, eq } from "drizzle-orm";
import { products, productPurchases } from "../../drizzle/schema";
import { getDb } from "./shared";
import { storagePut } from "../storage";
import { validateUploadBytes } from "../uploadValidation";
import { ENV } from "../_core/env";

export async function getActiveProductsForPublic() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: products.id,
      slug: products.slug,
      titleAr: products.titleAr,
      titleFr: products.titleFr,
      titleEn: products.titleEn,
      descriptionAr: products.descriptionAr,
      descriptionFr: products.descriptionFr,
      descriptionEn: products.descriptionEn,
      priceCents: products.priceCents,
      currency: products.currency,
      // Never expose storageKey/fileMimeType publicly — the file itself is
      // only ever reachable through the protected download route, and only
      // after a real productPurchases row exists for the requesting user.
    })
    .from(products)
    .where(eq(products.isActive, 1))
    .orderBy(products.priceCents);
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  const product = rows[0];
  if (!product || product.isActive !== 1) return undefined;
  return product;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return rows[0];
}

export async function getAllProductsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function createProduct(input: {
  slug: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;
  priceCents: number;
  currency?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(products).values({
    ...input,
    currency: (input.currency ?? "DZD").toUpperCase(),
    isActive: 1,
  });
}

export async function updateProduct(
  id: number,
  input: {
    titleAr: string;
    titleFr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionFr: string;
    descriptionEn: string;
    priceCents: number;
    currency?: string;
  }
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(products)
    .set({
      titleAr: input.titleAr,
      titleFr: input.titleFr,
      titleEn: input.titleEn,
      descriptionAr: input.descriptionAr,
      descriptionFr: input.descriptionFr,
      descriptionEn: input.descriptionEn,
      priceCents: input.priceCents,
      ...(input.currency ? { currency: input.currency.toUpperCase() } : {}),
    })
    .where(eq(products.id, id));
  return true;
}

export async function setProductActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(products)
    .set({ isActive: isActive ? 1 : 0 })
    .where(eq(products.id, id));
  return true;
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(products).where(eq(products.id, id));
  return true;
}

/** Admin uploads/replaces the deliverable file (a book PDF, or the full-bundle ZIP) for an existing product. */
export async function uploadProductFile(input: {
  productId: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: string;
}): Promise<
  | { ok: true; fileName: string; mimeType: string }
  | { ok: false; reason: string }
> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "unavailable" };
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);
  if (!rows.length) return { ok: false, reason: "not_found" };
  const bytes = Buffer.from(input.data, "base64");
  const validation = validateUploadBytes({
    fileName: input.fileName,
    mimeType: input.mimeType,
    declaredSizeBytes: input.sizeBytes,
    decodedByteLength: bytes.length,
    bytes,
  });
  if (!validation.ok) return validation;
  const safeName =
    input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "product-file";
  const uploaded = await storagePut(
    `products/${input.productId}/${safeName}`,
    bytes,
    input.mimeType
  );
  await db
    .update(products)
    .set({
      storageKey: uploaded.key,
      fileName: input.fileName.slice(0, 255),
      fileMimeType: input.mimeType,
    })
    .where(eq(products.id, input.productId));
  return { ok: true, fileName: input.fileName, mimeType: input.mimeType };
}

/** A learner's owned products with a real, re-checked-on-every-request download URL — same non-expiring-static-path posture as getLessonAssets (see its comment for why the raw storage URL is never handed out directly). */
export async function getUserProductPurchases(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      purchaseId: productPurchases.id,
      productId: products.id,
      slug: products.slug,
      titleAr: products.titleAr,
      titleFr: products.titleFr,
      titleEn: products.titleEn,
      fileName: products.fileName,
      storageKey: products.storageKey,
      purchasedAt: productPurchases.purchasedAt,
    })
    .from(productPurchases)
    .innerJoin(products, eq(products.id, productPurchases.productId))
    .where(eq(productPurchases.userId, userId))
    .orderBy(desc(productPurchases.purchasedAt));
  const { storageGetSignedUrl } = await import("../storage");
  return Promise.all(
    rows.map(async row => ({
      ...row,
      downloadUrl: !row.storageKey
        ? null // purchased but the admin hasn't uploaded the file yet — honest empty state, not a fake link
        : ENV.storageProvider === "s3"
          ? await storageGetSignedUrl(row.storageKey)
          : `/api/protected-files/product/${row.productId}`,
    }))
  );
}

export async function hasUserPurchasedProduct(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: productPurchases.id })
    .from(productPurchases)
    .where(
      and(
        eq(productPurchases.userId, userId),
        eq(productPurchases.productId, productId)
      )
    )
    .limit(1);
  return rows.length > 0;
}
