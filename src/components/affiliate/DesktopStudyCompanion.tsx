import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AnalyzedMove, ReviewSummary } from "../../types";
import {
  CHESS_QUOTES,
  getQuoteForTags,
  getQuoteByIndex,
} from "../../config/chessQuotes";
import { affiliateGoHref, trackAffiliateClick } from "../../utils/affiliateTracking";
import { isPlacementEnabled } from "../../config/affiliateProducts";
import { tagsFromReview } from "../../utils/reviewAffiliateTags";
import { hapticSoft, hapticTap } from "../../utils/chessSounds";

interface DesktopStudyCompanionProps {
  summary?: ReviewSummary | null;
  moves?: AnalyzedMove[];
  className?: string;
}

const STORAGE_KEY = "cr_study_companion_dismissed";
const ROTATION_INTERVAL_MS = 14000; // 14 seconds: relaxed reading cadence without annoyance

export function DesktopStudyCompanion({
  summary,
  moves,
  className = "",
}: DesktopStudyCompanionProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<number | null>(null);

  const isEnabled = isPlacementEnabled("resultsSidebar");

  const reviewTags = useMemo(() => {
    if (!summary || !moves || moves.length === 0) return null;
    return tagsFromReview(summary, moves);
  }, [summary, moves]);

  const matched = useMemo(() => {
    if (reviewTags && reviewTags.tags.length > 0) {
      return getQuoteForTags(reviewTags.tags, quoteIndex);
    }
    return getQuoteByIndex(quoteIndex);
  }, [reviewTags, quoteIndex]);

  useEffect(() => {
    try {
      const val = sessionStorage.getItem(STORAGE_KEY);
      if (val === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-rotate every 14 seconds when tab is active and not hovered
  useEffect(() => {
    if (isHovered || dismissed || !isEnabled) return;

    timerRef.current = window.setInterval(() => {
      if (document.hidden) return;
      setQuoteIndex((prev) => prev + 1);
    }, ROTATION_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isHovered, dismissed, isEnabled, quoteIndex]);

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
    setQuoteIndex((prev) => prev + 1);
  };

  const handlePrevQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    hapticTap();
    setQuoteIndex((prev) => prev - 1);
  };

  if (!isEnabled || dismissed || !matched) return null;

  const { quote, product, index: displayIndex, total: totalCount } = matched;
  const href = affiliateGoHref(product.id, "desktop-study");

  const onProductClick = () => {
    hapticSoft();
    trackAffiliateClick(product.id, "desktop-study", [
      ...product.tags,
      ...(reviewTags ? reviewTags.tags : []),
    ]);
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-72 xl:w-80 flex-shrink-0 flex flex-col bg-chess-panel/90 backdrop-blur-md border border-chess-hairline rounded-2xl p-4 shadow-elev-3 self-center transition-all duration-300 ease-soft ${className}`}
      aria-label="The Master's Study"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-chess-hairline">
        <div className="flex items-center gap-1.5">
          <span className="text-chess-accent text-sm select-none" aria-hidden>
            ♛
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-chess-text">
            The Master's Study
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Previous / Carousel Index / Next Controls */}
          <div className="inline-flex items-center rounded-lg bg-white/[0.04] border border-chess-hairline p-0.5">
            <button
              type="button"
              onClick={handlePrevQuote}
              className="h-5 px-1.5 flex items-center justify-center rounded text-[11px] font-bold text-chess-muted hover:text-white hover:bg-white/10 transition-colors"
              title="Previous recommendation"
              aria-label="Previous recommendation"
            >
              ‹
            </button>
            <span className="text-[9px] text-chess-muted px-1.5 select-none font-mono">
              {displayIndex + 1}/{totalCount}
            </span>
            <button
              type="button"
              onClick={handleNextQuote}
              className="h-5 px-1.5 flex items-center justify-center rounded text-[11px] font-bold text-chess-accent hover:text-white hover:bg-chess-accent/20 transition-colors"
              title="Next recommendation"
              aria-label="Next recommendation"
            >
              ›
            </button>
          </div>

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

      {/* Subtle timer progress bar (indicates rotation, pauses on hover) */}
      <div className="w-full h-[1.5px] bg-white/[0.04] overflow-hidden -mt-[1px]">
        <div
          key={`${quote.id}-${quoteIndex}`}
          className="h-full bg-chess-accent/50 animate-[studyProgress_14s_linear]"
          style={{ animationPlayState: isHovered ? "paused" : "running" }}
        />
      </div>

      <div
        key={quote.id}
        className="animate-[fadeSlideUp_220ms_ease-out] flex flex-col flex-1"
      >
        {/* Quote Banner (High-impact typography, no dense paragraphs) */}
        <div className="py-3 border-b border-chess-hairline/80 space-y-1">
          <blockquote className="text-[14px] font-serif italic text-white/95 leading-snug">
            “{quote.quote}”
          </blockquote>
          <p className="text-[10px] font-semibold text-chess-accent uppercase tracking-wider">
            — {quote.author}{" "}
            <span className="font-normal text-chess-muted capitalize">
              ({quote.authorRole.split("(")[0].trim()})
            </span>
          </p>
        </div>

        {/* Visual Product Showcase (Large product image + bold title + ratings) */}
        <a
          href={href}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={onProductClick}
          className="group mt-3 block rounded-xl border border-chess-hairline bg-chess-surface/80 p-3 hover:border-chess-accent/50 hover:bg-chess-accent/[0.04] transition-all duration-200"
        >
          <div className="flex gap-3">
            {/* Real Product Artwork / Cover */}
            {product.image ? (
              <div className="w-20 flex-shrink-0 rounded-lg overflow-hidden shadow-[0_8px_18px_rgba(0,0,0,0.6)] ring-1 ring-white/10 bg-chess-bg group-hover:scale-[1.03] transition-transform duration-200">
                <img
                  src={product.image}
                  alt={product.title}
                  width={80}
                  height={116}
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

                <h4 className="text-[12px] font-bold text-white group-hover:text-chess-accent transition-colors leading-tight">
                  {product.title}
                </h4>

                {product.author ? (
                  <p className="text-[10px] text-chess-muted font-medium mt-0.5">
                    by {product.author}
                  </p>
                ) : null}

                <p className="mt-1 text-[10px] text-chess-subtext leading-snug line-clamp-2">
                  {product.description}
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button Bar */}
          <div className="mt-3 pt-2.5 border-t border-chess-hairline/60 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-chess-accent text-[11px] font-bold text-chess-bg shadow-elev-1 group-hover:bg-chess-accent-hover transition-colors">
              <span>View on Amazon</span>
              <span aria-hidden>↗</span>
            </span>
            <span className="text-[9px] text-chess-muted/80 font-medium">
              Prime available
            </span>
          </div>
        </a>

        {/* Discrete compliance note */}
        <p className="mt-2 text-[8px] text-chess-muted/60 text-center leading-tight">
          Curated pick · As an Amazon Associate, ChessReview earns from qualifying purchases.
        </p>
      </div>
    </aside>
  );
}
