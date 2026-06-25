import { useLayoutEffect, useRef, useState } from "react";
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
  const boardHostRef = useRef<HTMLDivElement>(null);
  const [renderedWidth, setRenderedWidth] = useState(boardWidth);

  useLayoutEffect(() => {
    const node = boardHostRef.current;
    if (!node) return;

    const sync = () => {
      const w = Math.round(node.getBoundingClientRect().width);
      if (w > 0) setRenderedWidth(w);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    return () => ro.disconnect();
  }, [boardWidth]);

  const playedArrow = lastMoveHighlight
    ? ({ ...lastMoveHighlight, variant: "played" as const })
    : null;
  const hintArrow =
    showBestMoveArrow && bestMove && bestMove.length >= 4
      ? ({
          from: bestMove.slice(0, 2),
          to: bestMove.slice(2, 4),
          variant: "hint" as const,
        })
      : null;
  const arrow = continuationArrow
    ? { ...continuationArrow, variant: "continuation" as const }
    : playedArrow ?? hintArrow;

  const squareStyles = lastMoveHighlight
    ? {
        [lastMoveHighlight.from]: LAST_MOVE_FROM_STYLE,
        [lastMoveHighlight.to]: LAST_MOVE_TO_STYLE,
      }
    : {};

  return (
    <div
      className={`relative board-viewport${dimmed ? " board-viewport--dimmed" : ""}`}
      style={{ width: boardWidth, maxWidth: "100%" }}
    >
      <div
        className="absolute inset-0 pointer-events-none z-10 board-continuation-ring"
        data-active={continuationActive ? "true" : "false"}
        style={{ borderRadius: "2px" }}
      />
      <div
        ref={boardHostRef}
        className="relative w-full aspect-square overflow-visible"
        style={{ maxWidth: boardWidth }}
      >
        <Chessboard
          key={remountKey}
          position={position}
          animationDuration={animationDuration}
          boardWidth={renderedWidth}
          boardOrientation={boardOrientation}
          arePiecesDraggable={false}
          showBoardNotation={false}
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
          customSquareStyles={squareStyles}
        />
        {arrow ? (
          <BoardArrowOverlay
            from={arrow.from}
            to={arrow.to}
            boardWidth={renderedWidth}
            boardOrientation={boardOrientation}
            variant={arrow.variant}
          />
        ) : null}
      </div>
    </div>
  );
}
