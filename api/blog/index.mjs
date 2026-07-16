/**
 * Unified blog API — list, post-by-slug, media, sitemap, crawler HTML.
 * Keeps Hobby serverless function count under the 12-function limit.
 */

import {
  addBlogReply,
  createBlogPost,
  deleteBlogPost,
  deleteBlogReply,
  getBlogPost,
  listBlogPosts,
  readBlogMedia,
  updateBlogPost,
  uploadBlogMedia,
} from "../../server/blogApi.mjs";
import { blogListHtml, blogPostHtml } from "../../server/blogCrawlerHtml.mjs";
import { buildSitemapXml } from "../../server/sitemapXml.mjs";

function adminKey(req) {
  return (
    req.headers["x-admin-key"] ??
    String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
  ).trim();
}

function expectedAdmin() {
  return (process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY ?? "").trim();
}

function wantsHtml(req) {
  return (
    req.query?.format === "html" ||
    String(req.query?.preview ?? "") === "1"
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") return res.status(204).end();

  // Sitemap (rewrite from /sitemap.xml and /api/sitemap)
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    (req.query?.sitemap === "1" || req.query?.resource === "sitemap")
  ) {
    try {
      const xml = await buildSitemapXml();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600");
      if (req.method === "HEAD") return res.status(200).end();
      return res.status(200).send(xml);
    } catch (e) {
      return res
        .status(500)
        .send(e instanceof Error ? e.message : "Sitemap failed");
    }
  }

  // Blog media (rewrite from /api/blog-media/:id)
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    req.query?.media
  ) {
    try {
      const file = await readBlogMedia(String(req.query.media));
      if (!file) return res.status(404).end("Not found");
      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (req.method === "HEAD") return res.status(200).end();
      return res.status(200).send(file.buffer);
    } catch {
      return res.status(500).end("Error");
    }
  }

  const slug = req.query?.slug ? String(req.query.slug).trim() : "";

  try {
    // Single post (rewrite from /api/blog/:slug)
    if (slug && (req.method === "GET" || req.method === "HEAD")) {
      const data = await getBlogPost(slug, { adminKey: adminKey(req) });
      if (!data) {
        if (wantsHtml(req)) {
          if (req.method === "HEAD") return res.status(404).end();
          return res.status(404).send("Not found");
        }
        return res.status(404).json({ error: "Not found" });
      }
      if (wantsHtml(req)) {
        const post = data.post ?? data;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        if (req.method === "HEAD") return res.status(200).end();
        return res.status(200).send(blogPostHtml(post));
      }
      if (req.method === "HEAD") return res.status(200).end();
      return res.status(200).json(data);
    }

    if (slug && req.method === "POST" && req.query?.replies === "1") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      const result = await addBlogReply(slug, body, {
        adminKey: adminKey(req),
      });
      return res.status(200).json(result);
    }

    if (req.method === "GET" || req.method === "HEAD") {
      const drafts = req.query?.drafts === "1";
      const key = adminKey(req);
      if (drafts && key !== expectedAdmin()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const data = await listBlogPosts({ includeDrafts: drafts, adminKey: key });

      if (wantsHtml(req)) {
        const posts = Array.isArray(data?.posts) ? data.posts : [];
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        if (req.method === "HEAD") return res.status(200).end();
        return res.status(200).send(blogListHtml(posts));
      }

      if (req.method === "HEAD") return res.status(200).end();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      if (body.action === "reply") {
        const replySlug = String(body.slug ?? slug ?? "").trim();
        if (!replySlug) return res.status(400).json({ error: "Missing slug" });
        return res
          .status(200)
          .json(await addBlogReply(replySlug, body, { adminKey: adminKey(req) }));
      }
      if (body.action === "delete-reply") {
        const replySlug = String(body.slug ?? slug ?? "").trim();
        if (!replySlug) return res.status(400).json({ error: "Missing slug" });
        return res
          .status(200)
          .json(
            await deleteBlogReply(replySlug, body, { adminKey: adminKey(req) })
          );
      }
      const key = adminKey(req);
      if (key !== expectedAdmin()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (body.action === "upload") {
        return res.status(200).json(await uploadBlogMedia(body, key));
      }
      if (body.action === "update") {
        return res.status(200).json(await updateBlogPost(body, key));
      }
      if (body.action === "delete") {
        return res.status(200).json(await deleteBlogPost(body.id, key));
      }
      return res.status(200).json(await createBlogPost(body, key));
    }

    return res.status(405).json({ error: "GET or POST only" });
  } catch (e) {
    return res.status(400).json({
      error: e instanceof Error ? e.message : "Failed",
    });
  }
}
