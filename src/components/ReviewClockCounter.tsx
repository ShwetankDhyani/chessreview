import { useCallback, useEffect, useState } from "react";
import { fetchReviewCount, formatReviewsServed } from "../utils/reviewStats";

export function ReviewClockCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);

  const refresh = useCallback(async () => {
    const server = await fetchReviewCount();
    setCount((prev) => {
      if (prev == null) return server;
      return Math.max(prev, server);
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onReview = () => {
      setCount((c) => (c ?? 0) + 1);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 450);
      void refresh();
    };
    window.addEventListener("cr_review_logged", onReview);
    return () => window.removeEventListener("cr_review_logged", onReview);
  }, [refresh]);

  if (count == null) return null;

  return (
    <div
      className="fixed z-[45] pointer-events-none select-none
        right-3 lg:right-4
        max-lg:bottom-[calc(var(--mobile-tab-bar)+0.5rem)]
        lg:bottom-[calc(var(--site-footer)+0.5rem)]"
      aria-live="polite"
      aria-label={`${count} games reviewed on ChessReview`}
      title="Games reviewed here"
    >
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-chess-border/80
          bg-chess-panel/92 backdrop-blur-md px-3 py-1.5 shadow-lg
          transition-transform duration-300 ease-out
          ${pulse ? "scale-105 ring-1 ring-chess-accent/40" : "scale-100"}`}
      >
        <span className="text-chess-accent/90" aria-hidden>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <span
          className={`font-mono text-sm font-semibold tabular-nums text-chess-text tracking-tight
            transition-all duration-300 ${pulse ? "text-chess-accent" : ""}`}
        >
          {formatReviewsServed(count)}
        </span>
      </div>
    </div>
  );
}
