import type { MoveClassification } from "../types";
import { getSquareRect } from "../utils/boardSquareCoords";
import { ClassificationIcon } from "./ClassificationIcon";

interface MoveClassificationBadgeProps {
  square: string;
  classification: NonNullable<MoveClassification>;
  boardWidth: number;
  boardOrientation: "white" | "black";
}

/** Classification glyph anchored to the destination square (on the moved piece). */
export function MoveClassificationBadge({
  square,
  classification,
  boardWidth,
  boardOrientation,
}: MoveClassificationBadgeProps) {
  const rect = getSquareRect(square, boardOrientation, boardWidth);
  if (!rect) return null;

  const badge = Math.max(14, Math.round(rect.size * 0.38));
  const inset = Math.max(1, Math.round(rect.size * 0.04));

  return (
    <div
      className="absolute pointer-events-none z-[22] flex items-center justify-center rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.45)] ring-1 ring-black/20 bg-chess-bg/80"
      style={{
        left: rect.left + rect.size - badge - inset,
        top: rect.top + inset,
        width: badge,
        height: badge,
      }}
      aria-hidden
    >
      <ClassificationIcon
        type={classification}
        size={badge >= 20 ? "md" : "sm"}
      />
    </div>
  );
}
