import { Chessboard } from "react-chessboard";
import { BoardArrowOverlay } from "./BoardArrowOverlay";

export const LAST_MOVE_FROM_STYLE = {
  backgroundColor: "rgba(247, 201, 72, 0.55)",
  borderRadius: "0px",
} as const;

export const LAST_MOVE_TO_STYLE = {
  backgroundColor: "rgba(247, 201, 72, 0.38)",
  borderRadius: "0px",
} as const;

export interface ReviewChessboardProps {
  position: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  animationDuration: number;
  /**
   * Bumps when navigation jumps non-sequentially (back, multi-ply, start, end).
   * Forces a clean Chessboard remount so no stale animation plays.
   */
  remountKey?: number;
  dimmed: boolean;
  continuationActive: boolean;
  /** from/to squares for the move currently shown (always when available). */
  lastMoveHighlight: { from: string; to: string } | null;
  continuationArrow: { from: string; to: string } | null;
  showBestMoveArrow: boolean;
  bestMove?: string;
}

export function ReviewChessboard({
  position,
  boardWidth,
  boardOrientation,
  animationDuration,
  remountKey = 0,
  dimmed,
  continuationActive,
  lastMoveHighlight,
  continuationArrow,
  showBestMoveArrow,
  bestMove,
}: ReviewChessboardProps) {
  const arrow =
    continuationArrow ??
    (showBestMoveArrow && bestMove
      ? { from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) }
      : null);

  const squareStyles = lastMoveHighlight
    ? {
        [lastMoveHighlight.from]: LAST_MOVE_FROM_STYLE,
        [lastMoveHighlight.to]: LAST_MOVE_TO_STYLE,
      }
    : {};

  return (
    <div
      className={`relative board-viewport${dimmed ? " board-viewport--dimmed" : ""}`}
    >
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          borderRadius: "2px",
          boxShadow: continuationActive
            ? "0 0 0 3px #81b64ccc, 0 0 18px 6px #81b64c55, inset 0 0 24px 3px #81b64c1f"
            : "none",
          transition: "box-shadow 0.35s ease",
          animation: continuationActive ? "engineGlow 2.4s ease-in-out infinite" : "none",
        }}
      />
      <div
        className="relative overflow-hidden rounded-[2px]"
        style={{ width: boardWidth, height: boardWidth }}
      >
        <Chessboard
          key={remountKey}
          position={position}
          animationDuration={animationDuration}
          boardWidth={boardWidth}
          boardOrientation={boardOrientation}
          arePiecesDraggable={false}
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
          customSquareStyles={squareStyles}
        />
        {arrow ? (
          <BoardArrowOverlay
            from={arrow.from}
            to={arrow.to}
            boardWidth={boardWidth}
            boardOrientation={boardOrientation}
          />
        ) : null}
      </div>
    </div>
  );
}
