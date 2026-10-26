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

export const TAG_EU =
  process.env.AMAZON_TAG_EU ||
  process.env.VITE_AMAZON_TAG_EU ||
  "chessreview04-21";

/** Prefer /dp/ASIN across stores (verify EU listing per ASIN). */
export const AMAZON_ASINS = {
  "book-logical-chess": "0713484640",
  "book-reassess-your-chess": "1890085138",
  "book-silman-endgame": "1890085146",
  "book-bobby-fischer": "0553263153",
  "book-woodpecker": "9056918081",
  "dgt-clock": "B00J48M9TC",
  "tournament-board": "B0009A4E7O",
  "wooden-chess-set": "B01N5UOYC6",
};

/** Search fallback when ASIN missing */
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
  "chessable-opening-fundamentals":
    "https://www.chessable.com/opening-fundamentals/course/21302/",
  "chessable-london-system":
    "https://www.chessable.com/the-london-system/course/10276/",
  "chessable-woodpecker":
    "https://www.chessable.com/the-woodpecker-method/course/23916/",
  "chessable-100-endgames":
    "https://www.chessable.com/100-endgames-you-must-know/course/17609/",
  "chessmood-openings": "https://chessmood.com/",
  "chessmood-strategy": "https://chessmood.com/",
  "chesscom-membership": "https://www.chess.com/membership",
};

const STORE_DOMAINS = {
  us: { domain: "amazon.com", tag: () => TAG_US },
  in: { domain: "amazon.in", tag: () => TAG_IN },
  de: { domain: "amazon.de", tag: () => TAG_EU },
  uk: { domain: "amazon.co.uk", tag: () => TAG_EU },
  fr: { domain: "amazon.fr", tag: () => TAG_EU },
  it: { domain: "amazon.it", tag: () => TAG_EU },
  es: { domain: "amazon.es", tag: () => TAG_EU },
};

const EU_COUNTRY_TO_STORE = {
  DE: "de",
  AT: "de",
  CH: "de",
  GB: "uk",
  UK: "uk",
  FR: "fr",
  IT: "it",
  ES: "es",
  // Same EU Associates tag; route marketplace to .de
  NL: "de",
  BE: "de",
  LU: "de",
  PL: "de",
  SE: "de",
  DK: "de",
  FI: "de",
  IE: "de",
  PT: "de",
  CZ: "de",
  SK: "de",
  HU: "de",
  RO: "de",
  BG: "de",
  HR: "de",
  SI: "de",
  EE: "de",
  LV: "de",
  LT: "de",
  MT: "de",
  CY: "de",
  GR: "de",
};

/**
 * Normalize store query / IP country to us|in|de|uk|fr|it|es
 */
export function normalizeStore(storeParam = "", countryHeader = "") {
  const raw = String(storeParam || "").toUpperCase();
  const map = {
    US: "us",
    IN: "in",
    DE: "de",
    UK: "uk",
    GB: "uk",
    FR: "fr",
    IT: "it",
    ES: "es",
  };
  if (map[raw]) return map[raw];

  const cc = String(countryHeader || "").toUpperCase();
  if (cc === "IN") return "in";
  if (EU_COUNTRY_TO_STORE[cc]) return EU_COUNTRY_TO_STORE[cc];
  return "us";
}

/**
 * Resolves a product ID and target store into the final destination URL
 * with appropriate affiliate tracking tags.
 */
export function resolveAffiliateDestination(id, store = "us") {
  const key = String(store || "us").toLowerCase();
  const conf = STORE_DOMAINS[key] || STORE_DOMAINS.us;
  const domain = conf.domain;
  const tag = conf.tag();

  if (DIRECT_URLS[id]) {
    return DIRECT_URLS[id];
  }

  if (AMAZON_ASINS[id]) {
    return `https://www.${domain}/dp/${AMAZON_ASINS[id]}?tag=${tag}`;
  }

  if (AMAZON_QUERIES[id]) {
    const q = encodeURIComponent(AMAZON_QUERIES[id]);
    return `https://www.${domain}/s?k=${q}&tag=${tag}`;
  }

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
  const storeParam = String(req.query?.store || "");
  const store = normalizeStore(storeParam, countryHeader);

  const dest = resolveAffiliateDestination(id, store);

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
