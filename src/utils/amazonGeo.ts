/**
 * Geo-aware Amazon affiliate URL generation
 *
 * Detects visitor store from browser timezone + language only
 * (no external APIs). sessionStorage caches the choice for the session.
 *
 * Stores:
 * - US  → amazon.com   tag chessreview-20
 * - IN  → amazon.in    tag chessreview-21
 * - DE/UK/FR/IT/ES → EU Associates tag chessreview04-21
 *   (.nl / .pl / .se earn under the same EU account; other EU timezones
 *    fall back to amazon.de)
 */

export const AMAZON_TAGS = {
  US: import.meta.env.VITE_AMAZON_TAG_US || "chessreview-20",
  IN: import.meta.env.VITE_AMAZON_TAG_IN || "chessreview-21",
  EU: import.meta.env.VITE_AMAZON_TAG_EU || "chessreview04-21",
} as const;

export type AmazonStore = "US" | "IN" | "DE" | "UK" | "FR" | "IT" | "ES";

export interface AmazonStoreConfig {
  domain: string;
  tag: string;
}

const AMAZON_STORES: Record<AmazonStore, AmazonStoreConfig> = {
  US: { domain: "amazon.com", tag: AMAZON_TAGS.US },
  IN: { domain: "amazon.in", tag: AMAZON_TAGS.IN },
  DE: { domain: "amazon.de", tag: AMAZON_TAGS.EU },
  UK: { domain: "amazon.co.uk", tag: AMAZON_TAGS.EU },
  FR: { domain: "amazon.fr", tag: AMAZON_TAGS.EU },
  IT: { domain: "amazon.it", tag: AMAZON_TAGS.EU },
  ES: { domain: "amazon.es", tag: AMAZON_TAGS.EU },
};

const VALID_STORES = new Set<string>(Object.keys(AMAZON_STORES));

const STORAGE_KEY = "amazon_store";

/** German-speaking / DACH timezones → amazon.de */
const DE_TIMEZONES = new Set([
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Zurich",
  "Europe/Busingen",
]);

/** Other European timezones that fall back to amazon.de (NL/PL/SE earn via EU tag) */
const EU_FALLBACK_DE_TIMEZONES = new Set([
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Luxembourg",
  "Europe/Warsaw",
  "Europe/Stockholm",
  "Europe/Copenhagen",
  "Europe/Oslo",
  "Europe/Helsinki",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Athens",
  "Europe/Bucharest",
  "Europe/Budapest",
  "Europe/Prague",
  "Europe/Bratislava",
  "Europe/Sofia",
  "Europe/Zagreb",
  "Europe/Belgrade",
  "Europe/Ljubljana",
  "Europe/Sarajevo",
  "Europe/Skopje",
  "Europe/Tirane",
  "Europe/Podgorica",
  "Europe/Riga",
  "Europe/Tallinn",
  "Europe/Vilnius",
  "Europe/Malta",
  "Europe/Nicosia",
  "Europe/Andorra",
  "Europe/Monaco",
  "Europe/San_Marino",
  "Europe/Vatican",
  "Europe/Isle_of_Man",
  "Europe/Jersey",
  "Europe/Guernsey",
  "Atlantic/Reykjavik",
  "Atlantic/Faroe",
  "Arctic/Longyearbyen",
]);

/**
 * Pure detector for tests and callers that supply timezone + language.
 * Order: India → specific EU locales → other EU → US default.
 */
