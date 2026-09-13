import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { safeGetItem, safeSetItem } from "../utils/safeStorage";

const DISMISS_KEY = "cr_h2h_teaser_dismissed";

/** Compact Games-tab promo for head-to-head form prep. */
export function H2hTeaser({ className = "" }: { className?: string }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return safeGetItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!hidden) return;
    try {
      safeSetItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [hidden]);

  if (hidden) return null;

  return (
    <div
      className={`rounded-xl border border-chess-accent/25 bg-gradient-to-br from-chess-accent/[0.1] via-chess-panel/50 to-transparent px-3.5 py-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-chess-accent/90 inline-flex items-center gap-2">
            Facing someone again?
            <span className="h2h-new-badge h2h-new-badge--inline" aria-hidden>
              New
            </span>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-chess-subtext">
            Check recent form on{" "}
            <span className="font-semibold text-chess-text">H2H</span> — last
            100 games, no Stockfish wait.
          </p>
          <Link
            to="/h2h"
            className="mt-2.5 inline-flex items-center rounded-lg bg-chess-accent px-3 py-1.5 text-xs font-bold text-chess-bg transition-opacity hover:opacity-90"
          >
            Open H2H
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-chess-muted transition-colors hover:bg-white/5 hover:text-chess-text"
          aria-label="Dismiss H2H tip"
        >
          ×
        </button>
      </div>
    </div>
  );
}
