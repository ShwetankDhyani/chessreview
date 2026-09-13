import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { safeGetItem, safeSetItem } from "../utils/safeStorage";

const DISMISS_KEY = "cr_h2h_teaser_dismissed";

/** Quiet Games-tab strip for head-to-head form prep. */
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
      className={`flex items-center gap-3 rounded-xl border border-chess-border/60 bg-chess-panel/40 px-3 py-2.5 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-snug text-chess-subtext">
          <span className="font-semibold text-chess-text">Rematch soon?</span>{" "}
          Scout their last 100 games on H2H — no engine wait.
        </p>
      </div>
      <Link to="/h2h" className="cr-btn-secondary flex-shrink-0 text-xs px-2.5 py-1.5">
        Open H2H
      </Link>
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-chess-muted transition-colors hover:bg-white/5 hover:text-chess-text"
        aria-label="Dismiss H2H tip"
      >
        ×
      </button>
    </div>
  );
}
