import {
  resolveAnalysisMode,
  type AnalysisQuality,
} from "../utils/analysisMode";
import type { EngineBackend } from "../utils/engineUiStatus";

const QUALITY_STYLES: Record<
  AnalysisQuality,
  { wrap: string; dot: string; badge: string }
> = {
  "deep-native": {
    wrap: "border-chess-accent/35 bg-chess-accent/10",
    dot: "bg-chess-accent shadow-[0_0_6px_rgba(129,182,76,0.5)]",
    badge: "text-chess-accent",
  },
  "shallow-cloud": {
    wrap: "border-chess-border bg-chess-surface/80",
    dot: "bg-chess-muted",
    badge: "text-chess-subtext",
  },
  "fallback-lichess": {
    wrap: "border-amber-500/35 bg-amber-500/10",
    dot: "bg-amber-400",
    badge: "text-amber-300",
  },
  offline: {
    wrap: "border-amber-500/45 bg-amber-500/12",
    dot: "bg-amber-400 animate-pulse",
    badge: "text-amber-400",
  },
  "local-dev": {
    wrap: "border-chess-accent/25 bg-chess-accent/8",
    dot: "bg-chess-accent",
    badge: "text-chess-accent",
  },
};

interface AnalysisModeBadgeProps {
  engineBackend: EngineBackend;
  hasRemoteEngine: boolean;
  depth: number;
  onRetry?: () => void;
  className?: string;
}

export function AnalysisModeBadge({
  engineBackend,
  hasRemoteEngine,
  depth,
  onRetry,
  className = "",
}: AnalysisModeBadgeProps) {
  const mode = resolveAnalysisMode(engineBackend, hasRemoteEngine, depth);
  const styles = QUALITY_STYLES[mode.quality];

  return (
    <div
      className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-left ${styles.wrap} ${className}`}
      title={mode.description}
    >
      <span
        className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${styles.dot}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}
          >
            {mode.badge}
          </span>
          {mode.quality === "offline" && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[10px] font-semibold text-amber-300 hover:underline"
            >
              Retry
            </button>
          )}
        </div>
        <p className="text-[11px] text-chess-subtext leading-snug mt-0.5">
          {mode.title}
        </p>
      </div>
    </div>
  );
}
