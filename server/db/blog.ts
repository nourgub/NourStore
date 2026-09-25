import { desc, eq } from "drizzle-orm";
import { blogPosts } from "../../drizzle/schema";
import { getDb } from "./shared";

export async function getAllBlogPostsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

export async function getPublishedBlogPosts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      titleAr: blogPosts.titleAr,
      titleFr: blogPosts.titleFr,
      titleEn: blogPosts.titleEn,
      excerptAr: blogPosts.excerptAr,
      excerptFr: blogPosts.excerptFr,
      excerptEn: blogPosts.excerptEn,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, 1))
    .orderBy(desc(blogPosts.publishedAt));
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  const post = rows[0];
  // Never returns an unpublished post through the public path, regardless
  // of whether the slug is guessed correctly — same posture as courses.
  if (!post || !post.isPublished) return undefined;
  return post;
}

export async function createBlogPost(input: {
  slug: string;
  titleAr: string;
  titleFr: string;
  titleEn: string;
  excerptAr: string;
  excerptFr: string;
  excerptEn: string;
  contentAr: string;
  contentFr: string;
  contentEn: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(blogPosts).values(input);
}

export async function updateBlogPost(
  id: number,
  input: {
    titleAr: string;
    titleFr: string;
    titleEn: string;
    excerptAr: string;
    excerptFr: string;
    excerptEn: string;
    contentAr: string;
    contentFr: string;
    contentEn: string;
  }
) {
  const db = await getDb();
  if (!db) return false;
  await db.update(blogPosts).set(input).where(eq(blogPosts.id, id));
  return true;
}

export async function setBlogPostPublished(id: number, isPublished: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(blogPosts)
    .set({
      isPublished: isPublished ? 1 : 0,
      // Refreshed on every publish (including a re-publish after being
      // unpublished) — the public listing sorts by this, so a post an
      // admin brings back stays visible near the top rather than under
      // its original, possibly old, date.
      ...(isPublished ? { publishedAt: new Date() } : {}),
    })
    .where(eq(blogPosts.id, id));
  return true;
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return true;
}
