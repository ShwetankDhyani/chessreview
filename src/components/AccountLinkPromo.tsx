import { hapticTap } from "../utils/chessSounds";

type Platform = "chesscom" | "lichess";

interface AccountLinkPromoProps {
  onConnect: (platform: Platform) => void;
}

export function AccountLinkPromo({ onConnect }: AccountLinkPromoProps) {
  return (
    <section
      className="flex-shrink-0 flex items-center justify-center px-4 py-6 min-h-[22vh] max-h-[26vh] border-b border-chess-border/60"
      aria-label="Connect account"
    >
      <div className="flex gap-2 w-full max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => {
            hapticTap();
            onConnect("chesscom");
          }}
          className="flex-1 py-3 rounded-xl border border-chess-border/80 bg-chess-bg/40 text-chess-text text-xs font-semibold hover:border-move-best/50 hover:bg-move-best/5 transition-colors"
        >
          Chess.com
        </button>
        <button
          type="button"
          onClick={() => {
            hapticTap();
            onConnect("lichess");
          }}
          className="flex-1 py-3 rounded-xl border border-chess-border/80 bg-chess-bg/40 text-chess-text text-xs font-semibold hover:border-move-best/50 hover:bg-move-best/5 transition-colors"
        >
          Lichess
        </button>
      </div>
    </section>
  );
}
