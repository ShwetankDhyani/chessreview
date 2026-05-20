import type { GameEndInfo } from "../utils/gameEnd";

interface GameEndBannerProps {
  end: GameEndInfo;
  whiteName: string;
  blackName: string;
  atFinalPosition?: boolean;
  compact?: boolean;
}

export function GameEndBanner({
  end,
  whiteName,
  blackName,
  atFinalPosition = false,
  compact = false,
}: GameEndBannerProps) {
  const winnerName =
    end.winner === "w" ? whiteName : end.winner === "b" ? blackName : null;
  const accent =
    end.kind === "draw" || end.kind === "stalemate" || end.kind === "repetition"
      ? "#888"
      : end.winner === "w"
        ? "#6daa6d"
        : end.winner === "b"
          ? "#ca3c3c"
          : "#b58863";

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs"
        style={{
          background: `${accent}18`,
          borderColor: `${accent}44`,
        }}
      >
        <span className="text-base leading-none">{end.icon}</span>
        <span className="font-semibold truncate" style={{ color: accent }}>
          {end.headline}
        </span>
        <span className="text-chess-muted truncate flex-1">{end.detail}</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 border-b border-chess-border flex-shrink-0"
      style={{ background: `${accent}14` }}
    >
      <span
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl"
        style={{ background: `${accent}22` }}
      >
        {end.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold" style={{ color: accent }}>
            {end.headline}
          </span>
          {atFinalPosition && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-chess-bg text-chess-muted border border-chess-border">
              Final position
            </span>
          )}
        </div>
        <p className="text-xs text-chess-subtext mt-0.5 truncate">{end.detail}</p>
        {winnerName &&
          (end.kind === "resignation" ||
            end.kind === "timeout" ||
            end.kind === "abandoned" ||
            end.kind === "other") && (
          <p className="text-[10px] text-chess-muted mt-0.5 italic">
            No checkmate on the board — game ended by rule or opponent left
          </p>
        )}
      </div>
      {winnerName && (
        <div className="text-right flex-shrink-0">
          <div className="text-xs font-bold" style={{ color: accent }}>
            {winnerName}
          </div>
          <div className="text-[10px] text-chess-muted">wins</div>
        </div>
      )}
      {end.winner === null && (
        <span className="text-xs font-bold text-chess-muted flex-shrink-0">½-½</span>
      )}
    </div>
  );
}
