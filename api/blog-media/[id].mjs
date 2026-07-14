import { readBlogMedia } from "../../server/blogApi.mjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).end("GET only");

  const id = req.query?.id;
  if (!id) return res.status(400).end("Missing id");

  try {
    const file = await readBlogMedia(String(id));
    if (!file) return res.status(404).end("Not found");
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(file.buffer);
  } catch {
    return res.status(500).end("Error");
  }
}
