import { useMemo, useState } from "react";
import type { AnalyzedMove, ReviewSummary } from "../types";
import { tagsFromReview } from "../utils/reviewAffiliateTags";
import { getQuoteForTags } from "../config/chessQuotes";
import { affiliateGoHref, trackAffiliateClick } from "../utils/affiliateTracking";
import { isPlacementEnabled } from "../config/affiliateProducts";
import { hapticSoft, hapticTap } from "../utils/chessSounds";

interface ReviewRecommendationProps {
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  className?: string;
}

const WEAKNESS_TITLES: Record<string, string> = {
  "opening play": "Opening Principles",
  "tactical vision": "Tactical Vision",
  "endgame technique": "Converting Endgames",
  "middlegame planning": "Middlegame Strategy",
  "your next games": "Next Steps",
};

export function ReviewRecommendation({
  summary,
  moves,
  className = "",
}: ReviewRecommendationProps) {
  const [quoteOffset, setQuoteOffset] = useState(0);
  const isEnabled = isPlacementEnabled("resultsContextual");

  const { tags, primaryWeakness } = useMemo(
    () => tagsFromReview(summary, moves),
    [summary, moves]
  );

  const matched = useMemo(() => {
    return getQuoteForTags(tags, quoteOffset);
  }, [tags, quoteOffset]);

  if (!isEnabled || !matched) return null;

  const { quote, product, index: displayIndex, total: totalCount } = matched;
  const href = affiliateGoHref(product.id, "review-coach");
  const focusTitle = WEAKNESS_TITLES[primaryWeakness] || "Next Steps";

  const onProductClick = () => {
    hapticSoft();
    trackAffiliateClick(product.id, "review-coach", [
      ...tags,
      ...product.tags,
    ]);
  };

  return (
    <div
      className={`rounded-2xl border border-chess-accent/30 bg-gradient-to-br from-chess-accent/[0.08] via-chess-panel/90 to-chess-panel/70 p-4 shadow-elev-2 space-y-3 transition-all duration-200 ${className}`}
      aria-label="Coach's Curated Improvement Recommendation"
    >
      {/* Focus Area Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-chess-accent/20 border border-chess-accent/40 text-[10px] font-extrabold uppercase tracking-[0.14em] text-chess-accent">
          <span>🎯</span>
          <span>Focus Area: {focusTitle}</span>
        </div>
        {totalCount > 1 ? (
          <div className="inline-flex items-center gap-1.5">
            <span className="text-[10px] text-chess-muted font-medium hidden sm:inline">
              Coach's Pick
            </span>
            <div className="inline-flex items-center rounded-lg bg-white/[0.04] border border-chess-hairline p-0.5">
              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  setQuoteOffset((prev) => prev - 1);
                }}
                className="h-4.5 px-1.5 flex items-center justify-center rounded text-[11px] font-bold text-chess-muted hover:text-white hover:bg-white/10 transition-colors"
                title="Previous recommendation"
                aria-label="Previous recommendation"
              >
                ‹
              </button>
              <span className="text-[9px] text-chess-muted px-1 select-none font-mono">
                {displayIndex + 1}/{totalCount}
              </span>
              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  setQuoteOffset((prev) => prev + 1);
                }}
                className="h-4.5 px-1.5 flex items-center justify-center rounded text-[11px] font-bold text-chess-accent hover:text-white hover:bg-chess-accent/20 transition-colors"
                title="Next recommendation"
                aria-label="Next recommendation"
              >
                ›
              </button>
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-chess-muted font-medium">
            Coach's Pick
          </span>
        )}
      </div>

      {/* High-Impact Master Quote */}
      <div className="space-y-1">
        <blockquote className="border-l-2 border-chess-accent/60 pl-3 py-0.5 italic text-white/95 font-serif text-[13px] sm:text-[14px] leading-snug">
          “{quote.quote}”
        </blockquote>
        <div className="pl-3 text-[10px] font-bold text-chess-accent uppercase tracking-wider">
          — {quote.author} <span className="font-normal text-chess-muted capitalize">({quote.authorRole.split("(")[0].trim()})</span>
        </div>
      </div>

      {/* Visual Product Showcase Card */}
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={onProductClick}
        className="group block rounded-xl border border-chess-hairline bg-chess-surface/90 p-3 hover:border-chess-accent/50 hover:bg-chess-accent/[0.04] transition-all duration-200 shadow-elev-1"
      >
        <div className="flex gap-3">
          {/* Real High-Res Product Image */}
          {product.image ? (
            <div className="w-20 sm:w-24 flex-shrink-0 rounded-lg overflow-hidden shadow-[0_8px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/10 bg-chess-bg group-hover:scale-[1.03] transition-transform duration-200">
              <img
                src={product.image}
                alt={product.title}
                width={96}
                height={140}
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          ) : null}

          {/* Product Details */}
          <div className="min-w-0 flex-1 flex flex-col justify-between">
            <div>
              {/* Star Rating Badge */}
              {product.rating ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 mb-1">
                  <span>★</span>
                  <span>{product.rating}</span>
                </div>
              ) : null}

              <h4 className="text-[13px] font-bold text-white group-hover:text-chess-accent transition-colors leading-snug">
                {product.title}
              </h4>

              {product.author ? (
                <p className="text-[11px] text-chess-muted font-medium mt-0.5">
                  by {product.author}
                </p>
              ) : null}

              <p className="mt-1 text-[11px] text-chess-subtext leading-relaxed line-clamp-2">
                {product.description}
              </p>
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-3 pt-2.5 border-t border-chess-hairline flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-chess-accent text-xs font-bold text-chess-bg shadow-elev-1 group-hover:bg-chess-accent-hover transition-colors">
            <span>{product.ctaLabel || "View on Amazon"}</span>
            <span aria-hidden>↗</span>
          </span>
          <span className="text-[10px] text-chess-muted/80 font-medium">
            Prime available
          </span>
        </div>
      </a>

      {/* Discrete compliance note */}
      <p className="text-[8px] text-chess-muted/60 text-center leading-tight">
        Curated pick · As an Amazon Associate, ChessReview earns from qualifying purchases.
      </p>
    </div>
  );
}
