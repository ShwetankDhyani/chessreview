import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
      className={`group relative block overflow-hidden rounded-2xl border border-chess-border/80
        bg-gradient-to-br from-chess-panel via-chess-panel to-chess-bg
        shadow-[0_12px_40px_rgba(0,0,0,0.28)]
        transition-all duration-300
        hover:border-chess-accent/40 hover:shadow-[0_16px_48px_rgba(0,0,0,0.35),0_0_0_1px_rgba(150,188,75,0.12)]
        hover:-translate-y-0.5`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
          bg-[radial-gradient(ellipse_at_top_right,rgba(150,188,75,0.10),transparent_55%)]"
        aria-hidden
      />

      {post.coverImage ? (
        <div className={`relative overflow-hidden ${featured ? "h-48 sm:h-56" : "h-36"}`}>
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
          className={`relative overflow-hidden ${featured ? "h-28 sm:h-32" : "h-20"}
            bg-[linear-gradient(135deg,#3a3633_0%,#2a2825_45%,#1f3a12_100%)]`}
        >
          <div
            className="absolute inset-0 opacity-[0.14]
              bg-[radial-gradient(circle_at_20%_30%,rgba(150,188,75,0.9),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(150,188,75,0.35),transparent_40%)]"
            aria-hidden
          />
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 text-chess-accent/80">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5.5 21h13l-.7-3.4H6.2L5.5 21zM6.5 16h11l-.5-2H7L6.5 16zM12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              ChessReview Journal
            </span>
          </div>
        </div>
      )}

      <div className={`relative ${featured ? "p-5 sm:p-6" : "p-4 sm:p-5"} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          {featured && (
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
            ${featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}`}
        >
          {post.title}
        </h2>

        <p
          className={`text-chess-subtext leading-relaxed ${
            featured ? "text-sm sm:text-[15px] line-clamp-4" : "text-sm line-clamp-3"
          }`}
        >
          {post.excerpt || post.bodyPreview}
        </p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-[11px] text-chess-muted">
            <span className="tabular-nums">{formatBlogDate(post.createdAt)}</span>
            <span className="h-1 w-1 rounded-full bg-chess-border-strong" aria-hidden />
            <span>
              {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-chess-accent opacity-0 translate-x-[-4px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
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
      "Notes and updates from ChessReview for amateur and club chess players in the US, Canada, UK, Europe, and Australia.",
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
          className="pointer-events-none absolute inset-x-0 top-0 h-64
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.12),transparent_65%)]"
          aria-hidden
        />

        <main className="relative max-w-2xl mx-auto px-4 py-7 sm:py-10 space-y-6">
          <header className="space-y-3 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chess-accent/90">
              Journal
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-chess-text">
              From the board
            </h1>
            <p className="text-sm sm:text-[15px] text-chess-subtext leading-relaxed max-w-md">
              Notes on building ChessReview — updates, ideas, and messages for players who use it.
            </p>
            <div className="h-px w-16 bg-gradient-to-r from-chess-accent/70 to-transparent" />
          </header>

          {loading && (
            <div className="space-y-3 py-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-36 rounded-2xl border border-chess-border/60 bg-chess-panel/40 animate-pulse"
                />
              ))}
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-chess-muted text-center py-10">{error}</p>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-chess-border bg-chess-panel/40 px-6 py-14 text-center">
              <p className="text-sm text-chess-subtext">No posts yet.</p>
              <p className="text-xs text-chess-muted mt-1">The first note is on its way.</p>
            </div>
          )}

          {featured && <PostCard post={featured} featured />}
          {rest.length > 0 && (
            <div className="space-y-4 pt-1">
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
