import type { ReactNode } from "react";
import { PlayerAvatar } from "./PlayerAvatar";
import type { PlatformHint } from "../utils/playerAvatar";

export function formatClock(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlayerTag({
  name,
  color,
  rating,
  result,
  isLastMove,
  clock,
  clockColor: _clockColor,
  side,
  compact = false,
  trailing,
  platformHint,
  avatarUrl,
}: {
  name: string;
  color: "white" | "black";
  rating?: number | null;
  result?: "1-0" | "0-1" | "1/2-1/2" | "*" | null;
  isLastMove?: boolean;
  clock?: number | null;
  clockColor?: "w" | "b";
  side?: "w" | "b";
  compact?: boolean;
  trailing?: ReactNode;
  platformHint?: PlatformHint;
  avatarUrl?: string | null;
}) {
  const mySide = side ?? (color === "white" ? "w" : "b");
  const won = result === "1-0" ? "w" : result === "0-1" ? "b" : result === "1/2-1/2" ? "draw" : null;
  const didWin = won === mySide;
  const didLose = won !== null && won !== "draw" && won !== mySide;
  const isDraw = won === "draw";

  const hasClock = !compact && clock !== null && clock !== undefined;
  const clockSecs = hasClock ? clock! : null;
  const clockColor =
    clockSecs !== null
      ? clockSecs < 30
        ? "#ca3c3c"
        : clockSecs < 60
          ? "#e6c84a"
          : clockSecs < 120
            ? "#e07b39"
            : "#888"
      : "#888";

  return (
    <div
      className={`flex items-center w-full py-1 transition-all ${
        compact ? "px-1 gap-2" : "px-1.5 gap-2.5"
      } ${isLastMove && didLose ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      style={isLastMove && didLose ? { opacity: 0.75 } : undefined}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <PlayerAvatar
          username={name}
          platformHint={platformHint}
          avatarUrl={avatarUrl}
          color={color}
          compact={compact}
          size={compact ? 18 : 22}
          showColorBadge
        />
        <span
          className={`font-bold text-chess-text truncate tracking-tight ${compact ? "text-[13px]" : "text-sm"}`}
        >
          {name}
        </span>
        {rating ? (
          <span
            className={`text-chess-muted flex-shrink-0 tabular-nums ${compact ? "text-[10px]" : "text-xs"}`}
          >
            {rating}
          </span>
        ) : null}
        {didWin ? (
          <span
            title="Winner"
            className={`leading-none ml-0.5 ${compact ? "text-xs" : "text-sm"}`}
          >
            👑
          </span>
        ) : null}
        {isDraw ? (
          <span className="text-[10px] font-bold text-chess-muted ml-0.5">½-½</span>
        ) : null}
      </div>
      {trailing}
      {hasClock ? (
        <span
          className={`text-xs font-mono ml-auto flex-shrink-0 tabular-nums ${
            clockSecs !== null && clockSecs < 30 ? "animate-pulse" : ""
          }`}
          style={{ color: clockColor }}
        >
          {clockSecs !== null ? formatClock(clockSecs) : "--:--"}
        </span>
      ) : null}
    </div>
  );
}
