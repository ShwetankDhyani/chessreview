import React, { useEffect, useMemo, useRef } from "react";
import type { AnalyzedMove } from "../types";
import { getMeta } from "../utils/classificationMeta";
import { formatWinChanceDeltaLong, moverWinChanceDeltaPercent } from "../utils/evalDisplay";
import { computeOpeningChapter } from "../utils/openingContext";
import { ClassificationIcon } from "./ClassificationIcon";
import { OpeningChapter } from "./OpeningChapter";

interface MoveListProps {
  moves: AnalyzedMove[];
  currentMoveIndex: number;
  onMoveSelect: (index: number) => void;
  /** Show "Game end" marker on the last move */
  markGameEnd?: boolean;
  /** When false, stepping moves does not scroll the list (e.g. shared review board nav). */
  scrollActiveIntoView?: boolean;
}

function formatMoveLabel(move: AnalyzedMove): string {
  return move.color === "w"
    ? `${move.moveNumber}. ${move.san}`
    : `${move.moveNumber}...${move.san}`;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentMoveIndex,
  onMoveSelect,
  markGameEnd = false,
  scrollActiveIntoView = true,
}) => {
  const activeRef = useRef<HTMLButtonElement>(null);
  const chapter = useMemo(() => computeOpeningChapter(moves), [moves]);

  const leftBookLabel = useMemo(() => {
    if (chapter?.leftBookIdx == null) return undefined;
    const m = moves[chapter.leftBookIdx];
    return m ? formatMoveLabel(m) : undefined;
  }, [chapter, moves]);

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
      <OpeningChapter
        chapter={chapter}
        currentMoveIndex={currentMoveIndex}
        leftBookLabel={leftBookLabel}
        onJumpToLeftBook={
          chapter?.leftBookIdx != null
            ? () => onMoveSelect(chapter.leftBookIdx!)
            : undefined
        }
      />
      <div className="space-y-0.5">
        {pairs.map((pair, pairIdx) => {
          const whiteMove = pair[0];
          const blackMove = pair[1];
          const whiteMoveIdx = pairIdx * 2;
          const blackMoveIdx = pairIdx * 2 + 1;

          return (
            <React.Fragment key={pairIdx}>
              {chapter?.leftBookIdx === whiteMoveIdx && (
                <LeftBookDivider label={leftBookLabel} />
              )}
              <div className="flex items-center gap-0.5 rounded-sm">
                <span className="w-7 text-right text-xs text-chess-muted font-mono pr-1 flex-shrink-0">
                  {pairIdx + 1}.
                </span>

                <MoveToken
                  move={whiteMove}
                  index={whiteMoveIdx}
                  isActive={currentMoveIndex === whiteMoveIdx}
                  isGameEnd={markGameEnd && whiteMoveIdx === moves.length - 1}
                  isLeftBook={chapter?.leftBookIdx === whiteMoveIdx}
                  ref={currentMoveIndex === whiteMoveIdx ? activeRef : null}
                  onClick={() => onMoveSelect(whiteMoveIdx)}
                />

                {chapter?.leftBookIdx === blackMoveIdx && (
                  <LeftBookDivider label={leftBookLabel} inline />
                )}

                <MoveToken
                  move={blackMove}
                  index={blackMoveIdx}
                  isActive={currentMoveIndex === blackMoveIdx}
                  isGameEnd={markGameEnd && blackMoveIdx === moves.length - 1}
                  isLeftBook={chapter?.leftBookIdx === blackMoveIdx}
                  ref={currentMoveIndex === blackMoveIdx ? activeRef : null}
                  onClick={() => onMoveSelect(blackMoveIdx)}
                />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

function LeftBookDivider({
  label,
  inline = false,
}: {
  label?: string;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <span
        className="flex-shrink-0 px-0.5 text-[8px] font-bold uppercase tracking-wide text-[#b58863]/85"
        title={label ? `Left book on ${label}` : "Left book"}
        aria-hidden
      >
        ‖
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-2 py-1 pl-7 pr-1"
      aria-label={label ? `Left book on ${label}` : "Left book"}
    >
      <div className="flex-1 h-px bg-[#b58863]/35" />
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#b58863]/90 flex-shrink-0">
        Left book{label ? ` · ${label}` : ""}
      </span>
      <div className="flex-1 h-px bg-[#b58863]/35" />
    </div>
  );
}

interface MoveTokenProps {
  move?: AnalyzedMove;
  index: number;
  isActive: boolean;
  isGameEnd?: boolean;
  isLeftBook?: boolean;
  onClick: () => void;
}

const MoveToken = React.forwardRef<HTMLButtonElement, MoveTokenProps>(
  ({ move, isActive, isGameEnd, isLeftBook, onClick }, ref) => {
    if (!move) {
      return <div className="flex-1" />;
    }

    const meta = getMeta(move.classification);
    const inBook = move.inOpeningBook || move.classification === "book";

    const isKeyMove =
      !inBook &&
      (move.classification === "brilliant" ||
        move.classification === "great" ||
        move.classification === "blunder" ||
        move.classification === "mistake");

    return (
      <button
        ref={ref}
        onClick={onClick}
        title={
          meta
            ? `${meta.label}${(() => {
                const tip = formatWinChanceDeltaLong(
                  moverWinChanceDeltaPercent(move)
                );
                return tip ? ` (${tip})` : "";
              })()}`
            : undefined
        }
        className={`
          flex-1 flex items-center gap-1 px-2 py-1 rounded text-sm font-mono
          transition-all duration-100 text-left
          ${isActive
            ? "bg-chess-hover text-chess-text font-semibold ring-1 ring-inset ring-white/10"
            : isLeftBook
              ? "hover:bg-[#b58863]/20 ring-1 ring-inset ring-[#b58863]/30"
              : inBook
                ? "text-chess-muted hover:bg-[#b58863]/10 hover:text-chess-subtext"
                : isKeyMove
                  ? "hover:brightness-110"
                  : "text-chess-subtext hover:bg-chess-hover hover:text-chess-text"
          }
        `}
        style={
          isActive && meta
            ? { backgroundColor: `${meta.color}22`, color: "#fff" }
            : !isActive && isLeftBook
              ? { backgroundColor: "#b5886318" }
              : !isActive && inBook
                ? { backgroundColor: "#b588630c" }
                : !isActive && isKeyMove && meta
                  ? { backgroundColor: `${meta.color}18` }
                  : undefined
        }
      >
        <span
          className={`truncate ${
            isActive ? "text-white" : isKeyMove ? "text-chess-text" : ""
          }`}
        >
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
        {meta && move.classification && !inBook && (
          <ClassificationIcon
            type={move.classification}
            size={isKeyMove ? "md" : "sm"}
          />
        )}
        {inBook && !isActive && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#b58863]/70"
            title="Book move"
            aria-hidden
          />
        )}
      </button>
    );
  }
);
MoveToken.displayName = "MoveToken";
