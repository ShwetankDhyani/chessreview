/**
 * Editorial posts shipped with the app. Merged into blog list/get when the
 * engine store does not already have the same slug (engine wins on conflict).
 */

export const APPEAL_FOR_HELP_SLUG = "appeal-for-help";

const KOFI_URL = "https://ko-fi.com/shwetank";

const APPEAL_BODY = `ChessReview has provided free game reviews for months now — clear move ratings, accuracy, and engine lines, with no account and no paywall.

To keep doing that for many others like you, we will need a little help. If the site has been useful, you are welcome to support it on Ko-fi. If not, that is perfectly fine — ChessReview stays free either way.

[Support on Ko-fi](${KOFI_URL})`;

export const STATIC_BLOG_POSTS = [
  {
    id: "static-appeal-for-help",
    slug: APPEAL_FOR_HELP_SLUG,
    title: "Appeal for Help",
    excerpt:
      "ChessReview has been free for months. A little help on Ko-fi keeps it that way for others like you — no pressure either way.",
    body: APPEAL_BODY,
    coverImage: null,
    published: true,
    pinned: false,
    pinOrder: 0,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    authorName: "Shwetank",
    replyCount: 0,
    bodyPreview:
      "ChessReview has provided free game reviews for months now — clear move ratings, accuracy, and engine lines, with no account and no paywall.",
  },
];

export function mergeStaticBlogPosts(posts) {
  const list = Array.isArray(posts) ? [...posts] : [];
  const existing = new Set(
    list.map((p) => String(p?.slug ?? "").trim()).filter(Boolean)
  );
  for (const post of STATIC_BLOG_POSTS) {
    if (existing.has(post.slug)) continue;
    list.push({ ...post });
  }
  return list;
}

export function getStaticBlogPost(slug) {
  const key = String(slug ?? "").trim();
  if (!key) return null;
  return STATIC_BLOG_POSTS.find((p) => p.slug === key) ?? null;
}
