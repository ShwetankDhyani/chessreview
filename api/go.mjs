/**
 * Lightweight affiliate click redirect: /go/:id → 302 to destination.
 * Logs productId + placement for measurement (console / future store).
 *
 * Hobby plan: one serverless function. Rewritten from /go/:id in vercel.json.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Minimal product map for the server (fallback URLs only). */
function loadCatalog() {
  try {
    // Prefer a tiny JSON snapshot if present; else hardcode Amazon fallbacks.
    const snap = join(__dirname, "../src/config/affiliateFallback.json");
    return JSON.parse(readFileSync(snap, "utf8"));
  } catch {
    return null;
  }
}

const TAG_US = process.env.VITE_AMAZON_TAG_US || process.env.AMAZON_TAG_US || "chessreview-20";
const TAG_IN = process.env.VITE_AMAZON_TAG_IN || process.env.AMAZON_TAG_IN || "chessreview-21";

const FALLBACKS = {
  "book-logical-chess": {
    us: `https://www.amazon.com/s?k=logical+chess+move+by+move&tag=${TAG_US}`,
    in: `https://www.amazon.in/s?k=logical+chess+move+by+move&tag=${TAG_IN}`,
  },
  "book-reassess-your-chess": {
    us: `https://www.amazon.com/s?k=how+to+reassess+your+chess&tag=${TAG_US}`,
    in: `https://www.amazon.in/s?k=how+to+reassess+your+chess&tag=${TAG_IN}`,
  },
  "book-silman-endgame": {
    us: `https://www.amazon.com/s?k=silman+complete+endgame+course&tag=${TAG_US}`,
    in: `https://www.amazon.in/s?k=silman+complete+endgame+course&tag=${TAG_IN}`,
  },
  "dgt-clock": {
    us: `https://www.amazon.com/s?k=dgt+chess+clock&tag=${TAG_US}`,
    in: `https://www.amazon.in/s?k=dgt+chess+clock&tag=${TAG_IN}`,
  },
  "tournament-board": {
    us: `https://www.amazon.com/s?k=tournament+chess+set&tag=${TAG_US}`,
    in: `https://www.amazon.in/s?k=tournament+chess+set&tag=${TAG_IN}`,
  },
  "chessable-opening-fundamentals": {
    us: "https://www.chessable.com/opening-fundamentals/course/21302/",
    in: "https://www.chessable.com/opening-fundamentals/course/21302/",
  },
  "chessable-london-system": {
    us: "https://www.chessable.com/the-london-system/course/10276/",
    in: "https://www.chessable.com/the-london-system/course/10276/",
  },
  "chessable-woodpecker": {
    us: "https://www.chessable.com/the-woodpecker-method/course/23916/",
    in: "https://www.chessable.com/the-woodpecker-method/course/23916/",
  },
  "chessable-100-endgames": {
    us: "https://www.chessable.com/100-endgames-you-must-know/course/17609/",
    in: "https://www.chessable.com/100-endgames-you-must-know/course/17609/",
  },
  "chessmood-openings": {
    us: "https://chessmood.com/",
    in: "https://chessmood.com/",
  },
  "chessmood-strategy": {
    us: "https://chessmood.com/",
    in: "https://chessmood.com/",
  },
  "chesscom-membership": {
    us: "https://www.chess.com/membership",
    in: "https://www.chess.com/membership",
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET only" });
  }

  const id = String(req.query?.id || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
  const placement = String(req.query?.placement || "unknown").slice(0, 64);
  const store = String(req.query?.store || "US").toUpperCase() === "IN" ? "in" : "us";

  if (!id) {
    return res.status(400).json({ error: "Missing product id" });
  }

  const snap = loadCatalog();
  const entry = (snap && snap[id]) || FALLBACKS[id];
  if (!entry) {
    return res.status(404).json({ error: "Unknown product" });
  }

  const dest = typeof entry === "string" ? entry : entry[store] || entry.us;
  if (!dest || !/^https:\/\//i.test(dest)) {
    return res.status(500).json({ error: "Invalid destination" });
  }

  // Measurement hook — visible in Vercel function logs
  console.log(
    JSON.stringify({
      type: "affiliate_click",
      productId: id,
      placement,
      store,
      ts: new Date().toISOString(),
    })
  );

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  return res.redirect(302, dest);
}
