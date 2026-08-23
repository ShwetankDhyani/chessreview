import type { ReactNode } from "react";
import { formatChessMoveCounter } from "../utils/pgnPlies";
import { hapticSoft } from "../utils/chessSounds";

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
  const flip = () => {
    hapticSoft();
    onFlip();
  };

  if (moveCount <= 0) {
    return (
      <div className="ml-auto flex items-center gap-1.5">
        {leading}
        <button
          type="button"
          onClick={flip}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-chess-hairline bg-chess-surface text-chess-subtext shadow-elev-1 transition-all duration-200 ease-soft hover:border-chess-accent/35 hover:text-chess-accent hover:bg-chess-hover active:scale-[0.94] active:bg-chess-hover touch-manipulation"
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
        onClick={flip}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-chess-hairline bg-chess-surface text-chess-subtext shadow-elev-1 transition-all duration-200 ease-soft hover:border-chess-accent/35 hover:text-chess-accent hover:bg-chess-hover active:scale-[0.94] active:bg-chess-hover touch-manipulation"
        aria-label="Flip board"
      >
        <FlipBoardIcon />
      </button>
    </div>
  );
}
