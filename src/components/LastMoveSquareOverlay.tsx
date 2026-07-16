import { getSquareRect } from "../utils/boardSquareCoords";

interface LastMoveSquareOverlayProps {
  from: string;
  to: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
}

/** Yellow from/to tint painted above the board grid so last-move is always visible. */
export function LastMoveSquareOverlay({
  from,
  to,
  boardWidth,
  boardOrientation,
}: LastMoveSquareOverlayProps) {
  const fromRect = getSquareRect(from, boardOrientation, boardWidth);
  const toRect = getSquareRect(to, boardOrientation, boardWidth);
  if (!fromRect && !toRect) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[14]" aria-hidden>
      {fromRect ? (
        <div
          className="absolute last-move-square last-move-square--from"
          style={{
            left: fromRect.left,
            top: fromRect.top,
            width: fromRect.size,
            height: fromRect.size,
          }}
        />
      ) : null}
      {toRect && to !== from ? (
        <div
          className="absolute last-move-square last-move-square--to"
          style={{
            left: toRect.left,
            top: toRect.top,
            width: toRect.size,
            height: toRect.size,
          }}
        />
      ) : null}
    </div>
  );
}
