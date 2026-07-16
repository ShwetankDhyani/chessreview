import { getShare } from "../server/reviewSharesApi.mjs";
import { cleanMetaDescription, escapeHtml } from "../server/seoHtml.mjs";

const SITE_ORIGIN = "https://www.chessreview.org";
const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

function notFoundHtml(id) {
  const url = `${SITE_ORIGIN}/r/${encodeURIComponent(id || "")}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Shared review not found — ChessReview</title>
  <meta name="description" content="This shared chess game review is unavailable." />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${escapeHtml(url)}" />
</head>
<body>
  <p>Shared review not found. <a href="${escapeHtml(SITE_ORIGIN)}/">Open ChessReview</a>.</p>
</body>
</html>`;
}

/** HTML preview for social crawlers on /r/:id share links. */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).send("GET only");
    return;
  }

  const id = req.query?.id;
  if (!id || typeof id !== "string") {
    res.status(400).send("Missing id");
    return;
  }

  try {
    const row = await getShare(id);
    if (!row?.summary) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60");
      if (req.method === "HEAD") {
        res.status(404).end();
        return;
      }
      res.status(404).send(notFoundHtml(id));
      return;
    }

    const white = row.whiteName ?? "White";
    const black = row.blackName ?? "Black";
    const wAcc = row.summary?.accuracy?.white;
    const bAcc = row.summary?.accuracy?.black;
    const accText =
      typeof wAcc === "number" && typeof bAcc === "number"
        ? ` Accuracy: ${Math.round(wAcc)}% vs ${Math.round(bAcc)}%.`
        : "";
    const title = `${white} vs ${black} — ChessReview`;
    const description = cleanMetaDescription(
      `Shared chess game review.${accText} Free move ratings, accuracy scores, and Stockfish analysis on ChessReview.`
    );
    const url = `${SITE_ORIGIN}/r/${encodeURIComponent(id)}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${white} vs ${black} — Chess Game Review`,
      description,
      url,
      image: OG_IMAGE,
      author: { "@type": "Organization", name: "ChessReview" },
      publisher: {
        "@type": "Organization",
        name: "ChessReview",
        url: SITE_ORIGIN,
      },
      inLanguage: "en",
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="ChessReview" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <p><a href="${escapeHtml(url)}">${escapeHtml(title)}</a> — free chess game review on ChessReview.</p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    if (req.method === "HEAD") {
      res.status(200).end();
      return;
    }
    res.status(200).send(html);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Preview failed";
    res.status(500).send(message);
  }
}
