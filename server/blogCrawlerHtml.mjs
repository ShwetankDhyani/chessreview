/**
 * Crawler-facing HTML for /blog (list) and helpers used by blog routes.
 */

import { cleanMetaDescription, escapeHtml } from "../server/seoHtml.mjs";

const SITE_ORIGIN = "https://www.chessreview.org";
const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

export function blogListHtml(posts = []) {
  const url = `${SITE_ORIGIN}/blog`;
  const title = "Chess Blog — Tips & Updates from ChessReview";
  const description = cleanMetaDescription(
    "Notes and updates from ChessReview — free chess game review, ideas, and messages for players who use it."
  );

  const items = posts
    .filter((p) => p?.slug && p?.title)
    .map((p) => {
      const href = `${SITE_ORIGIN}/blog/${encodeURIComponent(p.slug)}`;
      const excerpt = cleanMetaDescription(
        p.excerpt || p.bodyPreview || "",
        140
      );
      return `<li>
  <h2><a href="${escapeHtml(href)}">${escapeHtml(p.title)}</a></h2>
  ${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ""}
  <p><time datetime="${escapeHtml(p.createdAt || "")}">${escapeHtml(
        p.createdAt || ""
      )}</time></p>
</li>`;
    })
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "ChessReview Blog",
    url,
    description,
    publisher: {
      "@type": "Organization",
      name: "ChessReview",
      url: SITE_ORIGIN,
    },
    blogPost: posts
      .filter((p) => p?.slug && p?.title)
      .slice(0, 20)
      .map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `${SITE_ORIGIN}/blog/${encodeURIComponent(p.slug)}`,
        datePublished: p.createdAt || undefined,
        dateModified: p.updatedAt || p.createdAt || undefined,
      })),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta property="og:type" content="website" />
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
  <link rel="alternate" hreflang="en" href="${escapeHtml(url)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(url)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <main>
    <p><a href="${escapeHtml(SITE_ORIGIN)}/">ChessReview</a> · <a href="${escapeHtml(SITE_ORIGIN)}/about">About</a></p>
    <h1>Blog</h1>
    <p>${escapeHtml(description)}</p>
    <ul>
${items || "      <li>No posts yet.</li>"}
    </ul>
  </main>
</body>
</html>`;
}

function absolutizeImage(src) {
  if (!src) return OG_IMAGE;
  if (String(src).startsWith("http")) return String(src);
  return `${SITE_ORIGIN}${String(src).startsWith("/") ? src : `/${src}`}`;
}

/** Crawler HTML for a single blog post. */
export function blogPostHtml(post) {
  const slug = post.slug;
  const url = `${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}`;
  const title = `${post.title} — ChessReview Blog`;
  const description = cleanMetaDescription(
    (post.excerpt && String(post.excerpt).trim()) ||
      "Articles and notes from ChessReview for amateur and club chess players."
  );
  const image = absolutizeImage(post.coverImage);
  const published = post.createdAt || "";
  const modified = post.updatedAt || post.createdAt || "";
  const author = post.authorName || "ChessReview";
  const bodyPreview = cleanMetaDescription(
    String(post.body || post.excerpt || "")
      .replace(/[#*_`>\-\[\]\(\)]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    1200
  ).replace(/…$/, "");

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
