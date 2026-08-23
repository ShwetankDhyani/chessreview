import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BlogPinnedBadge } from "../components/BlogPinnedBadge";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import {
  fetchBlogList,
  formatBlogDate,
  type BlogPostSummary,
} from "../utils/blogApi";

function isSystemUpgradeCard(post: BlogPostSummary): boolean {
  const slug = post.slug.toLowerCase();
  return (
    slug.includes("server-upgrade") ||
    slug.includes("system-upgrade") ||
    slug.includes("maintenance")
  );
}

function UpgradeArrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.25.1.54 0 .68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z" />
    </svg>
  );
}

/** Compact announcement card matching the system-upgrade visual theme. */
function SystemUpgradeCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group relative flex gap-3 overflow-hidden rounded-xl border border-chess-accent/55
        bg-[#141814] px-3.5 py-3 shadow-[0_0_0_1px_rgba(150,188,75,0.12),0_8px_24px_rgba(0,0,0,0.35)]
        transition-all duration-200
        hover:border-chess-accent/80 hover:shadow-[0_0_0_1px_rgba(150,188,75,0.28),0_10px_28px_rgba(0,0,0,0.4)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80
          bg-[radial-gradient(ellipse_at_top_right,rgba(150,188,75,0.12),transparent_55%)]"
        aria-hidden
      />

      <div
        className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg
          bg-gradient-to-br from-chess-accent/35 via-[#1f3a12] to-[#0f160f]
          text-chess-accent ring-1 ring-chess-accent/40"
        aria-hidden
      >
        <UpgradeArrowIcon />
      </div>

      <div className="relative min-w-0 flex-1 space-y-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-chess-accent/45 bg-chess-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-chess-accent">
          <GearIcon />
          System Upgrade
        </span>

        <h2 className="text-[15px] font-bold leading-snug tracking-tight text-white group-hover:text-chess-accent transition-colors">
          {post.title}
        </h2>

        {(post.excerpt || post.bodyPreview) && (
          <p className="text-[12px] leading-snug text-chess-subtext/95 line-clamp-2">
            {post.excerpt || post.bodyPreview}
          </p>
        )}

        <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-chess-muted">
          <span className="tabular-nums">{formatBlogDate(post.createdAt)}</span>
          <span aria-hidden>·</span>
          <span>System Status</span>
          <span className="ml-auto font-semibold text-chess-accent transition-transform group-hover:translate-x-0.5">
            Learn More →
          </span>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: BlogPostSummary }) {
  if (isSystemUpgradeCard(post)) {
    return <SystemUpgradeCard post={post} />;
  }

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex gap-3 rounded-lg border border-chess-border/60 bg-chess-panel/50 px-3 py-2.5
        transition-colors hover:border-chess-accent/30 hover:bg-chess-panel/80"
    >
      {post.coverImage ? (
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-chess-bg">
          <img
            src={post.coverImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md
            bg-gradient-to-br from-chess-border/40 to-chess-accent/15 text-chess-accent/70"
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.5 21h13l-.7-3.4H6.2L5.5 21zM6.5 16h11l-.5-2H7L6.5 16zM12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
          </svg>
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {post.pinned && <BlogPinnedBadge />}
          {!post.published && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-amber-300/90">
              Draft
            </span>
          )}
        </div>

        <h2 className="text-[14px] font-semibold leading-snug text-chess-text group-hover:text-white transition-colors line-clamp-2">
          {post.title}
        </h2>

        {(post.excerpt || post.bodyPreview) && (
          <p className="text-[12px] leading-snug text-chess-muted line-clamp-2">
            {post.excerpt || post.bodyPreview}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-chess-muted/80">
          <span className="tabular-nums">{formatBlogDate(post.createdAt)}</span>
          <span aria-hidden>·</span>
          <span>
            {post.replyCount} {post.replyCount === 1 ? "comment" : "comments"}
          </span>
          <span className="ml-auto text-[10px] font-semibold text-chess-accent opacity-0 transition-opacity group-hover:opacity-100">
            Read →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  usePageSeo({
    title: "Chess Blog — Tips & Updates from ChessReview",
    description:
      "Notes and updates from ChessReview — free chess game review, ideas, and messages for players who use it.",
    path: "/blog",
  });

  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setPosts(await fetchBlogList());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load posts");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SiteChrome title="Blog">
      <main className="max-w-xl mx-auto px-4 py-4 space-y-3">
        <header className="space-y-1 pb-0.5">
          <h1 className="text-lg font-bold tracking-tight text-chess-text">Blog</h1>
          <p className="text-[12px] text-chess-muted leading-snug">
            Updates and notes from ChessReview.
          </p>
        </header>

        {loading && (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg border border-chess-border/50 bg-chess-panel/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {error && !loading && (
          <p className="text-xs text-chess-muted text-center py-8">{error}</p>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-lg border border-dashed border-chess-border bg-chess-panel/30 px-4 py-8 text-center">
            <p className="text-xs text-chess-subtext">No posts yet.</p>
          </div>
        )}

        {posts.length > 0 && (
          <div className="space-y-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </SiteChrome>
  );
}
