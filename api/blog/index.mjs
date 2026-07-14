import {
  addBlogReply,
  createBlogPost,
  deleteBlogPost,
  getBlogPost,
  listBlogPosts,
  updateBlogPost,
  uploadBlogMedia,
} from "../../server/blogApi.mjs";

function adminKey(req) {
  return (
    req.headers["x-admin-key"] ??
    String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
  ).trim();
}

function expectedAdmin() {
  return (process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY ?? "").trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const drafts = req.query?.drafts === "1";
      const key = adminKey(req);
      if (drafts && key !== expectedAdmin()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const data = await listBlogPosts({ includeDrafts: drafts, adminKey: key });
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      // Public replies use the stable /api/blog route (dynamic /api/blog/:slug is easy to miss).
      if (body.action === "reply") {
        const slug = String(body.slug ?? "").trim();
        if (!slug) return res.status(400).json({ error: "Missing slug" });
        return res.status(200).json(await addBlogReply(slug, body));
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
