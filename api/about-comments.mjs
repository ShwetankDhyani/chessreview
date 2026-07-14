import {
  createAboutComment,
  listAboutComments,
} from "../server/aboutCommentsApi.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    try {
      const page = parseInt(String(req.query?.page ?? "1"), 10);
      const pageSize = parseInt(String(req.query?.pageSize ?? "8"), 10);
      const data = await listAboutComments({ page, pageSize });
      return res.status(200).json(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed";
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      const result = await createAboutComment(body);
      return res.status(200).json({ ok: true, ...result });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed";
      return res.status(400).json({ error: message });
    }
  }

  return res.status(405).json({ error: "GET or POST only" });
}
