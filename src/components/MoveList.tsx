import React, { useEffect, useRef } from "react";
import type { AnalyzedMove } from "../types";
import { getMeta } from "../utils/classificationMeta";
import { ClassificationIcon } from "./ClassificationIcon";

interface MoveListProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentMoveIndex,
  onMoveSelect,
}) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentMoveIndex]);

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
                ref={currentMoveIndex === whiteMoveIdx ? activeRef : null}
                onClick={() => onMoveSelect(whiteMoveIdx)}
              />

              <MoveToken
                move={blackMove}
                index={blackMoveIdx}
                isActive={currentMoveIndex === blackMoveIdx}
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
  onClick: () => void;
}

const MoveToken = React.forwardRef<HTMLButtonElement, MoveTokenProps>(
  ({ move, isActive, onClick }, ref) => {
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
        title={meta ? `${meta.label}${move.deltaE !== undefined ? ` (${move.deltaE > 0 ? "-" : "+"}${Math.abs(move.deltaE * 100).toFixed(0)}cp)` : ""}` : undefined}
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
