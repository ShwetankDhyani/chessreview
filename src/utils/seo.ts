/** Canonical site URL — keep in sync with public/sitemap.xml and robots.txt */
export const SITE_ORIGIN = "https://www.chessreview.org";
export const SITE_NAME = "ChessReview";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

export const DEFAULT_SEO = {
  title: "ChessReview — Free Chess Game Review & Engine Analysis",
  description:
    "Review chess games for free. Import from Lichess or Chess.com for move classifications, accuracy scores, eval charts, and Stockfish-powered analysis.",
} as const;

export interface PageSeoOptions {
  title?: string;
  description?: string;
  /** Path only, e.g. `/privacy` or `/r/abc123` */
  path?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

function upsertMeta(
  selector: string,
  attrs: Record<string, string>,
  content: string
) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeAllJsonLd() {
  document
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((el) => el.remove());
}

function removePageJsonLd() {
  document
    .querySelectorAll('[id^="cr-page-jsonld"]')
    .forEach((el) => el.remove());
}

function injectJsonLd(id: string, data: Record<string, unknown>) {
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/** Home-page structured data — keep in sync with index.html `#cr-home-jsonld`. */
export function homeJsonLdGraph(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        description:
          "Free chess game review with engine analysis, move classifications, and accuracy scores.",
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_ORIGIN}/#app`,
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description: DEFAULT_SEO.description,
        featureList: [
          "Chess game review",
          "Move classification",
          "Accuracy scores",
          "Stockfish engine analysis",
          "Lichess and Chess.com import",
        ],
      },
    ],
  };
}

export function restoreHomeJsonLd(): void {
  if (typeof document === "undefined") return;
  removeAllJsonLd();
  injectJsonLd("cr-home-jsonld", homeJsonLdGraph());
}

/** Update document title, meta, Open Graph, Twitter, and canonical URL. */
export function applyPageSeo(options: PageSeoOptions = {}): void {
  if (typeof document === "undefined") return;

  const title = options.title ?? DEFAULT_SEO.title;
  const description = options.description ?? DEFAULT_SEO.description;
  const path = options.path ?? window.location.pathname;
  const canonical = `${SITE_ORIGIN}${path === "/" ? "" : path}`;
  const ogType = options.ogType ?? "website";
  const ogImage = options.ogImage ?? DEFAULT_OG_IMAGE;
  const robots = options.noindex ? "noindex, nofollow" : "index, follow";

  document.title = title;

  upsertMeta('meta[name="description"]', { name: "description" }, description);
  upsertMeta('meta[name="robots"]', { name: "robots" }, robots);
  upsertMeta(
    'meta[property="og:title"]',
    { property: "og:title" },
    title
  );
  upsertMeta(
    'meta[property="og:description"]',
    { property: "og:description" },
    description
  );
  upsertMeta('meta[property="og:type"]', { property: "og:type" }, ogType);
  upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, SITE_NAME);
  upsertMeta('meta[property="og:image"]', { property: "og:image" }, ogImage);
  upsertMeta('meta[property="og:image:width"]', { property: "og:image:width" }, "1200");
  upsertMeta('meta[property="og:image:height"]', { property: "og:image:height" }, "630");
  upsertMeta(
    'meta[property="og:image:alt"]',
    { property: "og:image:alt" },
    "ChessReview — free chess game review and analysis"
  );
  upsertMeta('meta[property="og:locale"]', { property: "og:locale" }, "en_US");

  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, ogImage);

  upsertLink("canonical", canonical);

  removePageJsonLd();
  if (options.jsonLd) {
    removeAllJsonLd();
    const blocks = Array.isArray(options.jsonLd)
      ? options.jsonLd
      : [options.jsonLd];
    blocks.forEach((block, i) => {
      injectJsonLd(`cr-page-jsonld-${i}`, block);
    });
  }
}

export function homeJsonLd(): Array<Record<string, unknown>> {
  return [homeJsonLdGraph()];
}

export function shareReviewJsonLd(input: {
  id: string;
  whiteName: string;
  blackName: string;
  whiteAccuracy?: number;
  blackAccuracy?: number;
}): Record<string, unknown> {
  const title = `${input.whiteName} vs ${input.blackName}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${title} — Chess Game Review`,
    url: `${SITE_ORIGIN}/r/${input.id}`,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    description:
      input.whiteAccuracy != null && input.blackAccuracy != null
        ? `Shared review: ${title}. Accuracy ${input.whiteAccuracy.toFixed(0)}% vs ${input.blackAccuracy.toFixed(0)}%.`
        : `Shared chess game review for ${title}.`,
  };
}

export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
