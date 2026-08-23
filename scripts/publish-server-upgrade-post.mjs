/**
 * Publish the "Server Upgrade Complete" announcement.
 *
 *   ADMIN_SECRET='…' node scripts/publish-server-upgrade-post.mjs
 *   ADMIN_SECRET='…' BLOG_API=https://www.chessreview.org/api/blog node …
 */

const API = (process.env.BLOG_API ?? "https://www.chessreview.org/api/blog").replace(
  /\/$/,
  ""
);
const key = (process.env.ADMIN_SECRET ?? process.env.STATS_READ_KEY ?? "").trim();

if (!key) {
  console.error("Set ADMIN_SECRET (or STATS_READ_KEY) to publish.");
  process.exit(1);
}

const payload = {
  title: "Server Upgrade Complete",
  slug: "server-upgrade-complete",
  excerpt:
    "A scheduled maintenance window is finished. Faster reviews, fuller analysis, and a more stable engine stack are live.",
  body: `A brief **maintenance window** was scheduled for ChessReview’s analysis stack. That work is done, and the changes are live.

### What’s better now
- **Faster reviews** — the engine host now runs parallel Stockfish workers so full games finish sooner
- **Fuller analysis** — every position is searched at your requested depth (no shallow “shortcut” pass)
- **Accuracy closer to Lichess** — scoring uses the same Win% model and game-accuracy blend players already know
- **Smoother profile / game loading** — Chess.com calls are serialized with backoff so we stay good API citizens

### What you may notice
Reviews should feel snappier on first analysis, and accuracy numbers should line up much more closely with Lichess on the same game. Profile imports still depend on Chess.com / Lichess availability — if either API is slow, paste a **game link** or **PGN** and keep reviewing.

Thanks for your patience during the window. If something still looks off, reply on this post or reach out via Contact in the footer.
`,
  published: true,
  pinned: true,
  pinOrder: 1,
  authorName: "Shwetank",
};

const res = await fetch(API, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Key": key,
  },
  body: JSON.stringify(payload),
});

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("Publish failed:", res.status, data);
  process.exit(1);
}

console.log("Published:", data.post?.slug ?? data);
console.log("URL: https://www.chessreview.org/blog/server-upgrade-complete");
