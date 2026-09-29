import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, rateLimit } from "../_core/procedures";
import { MAX_UPLOAD_BYTES } from "../uploadValidation";
import {
  getActiveProductsForPublic,
  getProductBySlug,
  getAllProductsForAdmin,
  createProduct,
  updateProduct,
  setProductActive,
  deleteProduct,
  uploadProductFile,
  getUserProductPurchases,
} from "../db";

const productFields = {
  titleAr: z.string().min(2).max(255),
  titleFr: z.string().min(2).max(255),
  titleEn: z.string().min(2).max(255),
  descriptionAr: z.string().min(2),
  descriptionFr: z.string().min(2),
  descriptionEn: z.string().min(2),
  priceCents: z.number().int().min(0).max(100000000),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Za-z]{3}$/)
    .optional(),
};

export const productsRouter = router({
  // Public — the /store page's catalog, no auth needed (same posture as learning.courses).
  list: publicProcedure.query(() => getActiveProductsForPublic()),
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ input }) => {
      const product = await getProductBySlug(input.slug);
      if (!product)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      // Never leak storageKey to a public query — the file is only ever
      // reachable through the protected download route after purchase.
      const { storageKey: _storageKey, ...publicProduct } = product;
      return publicProduct;
    }),
  myPurchases: protectedProcedure.query(({ ctx }) =>
    getUserProductPurchases(ctx.user.id)
  ),

  // Admin-only authoring, mirroring blog/badges/coupons.
  adminList: adminProcedure.query(() => getAllProductsForAdmin()),
  create: adminProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(2)
          .max(120)
          .regex(/^[a-z0-9-]+$/),
        ...productFields,
      })
    )
    .mutation(({ input }) => createProduct(input)),
  update: adminProcedure
    .input(z.object({ id: z.number().int().positive(), ...productFields }))
    .mutation(({ input: { id, ...rest } }) => updateProduct(id, rest)),
  setActive: adminProcedure
    .input(
      z.object({ id: z.number().int().positive(), isActive: z.boolean() })
    )
    .mutation(({ input }) => setProductActive(input.id, input.isActive)),
  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteProduct(input.id)),
  uploadFile: adminProcedure
    .use(rateLimit("product-upload", 20, 60 * 60 * 1000))
    .input(
      z.object({
        productId: z.number().int().positive(),
        fileName: z.string().min(1).max(255),
        mimeType: z.enum([
          "application/pdf",
          "application/zip",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]),
        sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
        data: z.string().min(1).max(Math.ceil(MAX_UPLOAD_BYTES * 1.37)),
      })
    )
    .mutation(async ({ input }) => {
      const result = await uploadProductFile(input);
      if (!result.ok)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Upload rejected: ${result.reason}`,
        });
      return result;
    }),
});
