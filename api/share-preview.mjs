import { getShare } from "../server/reviewSharesApi.mjs";

const SITE_ORIGIN = "https://www.chessreview.org";
const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML preview for social crawlers on /r/:id share links. */
export default async function handler(req, res) {
  const id = req.query?.id;
  if (!id || typeof id !== "string") {
    res.status(400).send("Missing id");
    return;
  }

  try {
    const row = await getShare(id);
    if (!row?.summary) {
      res.status(404).send("Review not found");
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
    const description = `Shared chess game review.${accText} Move ratings, accuracy, and eval chart.`;
    const url = `${SITE_ORIGIN}/r/${encodeURIComponent(id)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="ChessReview" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" />
</head>
<body>
  <p><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(html);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Preview failed";
    res.status(500).send(message);
  }
}
