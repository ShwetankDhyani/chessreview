import {
  getSiteSettings,
  setSiteSettings,
} from "../server/siteSettingsApi.mjs";

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

  try {
    if (req.method === "GET") {
      return res.status(200).json(await getSiteSettings());
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
      return res.status(200).json(await setSiteSettings(body, adminKey(req)));
    }

    return res.status(405).json({ error: "GET or POST only" });
  } catch (e) {
    const status = e?.status === 401 ? 401 : 400;
    return res.status(status).json({
      error: e instanceof Error ? e.message : "Failed",
    });
  }
}
