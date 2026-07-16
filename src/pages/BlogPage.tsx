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

function PostCard({
  post,
  featured = false,
}: {
  post: BlogPostSummary;
  featured?: boolean;
}) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group relative block overflow-hidden rounded-xl border border-chess-border/70
        bg-gradient-to-br from-chess-panel via-chess-panel to-chess-bg
        shadow-[0_6px_22px_rgba(0,0,0,0.22)]
        transition-all duration-200
        hover:border-chess-accent/35 hover:shadow-[0_10px_28px_rgba(0,0,0,0.28)]
        hover:-translate-y-0.5`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
          bg-[radial-gradient(ellipse_at_top_right,rgba(150,188,75,0.10),transparent_55%)]"
        aria-hidden
      />

      {post.coverImage ? (
        <div className={`relative overflow-hidden ${featured ? "h-40 sm:h-48" : "h-28"}`}>
          <img
            src={post.coverImage}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-chess-panel via-chess-panel/20 to-transparent" />
        </div>
      ) : (
        <div
          className={`relative overflow-hidden ${featured ? "h-24 sm:h-28" : "h-16"}
            bg-[linear-gradient(135deg,#3a3633_0%,#2a2825_45%,#1f3a12_100%)]`}
        >
          <div
            className="absolute inset-0 opacity-[0.14]
              bg-[radial-gradient(circle_at_20%_30%,rgba(150,188,75,0.9),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(150,188,75,0.35),transparent_40%)]"
            aria-hidden
          />
          <div className="absolute bottom-2 left-3 right-3 flex items-center gap-1.5 text-chess-accent/80">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5.5 21h13l-.7-3.4H6.2L5.5 21zM6.5 16h11l-.5-2H7L6.5 16zM12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              ChessReview Journal
            </span>
          </div>
        </div>
      )}

      <div className={`relative ${featured ? "p-4 sm:p-5" : "p-3.5 sm:p-4"} space-y-2.5`}>
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned && <BlogPinnedBadge />}
          {featured && !post.pinned && (
            <span className="rounded-full border border-chess-accent/35 bg-chess-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-chess-accent">
              Latest
            </span>
          )}
          {!post.published && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
              Draft
            </span>
          )}
        </div>

        <h2
          className={`font-bold text-chess-text leading-snug tracking-tight group-hover:text-white transition-colors
            ${featured ? "text-lg sm:text-xl" : "text-[15px] sm:text-base"}`}
        >
          {post.title}
        </h2>

        <p
          className={`text-chess-subtext leading-relaxed ${
            featured ? "text-[13px] sm:text-sm line-clamp-3" : "text-[13px] line-clamp-2"
          }`}
        >
          {post.excerpt || post.bodyPreview}
        </p>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-2 text-[10px] text-chess-muted">
            <span className="tabular-nums">{formatBlogDate(post.createdAt)}</span>
            <span className="h-1 w-1 rounded-full bg-chess-border-strong" aria-hidden />
            <span>
              {post.replyCount} {post.replyCount === 1 ? "comment" : "comments"}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-chess-accent opacity-0 translate-x-[-4px] transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
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

  const [featured, ...rest] = posts;

  return (
    <SiteChrome title="Blog">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.12),transparent_65%)]"
          aria-hidden
        />

        <main className="relative max-w-2xl mx-auto px-4 py-5 sm:py-7 space-y-5">
          <header className="space-y-2.5 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chess-accent/90">
              Journal
            </p>
            <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-chess-text">
              From the board
            </h1>
            <p className="text-[13px] sm:text-sm text-chess-subtext leading-relaxed max-w-md">
              Notes on building ChessReview — updates, ideas, and messages for players who use it.
            </p>
            <div className="h-px w-16 bg-gradient-to-r from-chess-accent/70 to-transparent" />
          </header>

          {loading && (
            <div className="space-y-3 py-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-chess-border/60 bg-chess-panel/40 animate-pulse"
                />
              ))}
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-chess-muted text-center py-10">{error}</p>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="rounded-xl border border-dashed border-chess-border bg-chess-panel/40 px-5 py-12 text-center">
              <p className="text-sm text-chess-subtext">No posts yet.</p>
              <p className="text-xs text-chess-muted mt-1">The first note is on its way.</p>
            </div>
          )}

          {featured && <PostCard post={featured} featured />}
          {rest.length > 0 && (
            <div className="space-y-3 pt-1">
              {rest.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </main>
      </div>
    </SiteChrome>
  );
}
