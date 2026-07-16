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

function PostCard({ post }: { post: BlogPostSummary }) {
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
