/**
 * Re-infer country_code from stored browser timezone for events wrongly
 * stamped as US by the Vercel→engine relay (egress IP looked American).
 *
 * Usage on the Oracle engine server:
 *   node scripts/backfill-country-from-timezone.mjs
 *   node scripts/backfill-country-from-timezone.mjs --dry-run
 *
 * Stats file default: ./data/review-stats.json (or REVIEW_STATS_DIR).
 */

import {
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const STATS_FILE = join(DATA_DIR, "review-stats.json");
const dryRun = process.argv.includes("--dry-run");

/**
 * IANA timezone → ISO 3166-1 alpha-2.
 * Prefer unique zones; multi-country zones map to the primary/default territory.
 */
const TZ_TO_COUNTRY = {
  // India / South Asia
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP",
  "Asia/Dhaka": "BD",
  "Asia/Karachi": "PK",
  "Asia/Tashkent": "UZ",
  // SE Asia / East Asia
  "Asia/Bangkok": "TH",
  "Asia/Jakarta": "ID",
  "Asia/Makassar": "ID",
  "Asia/Jayapura": "ID",
  "Asia/Manila": "PH",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Singapore": "SG",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Saigon": "VN",
  "Asia/Hong_Kong": "HK",
  "Asia/Taipei": "TW",
  "Asia/Seoul": "KR",
  "Asia/Tokyo": "JP",
  "Asia/Shanghai": "CN",
  "Asia/Chongqing": "CN",
  "Asia/Harbin": "CN",
  "Asia/Urumqi": "CN",
  "Asia/Macau": "MO",
  // Middle East
  "Asia/Dubai": "AE",
  "Asia/Muscat": "OM",
  "Asia/Qatar": "QA",
  "Asia/Bahrain": "BH",
  "Asia/Kuwait": "KW",
  "Asia/Riyadh": "SA",
  "Asia/Baghdad": "IQ",
  "Asia/Tehran": "IR",
  "Asia/Jerusalem": "IL",
  "Asia/Tel_Aviv": "IL",
  "Asia/Amman": "JO",
  "Asia/Beirut": "LB",
  "Asia/Damascus": "SY",
  "Europe/Istanbul": "TR",
  "Asia/Istanbul": "TR",
  // Europe
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Lisbon": "PT",
  "Europe/Madrid": "ES",
  "Europe/Paris": "FR",
  "Europe/Brussels": "BE",
  "Europe/Amsterdam": "NL",
  "Europe/Berlin": "DE",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Rome": "IT",
  "Europe/Vatican": "VA",
  "Europe/San_Marino": "SM",
  "Europe/Malta": "MT",
  "Europe/Athens": "GR",
  "Europe/Bucharest": "RO",
  "Europe/Sofia": "BG",
  "Europe/Belgrade": "RS",
  "Europe/Zagreb": "HR",
  "Europe/Budapest": "HU",
  "Europe/Prague": "CZ",
  "Europe/Warsaw": "PL",
  "Europe/Kyiv": "UA",
  "Europe/Kiev": "UA",
  "Europe/Moscow": "RU",
  "Europe/Minsk": "BY",
  "Europe/Helsinki": "FI",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Riga": "LV",
  "Europe/Tallinn": "EE",
  "Europe/Vilnius": "LT",
  "Europe/Luxembourg": "LU",
  "Atlantic/Reykjavik": "IS",
  "Europe/Andorra": "AD",
  "Europe/Monaco": "MC",
  "Europe/Vaduz": "LI",
  // Africa
  "Africa/Cairo": "EG",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "Africa/Casablanca": "MA",
  "Africa/Accra": "GH",
  "Africa/Algiers": "DZ",
  "Africa/Tunis": "TN",
  "Africa/Addis_Ababa": "ET",
  // Americas — Canada / Mexico / LatAm (not US)
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/St_Johns": "CA",
  "America/Montreal": "CA",
  "America/Mexico_City": "MX",
  "America/Cancun": "MX",
  "America/Monterrey": "MX",
  "America/Tijuana": "MX",
  "America/Sao_Paulo": "BR",
  "America/Buenos_Aires": "AR",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Santiago": "CL",
  "America/Lima": "PE",
  "America/Bogota": "CO",
  "America/Caracas": "VE",
  "America/Guayaquil": "EC",
  "America/La_Paz": "BO",
  "America/Asuncion": "PY",
  "America/Montevideo": "UY",
  "America/Panama": "PA",
  "America/Costa_Rica": "CR",
  "America/Guatemala": "GT",
  "America/Havana": "CU",
  "America/Jamaica": "JM",
  "America/Puerto_Rico": "PR",
  // US (keep only when backfill would confirm US)
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "America/Honolulu": "US",
  "America/Detroit": "US",
  "America/Indiana/Indianapolis": "US",
  "Pacific/Honolulu": "US",
  // Oceania
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Pacific/Auckland": "NZ",
  "Pacific/Fiji": "FJ",
};

/** Locale tags that strongly imply a country (BCP 47 / navigator.language). */
function countryFromLocale(locale) {
  if (!locale || typeof locale !== "string") return null;
  const s = locale.trim().replace("_", "-");
  const m = s.match(/^[a-z]{2,3}-([A-Z]{2})\b/i);
  if (m) return m[1].toUpperCase();
  // bare language only is too weak (en, hi, etc.)
  return null;
}

function inferCountry(event) {
  const tz = event.timezone ? String(event.timezone).trim() : "";
  if (tz && TZ_TO_COUNTRY[tz]) return { country: TZ_TO_COUNTRY[tz], source: "timezone" };

  // Prefix fallbacks for unlisted but namespaced zones
  if (tz.startsWith("Asia/Kolkata") || tz === "Asia/Calcutta") {
    return { country: "IN", source: "timezone" };
  }
  if (tz.startsWith("Europe/") && !TZ_TO_COUNTRY[tz]) {
    // leave unset rather than guess wrong European country
  }

  const fromLocale = countryFromLocale(event.locale);
  if (fromLocale) return { country: fromLocale, source: "locale" };

  return { country: null, source: null };
}

function load() {
  if (!existsSync(STATS_FILE)) {
    console.error(`No stats file at ${STATS_FILE}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(STATS_FILE, "utf8"));
}

function save(state) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${STATS_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, STATS_FILE);
}

const state = load();
const events = Array.isArray(state.events) ? state.events : [];

let scanned = 0;
let corrected = 0;
let keptUs = 0;
let unknown = 0;
const byNew = new Map();

for (const e of events) {
  scanned += 1;
  const code = e.country_code ? String(e.country_code).toUpperCase() : null;
  // Only rewrite rows that look like the bad US stamp (or missing country).
  if (code && code !== "US") continue;

  const { country, source } = inferCountry(e);
  if (!country) {
    unknown += 1;
    continue;
  }

  if (country === "US") {
    keptUs += 1;
    continue;
  }

  const prev = code ?? "(null)";
  e.country_code = country;
  // City/region came from the US egress — drop them so admin doesn't show
  // "Ashburn, Virginia, India".
  e.city = null;
  e.region = null;
  e.latitude = null;
  e.longitude = null;
  e.geo_backfilled = source;
  corrected += 1;
  byNew.set(country, (byNew.get(country) ?? 0) + 1);
  console.log(
    `${dryRun ? "[dry-run] " : ""}${prev} → ${country} (${source}) tz=${e.timezone ?? "—"} locale=${e.locale ?? "—"}`
  );
}

console.log("\n--- Summary ---");
console.log(`File: ${STATS_FILE}`);
console.log(`Events scanned: ${scanned}`);
console.log(`Corrected off US: ${corrected}`);
console.log(`Confirmed US via tz/locale: ${keptUs}`);
console.log(`Still unknown (no usable tz/locale): ${unknown}`);
if (byNew.size) {
  console.log("New countries:");
  for (const [c, n] of [...byNew.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}: ${n}`);
  }
}

if (!dryRun && corrected > 0) {
  save(state);
  console.log("\nSaved. Restart is not required for file store — refresh /admin.");
} else if (dryRun) {
  console.log("\nDry run — no file written. Re-run without --dry-run to apply.");
} else {
  console.log("\nNothing to write.");
}
