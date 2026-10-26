import React, { useEffect, useMemo, useState } from "react";
import type { AnalyzedMove, ReviewSummary } from "../../types";
import {
  CHESS_QUOTES,
  getQuoteForTags,
  getQuoteByIndex,
  type ChessQuoteRecommendation,
} from "../../config/chessQuotes";
import { affiliateGoHref, trackAffiliateClick } from "../../utils/affiliateTracking";
import { isPlacementEnabled, type AffiliateProduct } from "../../config/affiliateProducts";
import { tagsFromReview } from "../../utils/reviewAffiliateTags";
import { hapticSoft, hapticTap } from "../../utils/chessSounds";

interface DesktopStudyCompanionProps {
  summary?: ReviewSummary | null;
  moves?: AnalyzedMove[];
  className?: string;
}

const STORAGE_KEY = "cr_study_companion_dismissed";

export function DesktopStudyCompanion({
  summary,
  moves,
  className = "",
}: DesktopStudyCompanionProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Check if placement is enabled
  const isEnabled = isPlacementEnabled("resultsSidebar");

  // Determine game weakness tags if a review exists
  const reviewTags = useMemo(() => {
    if (!summary || !moves || moves.length === 0) return null;
    return tagsFromReview(summary, moves);
  }, [summary, moves]);

  // Derive initial quote based on review results or default rotation
  const matched = useMemo(() => {
    if (reviewTags && reviewTags.tags.length > 0) {
      return getQuoteForTags(reviewTags.tags, quoteIndex);
    }
    return getQuoteByIndex(quoteIndex);
  }, [reviewTags, quoteIndex]);

  // Check dismissal state on mount
  useEffect(() => {
    try {
      const val = sessionStorage.getItem(STORAGE_KEY);
      if (val === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDismiss = () => {
    hapticSoft();
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const handleNextQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    hapticTap();
    setQuoteIndex((prev) => (prev + 1) % CHESS_QUOTES.length);
  };

  if (!isEnabled || dismissed || !matched) return null;

  const { quote, product } = matched;
  const href = affiliateGoHref(product.id, "desktop-study");

  const onProductClick = () => {
    hapticSoft();
    trackAffiliateClick(product.id, "desktop-study", [
      ...product.tags,
      ...(reviewTags ? reviewTags.tags : []),
    ]);
  };

  return (
    <div
      className={`w-72 xl:w-80 flex-shrink-0 flex flex-col bg-chess-panel/80 backdrop-blur-md border border-chess-hairline rounded-2xl p-4 shadow-elev-3 self-center transition-all duration-300 ease-soft ${className}`}
      aria-label="Grandmaster's Study"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-chess-hairline/80">
        <div className="flex items-center gap-1.5">
          <span className="text-chess-accent text-sm select-none" aria-hidden>
            ♛
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-chess-text">
            The Master's Study
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleNextQuote}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-chess-muted hover:text-chess-text hover:bg-white/5 transition-colors"
            title="Next chess quote"
          >
            <span>↻</span>
            <span>Next</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="h-5 w-5 flex items-center justify-center rounded text-chess-muted/60 hover:text-chess-text hover:bg-white/5 text-xs transition-colors"
            aria-label="Close study panel"
            title="Hide panel for this session"
          >
            ×
          </button>
        </div>
      </div>

      {/* Quote Block */}
      <div className="py-3.5 space-y-2 border-b border-chess-hairline/60">
        <blockquote className="relative">
          <span
            className="text-2xl font-serif text-chess-accent/40 leading-none select-none -ml-1 mr-0.5 inline-block"
            aria-hidden
          >
            “
          </span>
          <p className="text-[13px] font-serif italic text-chess-text leading-snug inline">
            {quote.quote}
          </p>
        </blockquote>
        <div className="pt-0.5">
          <p className="text-[11px] font-bold text-chess-accent tracking-wide">
            {quote.author}
          </p>
          <p className="text-[10px] text-chess-muted font-medium">
            {quote.authorRole}
          </p>
        </div>
        <p className="text-[11px] text-chess-subtext/90 leading-relaxed pt-1">
          {quote.reflection}
        </p>
      </div>

      {/* Curated Product Recommendation */}
      <div className="pt-3 flex flex-col space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-chess-accent/90">
            {reviewTags ? "Recommended For Your Game" : "Study Companion"}
          </span>
          <span className="text-[9px] text-chess-muted font-medium">
            {product.merchant}
          </span>
        </div>

        <a
          href={href}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={onProductClick}
          className="group block rounded-xl border border-chess-hairline/90 bg-chess-surface/60 p-3 hover:border-chess-accent/40 hover:bg-chess-accent/[0.04] transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-chess-text group-hover:text-chess-accent transition-colors leading-snug">
                {product.title}
              </h4>
              <p className="mt-1 text-[11px] text-chess-muted leading-relaxed line-clamp-2">
                {product.description}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-chess-hairline/40">
            <span className="text-[11px] font-bold text-chess-accent group-hover:underline flex items-center gap-1">
              {product.ctaLabel || "View on Amazon"}
              <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                ↗
              </span>
            </span>
            <span className="text-[9px] text-chess-muted/80 font-medium">
              Verified pick
            </span>
          </div>
        </a>

        {/* Minimal legal disclosure compliance line */}
        <p className="text-[9px] text-chess-muted/60 text-center leading-normal pt-1">
          Supports ChessReview's free engine · As an Amazon Associate I earn from qualifying purchases.
        </p>
      </div>
    </div>
  );
}
