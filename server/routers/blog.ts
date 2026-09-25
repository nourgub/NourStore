import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure } from "../_core/procedures";
import {
  getPublishedBlogPosts,
  getBlogPostBySlug,
  getAllBlogPostsForAdmin,
  createBlogPost,
  updateBlogPost,
  setBlogPostPublished,
  deleteBlogPost,
} from "../db";

const postFields = {
  titleAr: z.string().min(2).max(255),
  titleFr: z.string().min(2).max(255),
  titleEn: z.string().min(2).max(255),
  excerptAr: z.string().min(2).max(500),
  excerptFr: z.string().min(2).max(500),
  excerptEn: z.string().min(2).max(500),
  contentAr: z.string().min(2),
  contentFr: z.string().min(2),
  contentEn: z.string().min(2),
};

export const blogRouter = router({
  // Public — organic-search content, no auth needed.
  posts: publicProcedure.query(() => getPublishedBlogPosts()),
  post: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ input }) => {
      const post = await getBlogPostBySlug(input.slug);
      if (!post)
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      return post;
    }),

  // Admin-only authoring, mirroring badges/coupons.
  adminPosts: adminProcedure.query(() => getAllBlogPostsForAdmin()),
  createPost: adminProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(2)
          .max(120)
          .regex(/^[a-z0-9-]+$/),
        ...postFields,
      })
    )
    .mutation(({ input }) => createBlogPost(input)),
  updatePost: adminProcedure
    .input(z.object({ id: z.number().int().positive(), ...postFields }))
    .mutation(({ input: { id, ...rest } }) => updateBlogPost(id, rest)),
  setPostPublished: adminProcedure
    .input(
      z.object({ id: z.number().int().positive(), isPublished: z.boolean() })
    )
    .mutation(({ input }) => setBlogPostPublished(input.id, input.isPublished)),
  deletePost: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteBlogPost(input.id)),
});
