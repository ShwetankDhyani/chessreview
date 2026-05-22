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
    position !== null ? `${position}/${total}` : `${total} key moments`;

  const prevTitle =
    prev !== undefined
      ? `Previous key moment (${countLabel}) — brilliant, great, mistake, or blunder`
      : "No earlier key moment in this game";

  const nextTitle =
    next !== undefined
      ? `Next key moment (${countLabel}) — brilliant, great, mistake, or blunder`
      : "No later key moment in this game";

  return (
    <>
      <button
        type="button"
        onClick={() => prev !== undefined && onGoToIndex(prev)}
        disabled={prev === undefined}
        className="board-nav-btn board-nav-btn--key disabled:opacity-35"
        title={prevTitle}
        aria-label="Previous key moment"
      >
        <svg
          width="16"
          height="16"
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
      </button>
      <button
        type="button"
        onClick={() => next !== undefined && onGoToIndex(next)}
        disabled={next === undefined}
        className="board-nav-btn board-nav-btn--key disabled:opacity-35"
        title={nextTitle}
        aria-label="Next key moment"
      >
        <svg
          width="16"
          height="16"
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
      </button>
    </>
  );
};
