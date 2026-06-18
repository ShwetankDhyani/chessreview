import { useCallback, useEffect, useState } from "react";
import { fetchReviewCount } from "../utils/reviewStats";

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

export function ReviewOdometer() {
  const [count, setCount] = useState<number | null>(null);
  const [tick, setTick] = useState(false);

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
      setTick(true);
      window.setTimeout(() => setTick(false), 500);
      void refresh();
    };
    window.addEventListener("cr_review_logged", onReview);
    return () => window.removeEventListener("cr_review_logged", onReview);
  }, [refresh]);

  if (count == null) return null;

  const digits = String(count).split("");

  return (
    <div
      className={`inline-flex items-center gap-[2px] transition-transform duration-300 ease-out
        ${tick ? "scale-[1.03]" : "scale-100"}`}
      aria-live="polite"
      aria-label={`${count} games reviewed`}
    >
      {digits.map((digit, i) => (
        <OdometerDigit key={`${i}-${digit}-${digits.length}`} digit={digit} tick={tick} />
      ))}
    </div>
  );
}
