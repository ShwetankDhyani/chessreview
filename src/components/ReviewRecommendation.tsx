import { useMemo } from "react";
import type { AnalyzedMove, ReviewSummary } from "../types";
import { tagsFromReview } from "../utils/reviewAffiliateTags";
import { getQuoteForTags } from "../config/chessQuotes";
import { affiliateGoHref, trackAffiliateClick } from "../utils/affiliateTracking";
import { isPlacementEnabled } from "../config/affiliateProducts";
import { hapticSoft } from "../utils/chessSounds";

interface ReviewRecommendationProps {
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  className?: string;
}

const WEAKNESS_TITLES: Record<string, string> = {
  "opening play": "Opening Mastery & Principles",
  "tactical vision": "Sharpening Tactical Vision",
  "endgame technique": "Converting the Endgame",
  "middlegame planning": "Middlegame Strategy & Imbalances",
  "your next games": "Next Steps for Your Journey",
};

export function ReviewRecommendation({
  summary,
  moves,
  className = "",
}: ReviewRecommendationProps) {
  const isEnabled = isPlacementEnabled("resultsContextual");

  const { tags, primaryWeakness } = useMemo(
    () => tagsFromReview(summary, moves),
    [summary, moves]
  );

  const matched = useMemo(() => {
    return getQuoteForTags(tags);
  }, [tags]);

  if (!isEnabled || !matched) return null;

  const { quote, product } = matched;
  const href = affiliateGoHref(product.id, "review-coach");
  const focusTitle = WEAKNESS_TITLES[primaryWeakness] || "Game Improvement Focus";

  const onProductClick = () => {
    hapticSoft();
    trackAffiliateClick(product.id, "review-coach", [
      ...tags,
      ...product.tags,
    ]);
  };

  return (
    <div
      className={`rounded-2xl border border-chess-accent/25 bg-gradient-to-br from-chess-accent/[0.06] via-chess-panel/90 to-chess-panel/60 p-4 sm:p-5 shadow-elev-2 space-y-3.5 transition-all duration-200 ${className}`}
      aria-label="Coach's Curated Improvement Pick"
    >
      {/* Header Pill & Focus Area */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-chess-accent/15 border border-chess-accent/30 text-[10px] font-extrabold uppercase tracking-[0.14em] text-chess-accent">
          <span>🎯</span>
          <span>Focus Area: {focusTitle}</span>
        </div>
        <span className="text-[10px] text-chess-muted font-medium">
          Coach's Pick
        </span>
      </div>

      {/* Inspiring Master Quote */}
      <div className="space-y-1.5 pt-0.5">
        <blockquote className="border-l-2 border-chess-accent/40 pl-3 py-0.5 italic text-chess-text font-serif text-[13px] leading-snug">
          "{quote.quote}"
        </blockquote>
        <div className="pl-3 text-[11px] font-semibold text-chess-accent tracking-wide">
          — {quote.author} <span className="font-normal text-chess-muted text-[10px]">({quote.authorRole})</span>
        </div>
      </div>

      {/* Editorial Connection */}
      <p className="text-[12px] text-chess-subtext leading-relaxed">
        {quote.reflection}
      </p>

      {/* Product Recommendation Card */}
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={onProductClick}
        className="group block rounded-xl border border-chess-hairline bg-chess-surface/75 p-3.5 transition-all duration-200 hover:border-chess-accent/40 hover:bg-chess-accent/[0.05] hover:shadow-elev-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-chess-accent/90">
                Recommended Study
              </span>
              <span className="text-[9px] text-chess-muted font-medium">
                · {product.merchant}
              </span>
            </div>
            <h4 className="text-[13px] font-bold text-chess-text group-hover:text-chess-accent transition-colors">
              {product.title}
            </h4>
            <p className="mt-1 text-[11px] text-chess-muted leading-relaxed">
              {product.description}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-chess-hairline/60">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-chess-accent group-hover:underline">
            {product.ctaLabel || "View on Amazon"}
            <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
              ↗
            </span>
          </span>
          <span className="text-[10px] text-chess-muted/80">
            {product.bestFor || "Essential chess study"}
          </span>
        </div>
      </a>

      {/* Clean compliance statement */}
      <p className="text-[9px] text-chess-muted/70 text-center leading-normal pt-1">
        Curated recommendations that support ChessReview. As an Amazon Associate, we earn from qualifying purchases.
      </p>
    </div>
  );
}
