/**
 * Dynamic sitemap.xml — static routes + published blog posts.
 * Served at /sitemap.xml via Vercel rewrite.
 */

import { listBlogPosts } from "../server/blogApi.mjs";

const SITE_ORIGIN = "https://www.chessreview.org";

const STATIC_URLS = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

function isoDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(changefreq)}</changefreq>
    <priority>${escapeXml(priority)}</priority>
  </url>`;
}

export default async function handler(req, res) {
  if (req.method === "HEAD" || req.method === "GET") {
    try {
      const staticEntries = STATIC_URLS.map((u) =>
        urlEntry({
          loc: `${SITE_ORIGIN}${u.path === "/" ? "/" : u.path}`,
          lastmod: isoDate(null),
          changefreq: u.changefreq,
          priority: u.priority,
        })
      );

      let blogEntries = [];
      try {
        const data = await listBlogPosts({ includeDrafts: false });
        const posts = Array.isArray(data?.posts) ? data.posts : [];
        blogEntries = posts
          .filter((p) => p?.published !== false && p?.slug)
          .map((p) =>
            urlEntry({
              loc: `${SITE_ORIGIN}/blog/${encodeURIComponent(p.slug)}`,
              lastmod: isoDate(p.updatedAt || p.createdAt),
              changefreq: "monthly",
              priority: "0.7",
            })
          );
      } catch {
        blogEntries = [];
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...blogEntries].join("\n")}
</urlset>
`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600");
      if (req.method === "HEAD") return res.status(200).end();
      return res.status(200).send(xml);
    } catch (e) {
      return res.status(500).send(
        e instanceof Error ? e.message : "Sitemap failed"
      );
    }
  }

  return res.status(405).send("GET only");
}
