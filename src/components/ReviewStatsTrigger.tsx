import { useCallback, useEffect, useState } from "react";
import { ReviewStatsModal } from "./ReviewStatsModal";
import {
  fetchPublicStats,
  formatReviewsServed,
  type PublicReviewStats,
} from "../utils/reviewStats";

function statsButtonLabel(stats: PublicReviewStats | null): string {
  const total = stats?.reviewsServed ?? 0;
  const countries = stats?.countryCount ?? 0;

  if (total > 0) {
    let label = `${formatReviewsServed(total)} review${total === 1 ? "" : "s"} served`;
    if (countries > 0) {
      label += ` · ${countries} countr${countries === 1 ? "y" : "ies"}`;
    }
    return label;
  }
  if (stats?.configured) {
    return "Be among the first reviews served";
  }
  return "Reviews served";
}

export function ReviewStatsTrigger({
  variant = "footer",
}: {
  variant?: "footer" | "header";
}) {
  const [open, setOpen] = useState(false);
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

  const total = stats?.reviewsServed ?? 0;
  const hasCount = total > 0;

  const className =
    variant === "header"
      ? "inline-flex sm:inline-flex items-center gap-1.5 rounded-full border border-chess-border/80 bg-chess-bg/60 px-2.5 py-1 text-[11px] text-chess-muted hover:text-chess-accent hover:border-chess-accent/40 transition-colors"
      : "text-[11px] sm:text-xs text-chess-muted hover:text-chess-accent transition-colors tracking-wide text-center";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        title="See where players are studying"
      >
        {variant === "header" && (
          <span className="text-chess-accent" aria-hidden>
            ♟
          </span>
        )}
        <span className={hasCount ? "text-chess-subtext" : undefined}>
          {statsButtonLabel(stats)}
        </span>
      </button>
      <ReviewStatsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
