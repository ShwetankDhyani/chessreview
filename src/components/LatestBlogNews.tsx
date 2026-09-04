import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { fetchBlogList, type BlogPostSummary } from "../utils/blogApi";
import { fetchSiteSettings } from "../utils/siteSettings";
import { safeGetItem, safeSetItem } from "../utils/safeStorage";

/** Per-slug dismiss so a new top post can resurface. */
const DISMISS_KEY = "cr_home_news_dismissed";

/** Standing home news when admin has not chosen another post. */
export const HOME_APPEAL_NEWS_SLUG = "appeal-for-help";

function readDismissedSlug(): string | null {
  try {
    return safeGetItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

interface LatestBlogNewsProps {
  className?: string;
}

function pickHomeNewsPost(
  configured: string | null | undefined,
  posts: BlogPostSummary[]
): BlogPostSummary | undefined {
  if (configured === "__none__") return undefined;

  if (typeof configured === "string" && configured.length > 0) {
    return posts.find((p) => p.slug === configured);
  }

  // Auto (undefined) or legacy null ("hide"): surface the standing appeal
  // when present so home stays useful without an admin write.
  const appeal = posts.find((p) => p.slug === HOME_APPEAL_NEWS_SLUG);
  if (appeal) return appeal;
  if (configured === null) return undefined;
  return posts[0];
}

/**
 * Quiet home teaser for the editorial blog post chosen in site settings.
 * Fails silently; dismissible per slug.
 */
export function LatestBlogNews({ className = "" }: LatestBlogNewsProps) {
  const [post, setPost] = useState<BlogPostSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [settings, posts] = await Promise.all([
          fetchSiteSettings(),
          fetchBlogList(),
        ]);
        if (cancelled || posts.length === 0) return;

        const chosen = pickHomeNewsPost(settings.homeGamesNewsSlug, posts);
        if (!chosen) return;
        if (readDismissedSlug() === chosen.slug) return;
        setPost(chosen);
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
      safeSetItem(DISMISS_KEY, post.slug);
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
