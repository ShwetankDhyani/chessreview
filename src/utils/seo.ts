/** Canonical site URL — keep in sync with /sitemap.xml and robots.txt */
export const SITE_ORIGIN = "https://www.chessreview.org";
export const SITE_NAME = "ChessReview";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

/**
 * Primary English SEO copy for free chess game review / analysis queries.
 */
export const DEFAULT_SEO = {
  title: "ChessReview — Free Chess Game Analysis Online (No Sign-up)",
  description:
    "Free online chess game review for club players and enthusiasts. Import a Chess.com or Lichess game, or paste a PGN, and get clear move ratings, accuracy scores, and Stockfish analysis — no subscription.",
} as const;

export const HOME_OG_DESCRIPTION =
  "Paste a Chess.com or Lichess link. Get readable move ratings, accuracy, an eval graph, and engine lines — free for amateur and club players.";

export interface PageSeoOptions {
  title?: string;
  description?: string;
  /** Path only, e.g. `/privacy` or `/r/abc123` */
  path?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** Optional article timestamps for blog posts */
  articlePublished?: string;
  articleModified?: string;
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

function upsertLink(rel: string, href: string, hrefLang?: string) {
  if (typeof document === "undefined") return;
  const selector = hrefLang
    ? `link[rel="${rel}"][hreflang="${hrefLang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hrefLang) el.setAttribute("hreflang", hrefLang);
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

export const HOME_FAQ = [
  {
    question: "Is ChessReview really free?",
    answer:
      "Yes. You can review Chess.com and Lichess games online at no charge. There is no paid tier and no credit card required.",
  },
  {
    question: "Do I need an account to analyze a chess game?",
    answer:
      "No. Paste a game link or PGN and start your review. Linking a Chess.com or Lichess username is optional and only helps load your recent games.",
  },
  {
    question: "Who is ChessReview for?",
    answer:
      "Anyone who plays chess for fun or at club level and wants clear feedback after a game — without a subscription wall.",
  },
  {
    question: "How is this different from Chess.com Game Review?",
    answer:
      "ChessReview is a free hobby project focused on readable move classifications, accuracy, and Stockfish lines without a subscription wall. Import the same Chess.com or Lichess games you already play.",
  },
] as const;

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
        description: DEFAULT_SEO.description,
        inLanguage: "en",
        audience: {
          "@type": "Audience",
          audienceType: "Amateur and club chess players",
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_ORIGIN}/#app`,
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        applicationCategory: "GameApplication",
        operatingSystem: "Web Browser",
        browserRequirements: "Requires JavaScript",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description: DEFAULT_SEO.description,
        featureList: [
          "Free chess game review online",
          "Chess.com and Lichess game import",
          "PGN paste support",
          "Move classification and accuracy scores",
          "Stockfish engine analysis",
          "Eval graph and critical moments",
          "No account required",
        ],
        areaServed: [
          "United States",
          "Canada",
          "United Kingdom",
          "European Union",
          "Australia",
          "New Zealand",
        ],
      },
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#org`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/apple-touch-icon.png`,
        description:
          "Free online chess game analysis for enthusiasts and club players.",
      },
    ],
  };
}

/** About page structured data — FAQ answers must stay visible on /about. */
export function aboutJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_ORIGIN}/about#page`,
        name: "About ChessReview",
        url: `${SITE_ORIGIN}/about`,
        description:
          "ChessReview is a free online chess game review for amateur and club players — clear move ratings, accuracy, and Stockfish analysis with no subscription.",
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_ORIGIN}/about#faq`,
        mainEntity: HOME_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
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
  const rawPath = options.path ?? window.location.pathname;
  const path =
    rawPath.length > 1 && rawPath.endsWith("/")
      ? rawPath.replace(/\/+$/, "")
      : rawPath || "/";
  const canonical = `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
  const ogType = options.ogType ?? "website";
  const rawImage = options.ogImage ?? DEFAULT_OG_IMAGE;
  const ogImage = rawImage.startsWith("http")
    ? rawImage
    : `${SITE_ORIGIN}${rawImage.startsWith("/") ? rawImage : `/${rawImage}`}`;
  const robots = options.noindex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large";

  document.title = title;

  upsertMeta('meta[name="description"]', { name: "description" }, description);
  upsertMeta('meta[name="robots"]', { name: "robots" }, robots);
  upsertMeta(
    'meta[name="author"]',
    { name: "author" },
    SITE_NAME
  );
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
  // Signal primary English markets without separate localized sites.
  for (const loc of ["en_GB", "en_CA", "en_AU"] as const) {
    upsertMeta(
      `meta[property="og:locale:alternate"][content="${loc}"]`,
      { property: "og:locale:alternate" },
      loc
    );
  }

  if (options.articlePublished) {
    upsertMeta(
      'meta[property="article:published_time"]',
      { property: "article:published_time" },
      options.articlePublished
    );
  }
  if (options.articleModified) {
    upsertMeta(
      'meta[property="article:modified_time"]',
      { property: "article:modified_time" },
      options.articleModified
    );
  }

  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, ogImage);

  upsertLink("canonical", canonical);
  // Self-referencing hreflang for English audiences across regions.
  upsertLink("alternate", canonical, "en");
  upsertLink("alternate", canonical, "x-default");

  removePageJsonLd();
  if (options.jsonLd) {
    removeAllJsonLd();
    const blocks = Array.isArray(options.jsonLd)
      ? options.jsonLd
      : [options.jsonLd];
    blocks.forEach((block, i) => {
      injectJsonLd(`cr-page-jsonld-${i}`, block);
    });
  } else if (path !== "/") {
    // Leave crawlable pages without leftover home WebSite / WebApplication graph.
    removeAllJsonLd();
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
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/apple-touch-icon.png`,
      },
    },
    image: DEFAULT_OG_IMAGE,
    description:
      input.whiteAccuracy != null && input.blackAccuracy != null
        ? `Shared review: ${title}. Accuracy ${input.whiteAccuracy.toFixed(0)}% vs ${input.blackAccuracy.toFixed(0)}%.`
        : `Shared chess game review for ${title}.`,
    inLanguage: "en",
  };
}

export function blogPostJsonLd(input: {
  slug: string;
  title: string;
  excerpt?: string;
  createdAt?: string;
  updatedAt?: string;
  authorName?: string;
  coverImage?: string | null;
}): Record<string, unknown> {
  const url = `${SITE_ORIGIN}/blog/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description:
      input.excerpt ||
      "Articles and notes from ChessReview for amateur and club chess players.",
    url,
    mainEntityOfPage: url,
    datePublished: input.createdAt,
    dateModified: input.updatedAt || input.createdAt,
    author: {
      "@type": "Person",
      name: input.authorName || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/apple-touch-icon.png`,
      },
    },
    image: input.coverImage
      ? input.coverImage.startsWith("http")
        ? input.coverImage
        : `${SITE_ORIGIN}${input.coverImage}`
      : DEFAULT_OG_IMAGE,
    inLanguage: "en",
  };
}

export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
