import { hapticSelection } from "../utils/chessSounds";

interface ReviewEmptyStateProps {
  onGoToGames: () => void;
}

export function ReviewEmptyState({ onGoToGames }: ReviewEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[220px] px-5 py-10 text-center">
      <button
        type="button"
        onClick={() => {
          hapticSelection();
          onGoToGames();
        }}
        className="group flex flex-col items-center gap-3 rounded-xl border border-dashed border-chess-border/60 bg-chess-bg/25 px-7 py-5 transition-colors hover:border-chess-accent/35 hover:bg-chess-accent/[0.06] focus:outline-none focus-visible:ring-1 focus-visible:ring-chess-accent/50"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full border border-chess-border/70 bg-chess-surface/80 text-lg font-light text-chess-subtext transition-colors group-hover:border-chess-accent/40 group-hover:text-chess-accent"
          aria-hidden
        >
          +
        </span>
        <span className="text-sm font-medium text-chess-subtext transition-colors group-hover:text-chess-text">
          Add or load a game
        </span>
      </button>
      <p className="mt-3.5 max-w-[13rem] text-xs text-chess-muted leading-relaxed">
        Open Games to import a match, then run review here.
      </p>
    </div>
  );
}
