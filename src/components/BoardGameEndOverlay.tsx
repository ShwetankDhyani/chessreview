import { useMemo } from "react";
import type { GameEndInfo } from "../utils/gameEnd";
import { findKingSquare, squareToPercent } from "../utils/boardSquareLayout";

interface BoardGameEndOverlayProps {
  end: GameEndInfo;
  fen: string;
  boardOrientation: "white" | "black";
  whiteName: string;
  blackName: string;
}

export function BoardGameEndOverlay({
  end,
  fen,
  boardOrientation,
  whiteName,
  blackName,
}: BoardGameEndOverlayProps) {
  const loserColor =
    end.winner === "w" ? "b" : end.winner === "b" ? "w" : null;

  const kingAnim = useMemo(() => {
    if (!loserColor || end.kind === "draw" || end.kind === "stalemate") {
      return null;
    }
    const sq = findKingSquare(fen, loserColor);
    if (!sq) return null;
    return {
      square: sq,
      pos: squareToPercent(sq, boardOrientation),
      glyph: loserColor === "w" ? "♔" : "♚",
      variant:
        end.kind === "resignation" || end.kind === "abandoned"
          ? "fall"
          : end.kind === "checkmate"
            ? "fall"
            : end.kind === "timeout"
              ? "tip"
              : "tip",
    };
  }, [fen, boardOrientation, loserColor, end.kind]);

  const winnerName =
    end.winner === "w" ? whiteName : end.winner === "b" ? blackName : null;

  const accent =
    end.kind === "draw" || end.kind === "stalemate" || end.kind === "repetition"
      ? "#9a9a9a"
      : end.winner === "w"
        ? "#6daa6d"
        : end.winner === "b"
          ? "#ca3c3c"
          : "#b58863";

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-none board-game-end-layer"
      role="status"
      aria-live="polite"
    >
      {kingAnim ? (
        <div
          className={`board-king-fall board-king-fall--${kingAnim.variant}`}
          style={{
            left: `${kingAnim.pos.left}%`,
            top: `${kingAnim.pos.top}%`,
          }}
        >
          <span className="board-king-fall-piece">{kingAnim.glyph}</span>
          <span className="board-king-fall-shadow" aria-hidden />
        </div>
      ) : null}

      <div className="board-game-end-caption">
        <div
          className="board-game-end-card"
          style={{
            borderColor: `${accent}55`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 24px ${accent}22`,
          }}
        >
          <span className="board-game-end-icon">{end.icon}</span>
          <div className="min-w-0">
            <p
              className="text-sm font-bold leading-tight truncate"
              style={{ color: accent }}
            >
              {end.detail}
            </p>
            {winnerName && end.winner ? (
              <p className="text-[10px] text-white/70 mt-0.5 truncate">
                {winnerName} wins
              </p>
            ) : (
              <p className="text-[10px] text-white/60 mt-0.5">{end.headline}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