export function detectAmazonStoreFromSignals(
  timezone: string,
  language: string
): AmazonStore {
  const tz = timezone || "";
  const lang = (language || "").toLowerCase();

  // India (timezone, then language)
  if (
    tz === "Asia/Kolkata" ||
    tz === "Asia/Calcutta" ||
    tz.startsWith("Asia/Kolkata") ||
    tz.startsWith("Asia/Calcutta")
  ) {
    return "IN";
  }
  if (lang === "hi" || lang === "hi-in" || lang.startsWith("hi-")) {
    return "IN";
  }

  // Specific EU timezones first (win over language from another locale)
  if (
    tz === "Europe/Berlin" ||
    tz === "Europe/Vienna" ||
    tz === "Europe/Zurich" ||
    DE_TIMEZONES.has(tz)
  ) {
    return "DE";
  }
  if (tz === "Europe/London") {
    return "UK";
  }
  if (tz === "Europe/Paris") {
    return "FR";
  }
  if (tz === "Europe/Rome") {
    return "IT";
  }
  if (tz === "Europe/Madrid") {
    return "ES";
  }

  // Language hints when timezone is not EU-specific
  if (lang === "de" || lang.startsWith("de-")) {
    return "DE";
  }
  if (lang === "en-gb") {
    return "UK";
  }
  if (lang === "fr" || lang.startsWith("fr-")) {
    return "FR";
  }
  if (lang === "it" || lang.startsWith("it-")) {
    return "IT";
  }
  if (lang === "es-es") {
    return "ES";
  }

  // Remaining European timezones → amazon.de (.nl/.pl/.se etc.)
  if (tz.startsWith("Europe/") || EU_FALLBACK_DE_TIMEZONES.has(tz)) {
    return "DE";
  }

  return "US";
}

/**
 * Detect store from the browser. Caches in sessionStorage (no layout shift:
 * callers should render a stable default URL first if needed; this is sync).
 */
export function detectUserCountry(): AmazonStore {
  if (typeof window === "undefined") {
    return "US";
  }

  try {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached && VALID_STORES.has(cached)) {
      return cached as AmazonStore;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const language = navigator.language || "";
    const store = detectAmazonStoreFromSignals(timezone, language);
    sessionStorage.setItem(STORAGE_KEY, store);
    return store;
  } catch {
    return "US";
  }
}

/** @deprecated Prefer detectUserCountry / detectAmazonStoreFromSignals */
export const detectAmazonStore = detectUserCountry;

function normalizeAsinOrPath(queryOrAsin: string): {
  kind: "search" | "dp";
  value: string;
} {
  const raw = queryOrAsin.trim();
  const dpMatch = raw.match(/\/dp\/([A-Z0-9]{8,12})/i);
  if (dpMatch) {
    return { kind: "dp", value: dpMatch[1]!.toUpperCase() };
  }
  // Bare ASIN
  if (/^[A-Z0-9]{10}$/i.test(raw)) {
    return { kind: "dp", value: raw.toUpperCase() };
  }
  return { kind: "search", value: raw };
}

/**
 * Build a store URL. Prefer `/dp/ASIN?tag=` when an ASIN (or /dp/ASIN path)
 * is provided; otherwise search `?k=…&tag=`.
 */
export function getAmazonUrl(
  queryOrAsin: string,
  store?: AmazonStore
): string {
  const targetStore = store || detectUserCountry();
  const config = AMAZON_STORES[targetStore];
  const parsed = normalizeAsinOrPath(queryOrAsin);

  if (parsed.kind === "dp") {
    return `https://www.${config.domain}/dp/${parsed.value}?tag=${config.tag}`;
  }

  const searchQuery = encodeURIComponent(parsed.value);
  return `https://www.${config.domain}/s?k=${searchQuery}&tag=${config.tag}`;
}

/** Explicit product URL helper (always /dp/ASIN form). */
export function getAmazonDpUrl(asin: string, store?: AmazonStore): string {
  return getAmazonUrl(`/dp/${asin}`, store);
}

export function getAmazonStore(): AmazonStoreConfig {
  return AMAZON_STORES[detectUserCountry()];
}

export function getAmazonStoreConfig(store: AmazonStore): AmazonStoreConfig {
  return AMAZON_STORES[store];
}

export function getLocalizedQuery(
  baseQuery: string,
  _store: AmazonStore
): string {
  return baseQuery;
}

/** Exported for tests / server alignment */
export { AMAZON_STORES, VALID_STORES };
