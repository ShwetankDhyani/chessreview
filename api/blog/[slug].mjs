import { addBlogReply, getBlogPost } from "../server/blogApi.mjs";

function adminKey(req) {
  return (
    req.headers["x-admin-key"] ??
    String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
  ).trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") return res.status(204).end();

  const slug = req.query?.slug;
  if (!slug) return res.status(400).json({ error: "Missing slug" });

  try {
    if (req.method === "GET") {
      const data = await getBlogPost(String(slug), { adminKey: adminKey(req) });
      if (!data) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      // replies when ?replies=1
      if (req.query?.replies === "1") {
        const body =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
        const result = await addBlogReply(String(slug), body);
        return res.status(200).json(result);
      }
      return res.status(400).json({ error: "Unknown action" });
    }

    return res.status(405).json({ error: "GET or POST only" });
  } catch (e) {
    return res.status(400).json({
      error: e instanceof Error ? e.message : "Failed",
    });
  }
}
