import React, { useEffect, useRef } from "react";
import type { AnalyzedMove } from "../types";
import { getMeta } from "../utils/classificationMeta";
import { formatWinChanceLoss } from "../utils/evalDisplay";
import { ClassificationIcon } from "./ClassificationIcon";

interface MoveListProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
  /** Show "Game end" marker on the last move */
  markGameEnd?: boolean;
  /** When false, stepping moves does not scroll the list (e.g. shared review board nav). */
  scrollActiveIntoView?: boolean;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentMoveIndex,
  onMoveSelect,
  markGameEnd = false,
  scrollActiveIntoView = true,
}) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!scrollActiveIntoView) return;
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentMoveIndex, scrollActiveIntoView]);

  const pairs: Array<[AnalyzedMove | undefined, AnalyzedMove | undefined]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1]]);
  }

  return (
    <div className="pr-1">
      <div className="space-y-0.5">
        {pairs.map((pair, pairIdx) => {
          const whiteMove = pair[0];
          const blackMove = pair[1];
          const whiteMoveIdx = pairIdx * 2;
          const blackMoveIdx = pairIdx * 2 + 1;

          return (
            <div
              key={pairIdx}
              className="flex items-center gap-0.5 rounded-sm"
            >
              <span className="w-7 text-right text-xs text-chess-muted font-mono pr-1 flex-shrink-0">
                {pairIdx + 1}.
              </span>

              <MoveToken
                move={whiteMove}
                index={whiteMoveIdx}
                isActive={currentMoveIndex === whiteMoveIdx}
                isGameEnd={markGameEnd && whiteMoveIdx === moves.length - 1}
                ref={currentMoveIndex === whiteMoveIdx ? activeRef : null}
                onClick={() => onMoveSelect(whiteMoveIdx)}
              />

              <MoveToken
                move={blackMove}
                index={blackMoveIdx}
                isActive={currentMoveIndex === blackMoveIdx}
                isGameEnd={markGameEnd && blackMoveIdx === moves.length - 1}
                ref={currentMoveIndex === blackMoveIdx ? activeRef : null}
                onClick={() => onMoveSelect(blackMoveIdx)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface MoveTokenProps {
  move?: AnalyzedMove;
  index: number;
  isActive: boolean;
  isGameEnd?: boolean;
  onClick: () => void;
}

const MoveToken = React.forwardRef<HTMLButtonElement, MoveTokenProps>(
  ({ move, isActive, isGameEnd, onClick }, ref) => {
    if (!move) {
      return <div className="flex-1" />;
    }

    const meta = getMeta(move.classification);

    const isKeyMove = move.classification === "brilliant" ||
      move.classification === "great" ||
      move.classification === "blunder" ||
      move.classification === "mistake";
    return (
      <button
        ref={ref}
        onClick={onClick}
        title={
          meta
            ? `${meta.label}${
                move.deltaE !== undefined && move.deltaE > 0
                  ? ` (${formatWinChanceLoss(move.deltaE) ?? ""})`
                  : ""
              }`
            : undefined
        }
        className={`
          flex-1 flex items-center gap-1 px-2 py-1 rounded text-sm font-mono
          transition-all duration-100 text-left
          ${isActive
            ? "bg-chess-hover text-chess-text font-semibold ring-1 ring-inset ring-white/10"
            : isKeyMove
              ? "hover:brightness-110"
              : "text-chess-subtext hover:bg-chess-hover hover:text-chess-text"
          }
        `}
        style={
          isActive && meta
            ? { backgroundColor: `${meta.color}22`, color: "#fff" }
            : !isActive && isKeyMove && meta
              ? { backgroundColor: `${meta.color}18` }
              : undefined
        }
      >
        <span className={`truncate ${isActive ? "text-white" : isKeyMove ? "text-chess-text" : ""}`}>
          {move.san}
        </span>
        {isGameEnd && (
          <span
            className="text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded flex-shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/30"
            title="Last move — game ended here"
          >
            End
          </span>
        )}
        {meta && move.classification && (
          <ClassificationIcon
            type={move.classification}
            size={isKeyMove ? "md" : "sm"}
          />
        )}
      </button>
    );
  }
);
MoveToken.displayName = "MoveToken";
