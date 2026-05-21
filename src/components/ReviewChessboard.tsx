import { Chessboard } from "react-chessboard";

type Square = `${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${"1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"}`;

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
  moveAnim: { from: string; to: string } | null;
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
  moveAnim,
  continuationArrow,
  showBestMoveArrow,
  bestMove,
}: ReviewChessboardProps) {
  // Skip the arrow for the regular move animation — the piece travel + square
  // highlight already convey "from → to" and the yellow arrow flashes too fast
  // to read. Keep arrows for engine continuation / best-move suggestions, where
  // they actually help.
  const arrows: [Square, Square, string?][] = continuationArrow
    ? [[continuationArrow.from as Square, continuationArrow.to as Square, "#81b64c"]]
    : showBestMoveArrow && bestMove
      ? [[bestMove.slice(0, 2) as Square, bestMove.slice(2, 4) as Square, "#81b64c"]]
      : [];

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
      <Chessboard
        key={remountKey}
        position={position}
        animationDuration={animationDuration}
        boardWidth={boardWidth}
        boardOrientation={boardOrientation}
        arePiecesDraggable={false}
        customDarkSquareStyle={{ backgroundColor: "#769656" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        customSquareStyles={
          moveAnim
            ? {
                [moveAnim.from]: {
                  backgroundColor: "rgba(247, 201, 72, 0.55)",
                  borderRadius: "0px",
                },
                [moveAnim.to]: {
                  backgroundColor: "rgba(247, 201, 72, 0.35)",
                  borderRadius: "0px",
                },
              }
            : {}
        }
        customArrows={arrows}
      />
    </div>
  );
}
