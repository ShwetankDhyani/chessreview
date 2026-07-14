import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchPublicReviewStats } from "../utils/reviewStats";

function OdometerDigit({ digit, tick }: { digit: string; tick: boolean }) {
  return (
    <span
      className={`relative inline-flex h-[18px] min-w-[11px] items-center justify-center rounded-[3px]
        border border-chess-border/90 bg-gradient-to-b from-chess-surface via-chess-bg to-chess-surface
        px-[3px] font-mono text-[10px] font-semibold leading-none tabular-nums text-chess-subtext
        shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_2px_rgba(0,0,0,0.35)]
        transition-colors duration-300 ${tick ? "text-chess-accent border-chess-accent/40" : ""}`}
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/30" />
      {digit}
    </span>
  );
}

function formatStatLine(reviews: number, countries: number) {
  const r = reviews.toLocaleString();
  const c = countries.toLocaleString();
  if (countries <= 0) {
    return `${r} games studied`;
  }
  if (countries === 1) {
    return `${r} games studied across 1 country`;
  }
  return `${r} games studied across ${c} countries`;
}

export function ReviewOdometer() {
  const tipId = useId();
  const [count, setCount] = useState<number | null>(null);
  const [countryCount, setCountryCount] = useState(0);
  const [tick, setTick] = useState(false);
  const [hover, setHover] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    const stats = await fetchPublicReviewStats();
    setCount((prev) => {
      if (prev == null) return stats.count;
      return Math.max(prev, stats.count);
    });
    setCountryCount(stats.countryCount);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onReview = () => {
      setCount((c) => (c ?? 0) + 1);
      setTick(true);
      window.setTimeout(() => setTick(false), 500);
      void refresh();
    };
    window.addEventListener("cr_review_logged", onReview);
    return () => window.removeEventListener("cr_review_logged", onReview);
  }, [refresh]);

  useEffect(() => {
    if (!popupOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopupOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popupOpen]);

  if (count == null) return null;

  const digits = String(count).split("");
  const line = formatStatLine(count, countryCount);

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setPopupOpen(true);
            setHover(false);
            void refresh();
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-describedby={hover ? tipId : undefined}
          aria-label={line}
          className={`inline-flex items-center gap-[2px] rounded-md transition-transform duration-300 ease-out
            focus:outline-none focus-visible:ring-1 focus-visible:ring-chess-accent/50
            ${tick ? "scale-[1.03]" : "scale-100"}
            hover:opacity-95`}
        >
          {digits.map((digit, i) => (
            <OdometerDigit key={`${i}-${digit}-${digits.length}`} digit={digit} tick={tick} />
          ))}
        </button>

        {hover && !popupOpen && (
          <div
            id={tipId}
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 mb-2 z-50
              w-max max-w-[min(16rem,calc(100vw-2rem))]
              rounded-lg border border-chess-border/80 bg-chess-panel/95 backdrop-blur-sm
              px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          >
            <p className="text-[11px] leading-snug text-chess-subtext">
              <span className="font-semibold tabular-nums text-chess-accent">
                {count.toLocaleString()}
              </span>
              {" games studied"}
              {countryCount > 0 ? (
                <>
                  {" across "}
                  <span className="font-semibold tabular-nums text-chess-text">
                    {countryCount.toLocaleString()}
                  </span>
                  {countryCount === 1 ? " country" : " countries"}
                </>
              ) : null}
            </p>
            <span
              className="absolute top-full right-3 -mt-px h-2 w-2 rotate-45
                border-r border-b border-chess-border/80 bg-chess-panel/95"
              aria-hidden
            />
          </div>
        )}
      </div>

      {popupOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-end justify-center sm:items-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-stats-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
              aria-label="Close"
              onClick={() => setPopupOpen(false)}
            />
            <div
              className="relative w-full sm:max-w-sm mx-0 sm:mx-4 mb-[calc(var(--site-footer)+env(safe-area-inset-bottom,0px)+0.5rem)]
                rounded-t-2xl sm:rounded-2xl border border-chess-border bg-chess-panel shadow-2xl
                px-4 pt-3 pb-4 animate-[fadeSlideUp_180ms_ease-out]"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p
                    id="review-stats-title"
                    className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted"
                  >
                    Across the board
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPopupOpen(false)}
                  className="h-8 w-8 flex-shrink-0 rounded-lg text-chess-muted hover:text-chess-text hover:bg-chess-hover transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-chess-subtext leading-relaxed">
                <span className="font-semibold tabular-nums text-chess-accent text-base">
                  {count.toLocaleString()}
                </span>
                {" games studied"}
                {countryCount > 0 ? (
                  <>
                    {" across "}
                    <span className="font-semibold tabular-nums text-chess-text">
                      {countryCount.toLocaleString()}
                    </span>
                    {countryCount === 1 ? " country" : " countries"}
                  </>
                ) : null}
                <span className="text-chess-muted"> — and counting.</span>
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
