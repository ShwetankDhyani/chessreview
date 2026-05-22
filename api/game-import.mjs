import { fetchPgnFromGameUrl } from "../server/gameUrlImport.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body ?? {};
    const url = body.url;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing url" });
    }
    const result = await fetchPgnFromGameUrl(url.trim());
    return res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    return res.status(400).json({ error: message });
  }
}
