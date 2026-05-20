import { hapticTap } from "../utils/chessSounds";

interface AccountLinkPromoProps {
  onConnect: () => void;
}

export function AccountLinkPromo({ onConnect }: AccountLinkPromoProps) {
  return (
    <section
      className="flex-shrink-0 flex flex-col justify-center px-4 py-5 min-h-[28vh] max-h-[32vh] border-b border-chess-border/60"
      aria-label="Connect Chess.com or Lichess"
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-chess-muted/80 text-center mb-3">
        Your games
      </p>
      <p className="text-sm text-chess-text text-center font-medium leading-snug mb-4 px-1">
        Link Chess.com or Lichess to pull in recent games
      </p>
      <div className="flex gap-2 max-w-xs mx-auto w-full">
        <button
          type="button"
          onClick={() => {
            hapticTap();
            onConnect();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-chess-border/80 bg-chess-bg/40 text-chess-text text-xs font-semibold hover:border-move-best/50 hover:bg-move-best/5 transition-colors"
        >
          <span aria-hidden>♟</span>
          Chess.com
        </button>
        <button
          type="button"
          onClick={() => {
            hapticTap();
            onConnect();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-chess-border/80 bg-chess-bg/40 text-chess-text text-xs font-semibold hover:border-move-best/50 hover:bg-move-best/5 transition-colors"
        >
          <span aria-hidden>◆</span>
          Lichess
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          hapticTap();
          onConnect();
        }}
        className="mt-3 text-xs text-move-best hover:text-green-400 font-semibold text-center transition-colors"
      >
        Connect account →
      </button>
    </section>
  );
}
