import { useEffect, useState } from "react";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";
import {
  fetchBlogList,
  formatBlogDate,
  type BlogPostSummary,
} from "../utils/blogApi";

export default function BlogPage() {
  usePageSeo({
    title: "Blog — ChessReview",
    description: "Notes, updates, and messages from ChessReview.",
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
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-4">
        <div className="mb-2">
          <h1 className="text-lg font-bold text-chess-text">Blog</h1>
          <p className="text-xs text-chess-muted mt-1">
            Notes from the builder — updates, thoughts, and messages to players.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-chess-muted text-center py-10">Loading…</p>
        )}
        {error && !loading && (
          <p className="text-sm text-chess-muted text-center py-10">{error}</p>
        )}
        {!loading && !error && posts.length === 0 && (
          <div className="rounded-xl border border-chess-border bg-chess-panel/50 px-4 py-10 text-center">
            <p className="text-sm text-chess-subtext">No posts yet.</p>
            <p className="text-xs text-chess-muted mt-1">Check back soon.</p>
          </div>
        )}
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/blog/${post.slug}`}
            className="block rounded-xl border border-chess-border bg-chess-panel/60 overflow-hidden
              hover:border-chess-accent/35 hover:bg-chess-accent/[0.04] transition-colors"
          >
            {post.coverImage ? (
              <img
                src={post.coverImage}
                alt=""
                className="w-full h-40 object-cover border-b border-chess-border/60"
                loading="lazy"
              />
            ) : null}
            <div className="p-4 sm:p-5 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-bold text-chess-text leading-snug">
                  {post.title}
                </h2>
                {!post.published && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-400/90 flex-shrink-0">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-chess-subtext leading-relaxed line-clamp-3">
                {post.excerpt || post.bodyPreview}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-chess-muted pt-1">
                <span>{formatBlogDate(post.createdAt)}</span>
                <span aria-hidden>·</span>
                <span>
                  {post.replyCount} {post.replyCount === 1 ? "reply" : "replies"}
                </span>
              </div>
            </div>
          </a>
        ))}
      </main>
    </SiteChrome>
  );
}
