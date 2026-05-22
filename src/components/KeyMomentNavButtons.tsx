import React from "react";
import {
  keyMomentNavState,
  listKeyMomentIndices,
} from "../utils/keyMomentNav";
import type { AnalyzedMove } from "../types";

interface KeyMomentNavButtonsProps {
  moves: AnalyzedMove[];
  currentMoveIdx: number;
  onGoToIndex: (idx: number) => void;
}

export const KeyMomentNavButtons: React.FC<KeyMomentNavButtonsProps> = ({
  moves,
  currentMoveIdx,
  onGoToIndex,
}) => {
  const indices = listKeyMomentIndices(moves);
  const { prev, next, position, total } = keyMomentNavState(
    indices,
    currentMoveIdx
  );

  if (total === 0) return null;

  const countLabel =
    position !== null ? `${position}/${total}` : `${total} moments`;

  return (
    <>
      <div
        className="text-[8px] leading-tight text-center text-chess-muted uppercase tracking-wide px-0.5"
        title="Jump between brilliant, great, mistake, and blunder moves"
      >
        Highlights
      </div>
      <button
        type="button"
        onClick={() => prev !== undefined && onGoToIndex(prev)}
        disabled={prev === undefined}
        className="board-nav-btn board-nav-btn--key flex flex-col items-center justify-center gap-0.5 min-h-[42px] py-1 disabled:opacity-35"
        title={
          prev !== undefined
            ? `Earlier highlight (${countLabel}) — previous brilliant, great, mistake, or blunder in the game`
            : "No earlier highlight in this game"
        }
        aria-label="Earlier highlight move"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M11 6L6 12l5 6" />
          <path d="M18 6l-5 6 5 6" />
        </svg>
        <span className="text-[7px] font-semibold leading-none opacity-90">
          Earlier
        </span>
      </button>
      <button
        type="button"
        onClick={() => next !== undefined && onGoToIndex(next)}
        disabled={next === undefined}
        className="board-nav-btn board-nav-btn--key flex flex-col items-center justify-center gap-0.5 min-h-[42px] py-1 disabled:opacity-35"
        title={
          next !== undefined
            ? `Later highlight (${countLabel}) — next brilliant, great, mistake, or blunder in the game`
            : "No later highlight in this game"
        }
        aria-label="Later highlight move"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 6l5 6-5 6" />
          <path d="M13 6l5 6-5 6" />
        </svg>
        <span className="text-[7px] font-semibold leading-none opacity-90">
          Later
        </span>
      </button>
    </>
  );
};
