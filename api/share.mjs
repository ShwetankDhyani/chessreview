import { createShare, getShare } from "../server/reviewSharesApi.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "Missing id" });
    try {
      const row = await getShare(String(id));
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(row);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Share failed";
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      const result = await createShare(body);
      return res.status(200).json({ ok: true, ...result });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Share failed";
      return res.status(400).json({ error: message });
    }
  }

  return res.status(405).json({ error: "GET or POST only" });
}
