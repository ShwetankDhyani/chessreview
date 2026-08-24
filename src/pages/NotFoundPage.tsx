import { Link } from "react-router-dom";
import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";

/**
 * Unknown URLs previously redirected to the home page, which silently swallowed
 * broken or mistyped deep links. Saying what happened is less surprising.
 */
export default function NotFoundPage() {
  usePageSeo({
    title: "Page not found — ChessReview",
    description: "This ChessReview page does not exist.",
    path: "/404",
    noindex: true,
  });

  return (
    <SiteChrome title="Not found">
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-chess-muted">
          404
        </p>
        <h1 className="mt-2 text-lg font-bold tracking-tight text-chess-text">
          This page doesn’t exist
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-chess-muted">
          The link may be mistyped, or the review it pointed to has expired.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/"
            className="rounded-lg bg-chess-accent px-3.5 py-2 text-xs font-semibold text-white shadow-elev-1 transition-all duration-200 ease-soft hover:bg-chess-accent-hover active:scale-[0.97]"
          >
            Analyse a game
          </Link>
          <Link
            to="/blog"
            className="rounded-lg border border-chess-hairline px-3.5 py-2 text-xs font-semibold text-chess-subtext transition-all duration-200 ease-soft hover:bg-chess-hover active:scale-[0.97]"
          >
            Read the blog
          </Link>
        </div>
      </div>
    </SiteChrome>
  );
}
