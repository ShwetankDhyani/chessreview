import { useCallback, useEffect, useState } from "react";
import { HelpModal } from "./HelpModal";
import { ReviewStatsModal } from "./ReviewStatsModal";
import {
  fetchPublicStats,
  formatReviewsServed,
  type PublicReviewStats,
} from "../utils/reviewStats";

export function SiteFooter() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState<PublicReviewStats | null>(null);

  const refreshStats = useCallback(() => {
    fetchPublicStats().then(setStats).catch(() => setStats({ configured: false }));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const onLogged = () => refreshStats();
    window.addEventListener("cr_review_logged", onLogged);
    return () => window.removeEventListener("cr_review_logged", onLogged);
  }, [refreshStats]);

  useEffect(() => {
    if (!helpOpen && !statsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelpOpen(false);
        setStatsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, statsOpen]);

  const served = stats?.reviewsServed ?? 0;
  const countries = stats?.countryCount ?? 0;
  const showCount = stats?.configured && served > 0;

  let statsLabel = "Reviews served";
  if (showCount) {
    statsLabel = `${formatReviewsServed(served)} review${served === 1 ? "" : "s"} served`;
    if (countries > 0) {
      statsLabel += ` · ${countries} countr${countries === 1 ? "y" : "ies"}`;
    }
  } else if (stats?.configured) {
    statsLabel = "Be among the first reviews served";
  }

  return (
    <>
      <footer
        className="flex-shrink-0 z-40 border-t border-chess-border/80 bg-chess-panel/95 backdrop-blur-sm
          fixed left-0 right-0 bottom-0 lg:static
          pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="page-inline-pad flex items-center justify-center gap-3 sm:gap-4 min-h-[var(--site-footer)] flex-wrap py-1">
          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="text-[11px] text-chess-muted hover:text-chess-accent transition-colors tracking-wide text-center"
            title="See where players are studying"
          >
            <span className={showCount ? "text-chess-subtext" : undefined}>{statsLabel}</span>
          </button>
          <span className="text-chess-border/60 hidden sm:inline" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] text-chess-muted hover:text-chess-accent transition-colors tracking-wide"
          >
            Help ChessReview.org
          </button>
        </div>
      </footer>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ReviewStatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
    </>
  );
}
