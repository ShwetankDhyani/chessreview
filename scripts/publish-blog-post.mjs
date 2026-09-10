#!/usr/bin/env node
/**
 * Publish a blog post to ChessReview (production or local).
 *
 *   ADMIN_SECRET=... node scripts/publish-blog-post.mjs docs/blog-drafts/opponent-prep-is-live.md
 *
 * Optional env:
 *   BLOG_API_URL=https://www.chessreview.org/api/blog
 *   BLOG_AUTHOR=Shwetank
 *   BLOG_PIN=1
 */
import { readFileSync } from "fs";
import { basename } from "path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/publish-blog-post.mjs <draft.md>");
  process.exit(1);
}

const key = (process.env.ADMIN_SECRET || process.env.STATS_READ_KEY || "").trim();
if (!key) {
  console.error("Set ADMIN_SECRET (same key as /admin).");
  process.exit(1);
}

const raw = readFileSync(file, "utf8").trim();
const lines = raw.split("\n");
let title = basename(file, ".md");
let bodyStart = 0;
if (lines[0]?.startsWith("# ")) {
  title = lines[0].slice(2).trim();
  bodyStart = 1;
  while (lines[bodyStart] === "") bodyStart += 1;
}
const body = lines.slice(bodyStart).join("\n").trim();
const excerpt =
  body
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220) || title;

const slug =
  process.env.BLOG_SLUG ||
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const api = (process.env.BLOG_API_URL || "https://www.chessreview.org/api/blog").replace(
  /\/$/,
  ""
);

const payload = {
  title,
  slug,
  excerpt,
  body,
  published: true,
  pinned: process.env.BLOG_PIN === "1",
  pinOrder: process.env.BLOG_PIN === "1" ? 1 : 0,
  authorName: process.env.BLOG_AUTHOR || "Shwetank",
};

const res = await fetch(api, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Key": key,
  },
  body: JSON.stringify(payload),
});
const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(res.status, data);
  process.exit(1);
}
console.log(JSON.stringify(data, null, 2));
console.log(`\nLive: https://www.chessreview.org/blog/${data.post?.slug || slug}`);
