import type { ReactNode } from "react";
import { formatChessMoveCounter } from "../utils/pgnPlies";
import { hapticSoft } from "../utils/chessSounds";
import { useBoardView } from "../hooks/useBoardView";

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

export function OtbViewIcon({ active }: { active?: boolean }) {
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
      <path d="M4 14l8 4 8-4" />
      <path d="M4 10l8 4 8-4" />
      <path d="M4 6l8 4 8-4" opacity={active ? 1 : 0.55} />
    </svg>
  );
}

export function BoardViewToggleButton({
  className,
}: {
  className?: string;
}) {
  const [boardView, setBoardView] = useBoardView();
  const otbActive = boardView === "otb3d";

  const classes =
    className ??
    `flex h-7 w-7 items-center justify-center rounded-lg transition-all touch-manipulation active:scale-[0.94] ${
      otbActive
        ? "bg-chess-accent/25 text-chess-accent"
        : "bg-chess-surface/60 text-chess-subtext hover:text-chess-text hover:bg-chess-hover"
    }`;

  return (
    <button
      type="button"
      onClick={() => {
        hapticSoft();
        setBoardView(otbActive ? "2d" : "otb3d");
      }}
      className={`${classes}${otbActive && className ? " is-otb-active" : ""}`}
      aria-label={otbActive ? "Switch to flat board" : "Switch to 3D table board"}
      aria-pressed={otbActive}
      title={otbActive ? "Flat board" : "3D table board"}
    >
      <OtbViewIcon active={otbActive} />
    </button>
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

  const label = moveCount > 0 ? formatChessMoveCounter(moveIndex, moveCount) : null;

  return (
    <div className="w-full flex items-center justify-between px-1 py-1">
      <div className="flex items-center gap-2">
        {label && (
          <span
            className="text-[11px] text-chess-muted font-mono tabular-nums"
            title="Full move number"
          >
            {label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        {leading}
        <BoardViewToggleButton />
        <button
          type="button"
          onClick={flip}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-chess-surface/60 text-chess-subtext hover:text-chess-text hover:bg-chess-hover active:scale-[0.94] transition-all touch-manipulation"
          aria-label="Flip board"
          title="Flip board"
        >
          <FlipBoardIcon />
        </button>
      </div>
    </div>
  );
}
