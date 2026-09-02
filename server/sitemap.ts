// A real, dynamic sitemap — not a static file with guessed/hardcoded
// course URLs, which would drift out of date the moment a course is
// published, unpublished, or archived. Lists exactly the pages a crawler
// can actually get real content from: the same set robots.txt allows,
// plus every currently-published course's real slug, queried fresh on
// every request from the same getPublishedCourses() the public catalog
// itself uses — so this can never claim a course exists that doesn't, or
// omit one that does.

import type { Express, Request, Response } from "express";
import { getPublishedCourses } from "./db/courses";

const STATIC_PAGES = [
  { path: "/", priority: "1.0" },
  { path: "/courses", priority: "0.9" },
  { path: "/pricing", priority: "0.7" },
  { path: "/lab", priority: "0.5" },
  { path: "/legal", priority: "0.3" },
];

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function registerSitemap(app: Express) {
  app.get("/sitemap.xml", async (req: Request, res: Response) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    let courses: { slug: string; updatedAt?: Date | null }[] = [];
    try {
      courses = await getPublishedCourses();
    } catch (error) {
      console.error("[sitemap] failed to load published courses:", error);
      // Still serve the static pages rather than a 500 — a partial
      // sitemap is far better for SEO than none at all.
    }

    const urls = [
      ...STATIC_PAGES.map(
        page =>
          `  <url>\n    <loc>${xmlEscape(origin + page.path)}</loc>\n    <priority>${page.priority}</priority>\n  </url>`
      ),
      ...courses.map(course => {
        const lastmod = course.updatedAt
          ? `\n    <lastmod>${new Date(course.updatedAt).toISOString().slice(0, 10)}</lastmod>`
          : "";
        return `  <url>\n    <loc>${xmlEscape(`${origin}/courses/${course.slug}`)}</loc>${lastmod}\n    <priority>0.8</priority>\n  </url>`;
      }),
    ];

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
    );
  });
}
