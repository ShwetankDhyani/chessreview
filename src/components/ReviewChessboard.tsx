import { Chessboard } from "react-chessboard";
import type { MoveClassification } from "../types";
import { ClassificationIcon } from "./ClassificationIcon";
import { getMeta } from "../utils/classificationMeta";

type Square = `${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${"1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"}`;

export interface ReviewChessboardProps {
  position: string;
  boardWidth: number;
  boardOrientation: "white" | "black";
  animationDuration: number;
  dimmed: boolean;
  continuationActive: boolean;
  moveAnim: { from: string; to: string } | null;
  continuationArrow: { from: string; to: string } | null;
  showBestMoveArrow: boolean;
  bestMove?: string;
  classification?: MoveClassification;
  san?: string;
}

export function ReviewChessboard({
  position,
  boardWidth,
  boardOrientation,
  animationDuration,
  dimmed,
  continuationActive,
  moveAnim,
  continuationArrow,
  showBestMoveArrow,
  bestMove,
  classification,
  san,
}: ReviewChessboardProps) {
  const arrows: [Square, Square, string?][] = moveAnim
    ? [[moveAnim.from as Square, moveAnim.to as Square, "#e8c84a"]]
    : continuationArrow
      ? [[continuationArrow.from as Square, continuationArrow.to as Square, "#6daa6d"]]
      : showBestMoveArrow && bestMove
        ? [[bestMove.slice(0, 2) as Square, bestMove.slice(2, 4) as Square, "#6daa6d"]]
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
            ? "0 0 0 4px #6daa6dcc, 0 0 20px 8px #6daa6d77, 0 0 50px 12px #6daa6d33, inset 0 0 30px 4px #6daa6d22"
            : "none",
          transition: "box-shadow 0.4s ease",
          animation: continuationActive ? "engineGlow 2s ease-in-out infinite" : "none",
        }}
      />
      <Chessboard
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
                  backgroundColor: "rgba(255, 220, 80, 0.55)",
                  borderRadius: "0px",
                },
                [moveAnim.to]: {
                  backgroundColor: "rgba(255, 220, 80, 0.35)",
                  borderRadius: "0px",
                },
              }
            : {}
        }
        customArrows={arrows}
      />
      {classification && san && (
        <ClassificationBadge san={san} classification={classification} />
      )}
    </div>
  );
}

function ClassificationBadge({
  san,
  classification,
}: {
  san: string;
  classification: NonNullable<MoveClassification>;
}) {
  const meta = getMeta(classification);
  if (!meta) return null;

  return (
    <div
      className="absolute bottom-1.5 left-1.5 right-1.5 z-20 flex items-center justify-center gap-1 px-2 py-1 rounded text-white text-[11px] font-bold shadow-lg max-w-[95%] mx-auto"
      style={{ backgroundColor: `${meta.color}dd` }}
    >
      <ClassificationIcon type={classification} size="sm" />
      <span className="truncate">{san}</span>
      <span className="font-normal opacity-90 flex-shrink-0">{meta.label}</span>
    </div>
  );
}
