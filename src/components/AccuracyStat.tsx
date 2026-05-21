function accuracyTone(pct: number): { bar: string; text: string } {
  if (pct >= 90) return { bar: "#6daa6d", text: "#8bc96a" };
  if (pct >= 75) return { bar: "#96bc4b", text: "#a8c96e" };
  if (pct >= 60) return { bar: "#c9b458", text: "#d4c070" };
  if (pct >= 40) return { bar: "#d4924a", text: "#e0a060" };
  return { bar: "#ca3c3c", text: "#e06060" };
}

interface AccuracyStatProps {
  accuracy: number;
  color: "white" | "black";
  username?: string;
}

export function AccuracyStat({ accuracy, color, username }: AccuracyStatProps) {
  const safe =
    typeof accuracy === "number" && isFinite(accuracy) ? accuracy : 0;
  const hasValue =
    typeof accuracy === "number" && isFinite(accuracy) && accuracy > 0;
  const tone = accuracyTone(safe);
  const displayName = username ?? (color === "white" ? "White" : "Black");

  return (
    <div className="accuracy-stat flex-1 min-w-0 rounded-lg border border-chess-border/80 bg-chess-bg/40 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <span
          className="w-2 h-2 rounded-sm flex-shrink-0 ring-1 ring-white/10"
          style={{
            backgroundColor: color === "white" ? "#e8e6e3" : "#2a2a2a",
          }}
        />
        <span className="text-xs font-semibold text-chess-text truncate">
          {displayName}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-chess-muted font-medium">
          Accuracy
        </span>
        <span
          className="text-2xl font-bold tabular-nums leading-none tracking-tight"
          style={{ color: hasValue ? tone.text : "#666" }}
        >
          {hasValue ? safe.toFixed(1) : "—"}
          {hasValue ? (
            <span className="text-sm font-semibold text-chess-muted ml-0.5">
              %
            </span>
          ) : null}
        </span>
      </div>

      <div className="h-1 rounded-full bg-chess-border/80 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: hasValue ? `${Math.min(100, safe)}%` : "0%",
            background: `linear-gradient(90deg, ${tone.bar}cc, ${tone.bar})`,
            boxShadow: hasValue ? `0 0 8px ${tone.bar}44` : undefined,
          }}
        />
      </div>
    </div>
  );
}
