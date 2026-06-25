import type { ReactNode } from "react";
import { formatChessMoveCounter } from "../utils/pgnPlies";

export function FlipBoardIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 4l-3 3 3 3" />
      <path d="M4 7h12a4 4 0 0 1 4 4" />
      <path d="M17 20l3-3-3-3" />
      <path d="M20 17H8a4 4 0 0 1-4-4" />
    </svg>
  );
}

export function MobileBoardControls({
  moveIndex,
  moveCount,
  onFlip,
  leading,
}: {
  moveIndex: number;
  moveCount: number;
  onFlip: () => void;
  leading?: ReactNode;
}) {
  if (moveCount <= 0) {
    return (
      <div className="ml-auto flex items-center gap-1.5">
        {leading}
        <button
          type="button"
          onClick={onFlip}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-chess-border bg-chess-surface text-chess-subtext active:bg-chess-hover transition-colors touch-manipulation"
          aria-label="Flip board"
        >
          <FlipBoardIcon />
        </button>
      </div>
    );
  }

  const label = formatChessMoveCounter(moveIndex, moveCount);

  return (
    <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
      {leading}
      <span
        className="text-[11px] text-chess-muted font-mono tabular-nums"
        title="Full move number"
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onFlip}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-chess-border bg-chess-surface text-chess-subtext active:bg-chess-hover transition-colors touch-manipulation"
        aria-label="Flip board"
      >
        <FlipBoardIcon />
      </button>
    </div>
  );
}
