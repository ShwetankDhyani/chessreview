import { addBlogReply, getBlogPost } from "../../server/blogApi.mjs";

const SITE_ORIGIN = "https://www.chessreview.org";
const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

function adminKey(req) {
  return (
    req.headers["x-admin-key"] ??
    String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "")
  ).trim();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wantsHtml(req) {
  return (
    req.query?.format === "html" ||
    String(req.query?.preview ?? "") === "1"
  );
}

function absolutizeImage(src) {
  if (!src) return OG_IMAGE;
  if (String(src).startsWith("http")) return String(src);
  return `${SITE_ORIGIN}${String(src).startsWith("/") ? src : `/${src}`}`;
}

function blogPreviewHtml(post) {
  const slug = post.slug;
  const url = `${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}`;
  const title = `${post.title} — ChessReview Blog`;
  const description =
    (post.excerpt && String(post.excerpt).trim()) ||
    "Articles and notes from ChessReview for amateur and club chess players.";
  const image = absolutizeImage(post.coverImage);
  const published = post.createdAt || "";
  const modified = post.updatedAt || post.createdAt || "";
  const author = post.authorName || "ChessReview";
  const bodyPreview = String(post.body || post.excerpt || "")
    .replace(/[#*_`>\-\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    url,
    mainEntityOfPage: url,
    datePublished: published || undefined,
    dateModified: modified || undefined,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: "ChessReview",
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/apple-touch-icon.png`,
      },
    },
    image,
    inLanguage: "en",
  };

  return `<!DOCTYPE html>
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
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:locale" content="en_US" />
  ${published ? `<meta property="article:published_time" content="${escapeHtml(published)}" />` : ""}
  ${modified ? `<meta property="article:modified_time" content="${escapeHtml(modified)}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <link rel="alternate" hreflang="en" href="${escapeHtml(url)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(url)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <main>
    <p><a href="${escapeHtml(SITE_ORIGIN)}/">ChessReview</a> · <a href="${escapeHtml(SITE_ORIGIN)}/blog">Blog</a></p>
    <h1>${escapeHtml(post.title)}</h1>
    <p>${escapeHtml(description)}</p>
    ${bodyPreview ? `<p>${escapeHtml(bodyPreview)}</p>` : ""}
    <p><a href="${escapeHtml(url)}">Read the full article on ChessReview</a></p>
  </main>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");

  if (req.method === "OPTIONS") return res.status(204).end();

  const slug = req.query?.slug;
  if (!slug) return res.status(400).json({ error: "Missing slug" });

  try {
    if (req.method === "GET") {
      const data = await getBlogPost(String(slug), { adminKey: adminKey(req) });
      if (!data) {
        if (wantsHtml(req)) {
          res.status(404).send("Not found");
          return;
        }
        return res.status(404).json({ error: "Not found" });
      }

      if (wantsHtml(req)) {
        const post = data.post ?? data;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        return res.status(200).send(blogPreviewHtml(post));
      }

      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      // replies when ?replies=1
      if (req.query?.replies === "1") {
        const body =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
        const result = await addBlogReply(String(slug), body, {
          adminKey: adminKey(req),
        });
        return res.status(200).json(result);
      }
      return res.status(400).json({ error: "Unknown action" });
    }

    return res.status(405).json({ error: "GET or POST only" });
  } catch (e) {
    return res.status(400).json({
      error: e instanceof Error ? e.message : "Failed",
    });
  }
}
