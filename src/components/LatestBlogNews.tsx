import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { fetchBlogList, type BlogPostSummary } from "../utils/blogApi";

/** Per-slug dismiss so a new top post can resurface. */
const DISMISS_KEY = "cr_home_news_dismissed";

function readDismissedSlug(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

interface LatestBlogNewsProps {
  className?: string;
}

/**
 * Quiet home teaser for the editorial top blog post (pinned / newest).
 * Fails silently; dismissible per slug.
 */
export function LatestBlogNews({ className = "" }: LatestBlogNewsProps) {
  const [post, setPost] = useState<BlogPostSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const posts = await fetchBlogList();
        if (cancelled || posts.length === 0) return;
        const top = posts[0]!;
        if (readDismissedSlug() === top.slug) return;
        setPost(top);
      } catch {
        /* ignore — never block the games tab */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!post) return null;

  const dismiss = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, post.slug);
    } catch {
      /* ignore */
    }
    setPost(null);
  };

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border border-chess-border/50 bg-chess-panel/35 px-2.5 py-1.5 ${className}`}
    >
      <Link
        to={`/blog/${post.slug}`}
        className="group flex min-w-0 flex-1 items-center gap-2 text-left transition-colors"
      >
        <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-chess-accent/85">
          News
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-chess-subtext group-hover:text-chess-text transition-colors">
          {post.title}
        </span>
        <span
          className="flex-shrink-0 text-[11px] font-semibold text-chess-accent/70 group-hover:text-chess-accent transition-colors"
          aria-hidden
        >
          →
        </span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-chess-muted/80 hover:text-chess-text transition-colors"
        aria-label="Dismiss news"
      >
        ×
      </button>
    </div>
  );
}
