import { hapticTap } from "../utils/chessSounds";

type Platform = "chesscom" | "lichess";

interface AccountLinkPromoProps {
  onConnect: (platform: Platform) => void;
}

/** Stylised chess.com pawn mark. */
function ChessComMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden
    >
      <path d="M16 4a4 4 0 0 0-2.4 7.2c-1.6 1.1-2.6 3-2.6 5.1V18h10v-1.7c0-2.1-1-4-2.6-5.1A4 4 0 0 0 16 4zM9 20h14l-1.2 4.6c-.2.8-.9 1.4-1.7 1.4h-8.2c-.8 0-1.5-.6-1.7-1.4L9 20zM7 28h18v2H7v-2z" />
    </svg>
  );
}

/** Stylised lichess knight mark. */
function LichessMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.5 3.5c-.4.6-.4 1.6 0 2.3.6 1 .3 1.4-1.2 1.6-1.6.3-3.4 2-4.1 4-.7 1.8-.6 1.9 1.2 2.3 1 .2 2 .6 2.2.7.2.2-.5 1.2-1.7 2.2-2.6 2.4-3 4-1.4 6 .7.8 1.3 2 1.3 2.5 0 .5.4 1 .8 1 .5 0 .8.3.8.7s2.7.8 7 1c4.3.2 7-.1 7-.7 0-.6.7-1 1.5-1 1.7 0 1.9-1 .9-3.4-.4-.9-.7-3.2-.7-5.2 0-2-.6-5-1.4-6.6C22.4 8.4 22 6.6 22.3 5.5c.4-1.4.1-2-1.5-3-1.1-.7-3-1.4-4.2-1.4-1.3 0-2.6.4-3 .9-.6.7-1 .7-1.6.1-.5-.5-.5-.3 0 .4z M14 12c.4 0 .8.4.8.8s-.4.7-.8.7-.8-.3-.8-.7.4-.8.8-.8z" />
    </svg>
  );
}

export function AccountLinkPromo({ onConnect }: AccountLinkPromoProps) {
  const pick = (platform: Platform) => {
    hapticTap();
    onConnect(platform);
  };

  return (
    <section
      className="page-inline-pad flex-shrink-0 py-5 border-b border-chess-border/50"
      aria-label="Connect with Chess.com or Lichess"
    >
      <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-chess-muted text-center mb-3">
        Connect with
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => pick("chesscom")}
          className="group flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-chess-border bg-chess-surface/60 hover:bg-chess-accent/10 hover:border-chess-accent/40 transition-colors"
        >
          <ChessComMark className="h-6 w-6 text-chess-subtext group-hover:text-chess-accent transition-colors" />
          <span className="text-xs font-semibold text-chess-text leading-none">
            Chess.com
          </span>
        </button>
        <button
          type="button"
          onClick={() => pick("lichess")}
          className="group flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-chess-border bg-chess-surface/60 hover:bg-[#dddccd]/[0.06] hover:border-[#dddccd]/40 transition-colors"
        >
          <LichessMark className="h-6 w-6 text-chess-subtext group-hover:text-[#dddccd] transition-colors" />
          <span className="text-xs font-semibold text-chess-text leading-none">
            Lichess
          </span>
        </button>
      </div>
    </section>
  );
}
