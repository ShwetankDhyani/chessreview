/**
 * Lightweight affiliate click redirect: /go/:id → 302 to destination.
 * Logs productId + placement for measurement (console / future store).
 *
 * Hobby plan: one serverless function. Rewritten from /go/:id in vercel.json.
 */

export const TAG_US =
  process.env.AMAZON_TAG_US ||
  process.env.VITE_AMAZON_TAG_US ||
  "chessreview-20";

export const TAG_IN =
  process.env.AMAZON_TAG_IN ||
  process.env.VITE_AMAZON_TAG_IN ||
  "chessreview-21";

/** Amazon search queries mapped to product IDs */
export const AMAZON_QUERIES = {
  "book-logical-chess": "logical chess move by move",
  "book-reassess-your-chess": "how to reassess your chess",
  "book-silman-endgame": "silman complete endgame course",
  "dgt-clock": "dgt chess clock",
  "tournament-board": "tournament chess set",
  "wooden-chess-set": "staunton wooden chess set weighted",
  "book-woodpecker": "the woodpecker method chess",
  "book-bobby-fischer": "bobby fischer teaches chess",
};

/** Direct affiliate or partner destination URLs */
export const DIRECT_URLS = {
  "chessable-opening-fundamentals": "https://www.chessable.com/opening-fundamentals/course/21302/",
  "chessable-london-system": "https://www.chessable.com/the-london-system/course/10276/",
  "chessable-woodpecker": "https://www.chessable.com/the-woodpecker-method/course/23916/",
  "chessable-100-endgames": "https://www.chessable.com/100-endgames-you-must-know/course/17609/",
  "chessmood-openings": "https://chessmood.com/",
  "chessmood-strategy": "https://chessmood.com/",
  "chesscom-membership": "https://www.chess.com/membership",
};

/**
 * Resolves a product ID and target store into the final destination URL
 * with appropriate affiliate tracking tags.
 */
export function resolveAffiliateDestination(id, store = "us") {
  const isIndia = String(store).toLowerCase() === "in";
  const domain = isIndia ? "amazon.in" : "amazon.com";
  const tag = isIndia ? TAG_IN : TAG_US;

  // 1. Direct partner URLs
  if (DIRECT_URLS[id]) {
    return DIRECT_URLS[id];
  }

  // 2. Known Amazon catalog item
  if (AMAZON_QUERIES[id]) {
    const q = encodeURIComponent(AMAZON_QUERIES[id]);
    return `https://www.${domain}/s?k=${q}&tag=${tag}`;
  }

  // 3. Resilient fallback: sanitize ID into a search term so no valid link ever 404s
  const sanitized = id
    .replace(/^(book-|chess-)/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const query = sanitized.length > 2 ? `${sanitized} chess` : "chess books";
  return `https://www.${domain}/s?k=${encodeURIComponent(query)}&tag=${tag}`;
}

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

  if (!id) {
    return res.status(400).json({ error: "Missing product id" });
  }

  const countryHeader = String(
    req.headers?.["x-vercel-ip-country"] ||
    req.headers?.["cf-ipcountry"] ||
    ""
  ).toUpperCase();
  const storeParam = String(req.query?.store || "").toUpperCase();
  const isIndia = storeParam === "IN" || (!storeParam && countryHeader === "IN");
  const store = isIndia ? "in" : "us";

  const dest = resolveAffiliateDestination(id, store);

  // Measurement hook — visible in Vercel function logs
  console.log(
    JSON.stringify({
      type: "affiliate_click",
      productId: id,
      placement,
      store,
      dest,
      ts: new Date().toISOString(),
    })
  );

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  return res.redirect(302, dest);
}
