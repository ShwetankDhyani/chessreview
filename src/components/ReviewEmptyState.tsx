import { hapticSelection } from "../utils/chessSounds";

interface ReviewEmptyStateProps {
  onGoToGames: () => void;
}

export function ReviewEmptyState({ onGoToGames }: ReviewEmptyStateProps) {
  return (
    <section className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
      <span aria-hidden className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-chess-accent/20 bg-chess-accent/[0.07] text-3xl text-chess-accent shadow-rim">♞</span>
      <h2 className="text-lg font-bold tracking-tight text-chess-text">Find the turning point.</h2>
      <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-chess-muted">
        Add a game to explore your accuracy, move grades, and coach notes.
      </p>
      <button type="button" onClick={() => { hapticSelection(); onGoToGames(); }}
        className="cr-btn-primary mt-6 min-h-11 gap-2 text-sm">
        Add a game <span aria-hidden>→</span>
      </button>
      <p className="mt-3 text-xs text-chess-muted">Chess.com, Lichess, or PGN</p>
    </section>
  );
}
