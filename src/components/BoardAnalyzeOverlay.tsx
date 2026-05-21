import type { AnalysisState } from "../types";

interface BoardAnalyzeOverlayProps {
  state: AnalysisState;
  progressPercent: number;
  playerLabel?: string;
  onAnalyze?: () => void;
  disabled?: boolean;
}

function AnalyzeIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      className="text-white"
      aria-hidden
    >
      <path
        d="M9.5 3.5 8 8l-4.5 1.5L8 11l1.5 4.5L11 8l4.5-1.5L11 5 9.5 3.5Z"
        fill="currentColor"
        opacity="0.95"
      />
      <circle cx="15.5" cy="15.5" r="5.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M18.5 13.5h-2v4M16.5 15.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BoardAnalyzeOverlay({
  state,
  progressPercent,
  playerLabel,
  onAnalyze,
  disabled,
}: BoardAnalyzeOverlayProps) {
  const show =
    state === "loading" || state === "analyzing" || state === "error";
  if (!show) return null;

  const analyzing = state === "analyzing";
  const pct = Math.round(Math.min(100, Math.max(0, progressPercent)));
  const ringRadius = 42;
  const circumference = 2 * Math.PI * ringRadius;
  const dash = (pct / 100) * circumference;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
      aria-live="polite"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 board-overlay-vignette"
        aria-hidden
      />

      <div className="relative pointer-events-auto flex flex-col items-center gap-3 px-5 py-5 rounded-2xl border border-white/10 bg-chess-panel/90 shadow-2xl board-overlay-card max-w-[min(92%,280px)]">
        {analyzing ? (
          <>
            <div className="relative w-[104px] h-[104px] flex items-center justify-center">
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke="#96bc4b"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  className="transition-[stroke-dasharray] duration-300 ease-out"
                />
              </svg>
              <div className="flex flex-col items-center z-10">
                <span className="text-2xl font-bold tabular-nums text-chess-text leading-none">
                  {pct}%
                </span>
                <span className="text-[9px] uppercase tracking-widest text-move-best font-semibold mt-1">
                  Analyzing
                </span>
              </div>
            </div>
            <p className="text-center text-xs text-chess-subtext leading-snug">
              Playing through the game while Stockfish reviews each position
            </p>
            {playerLabel ? (
              <p className="text-[10px] text-chess-muted truncate max-w-full">
                {playerLabel}
              </p>
            ) : null}
          </>
        ) : state === "error" ? (
          <>
            <span className="text-2xl" aria-hidden>
              ⚠
            </span>
            <p className="text-sm text-red-300 text-center">Analysis failed</p>
            {onAnalyze ? (
              <button
                type="button"
                onClick={onAnalyze}
                className="text-xs font-semibold text-move-best hover:text-green-400"
              >
                Try again
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={disabled || !onAnalyze}
              className="group flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-move-best shadow-lg shadow-move-best/30 group-hover:scale-105 group-active:scale-95 transition-transform duration-200 board-analyze-pulse">
                <AnalyzeIcon />
              </span>
              <span className="text-sm font-bold text-chess-text tracking-tight">
                Analyze Game
              </span>
              <span className="text-[10px] text-chess-muted text-center leading-relaxed px-1">
                Engine review with move ratings
              </span>
            </button>
            {playerLabel ? (
              <p className="text-[10px] text-chess-muted truncate max-w-full border-t border-chess-border/60 pt-2 w-full text-center">
                {playerLabel}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
