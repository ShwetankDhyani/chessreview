import {
  getSavedReview,
  listSavedReviews,
  removeSavedReview,
  saveSavedReview,
} from "../server/reviewSavesApi.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const platform = String(req.query?.platform ?? "").trim();
  const username = String(req.query?.username ?? "").trim();
  const id = String(req.query?.id ?? "").trim();

  if (req.method === "GET") {
    if (!platform || !username) {
      return res.status(400).json({ error: "Missing platform/username" });
    }
    try {
      const result = id
        ? await getSavedReview(id, platform, username)
        : await listSavedReviews(platform, username);
      return res.status(200).json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Saved reviews failed";
      const status = message === "Not found" ? 404 : 500;
      return res.status(status).json({ error: message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      const result = await saveSavedReview(body);
      return res.status(200).json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save review";
      return res.status(400).json({ error: message });
    }
  }

  if (req.method === "DELETE") {
    if (!platform || !username || !id) {
      return res.status(400).json({ error: "Missing id/platform/username" });
    }
    try {
      const result = await removeSavedReview(id, platform, username);
      return res.status(200).json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not delete review";
      const status = message === "Access denied" ? 403 : 400;
      return res.status(status).json({ error: message });
    }
  }

  return res.status(405).json({ error: "GET, POST, DELETE only" });
}
