import { hapticTap } from "../utils/chessSounds";

type Platform = "chesscom" | "lichess";

interface AccountLinkPromoProps {
  onConnect: (platform: Platform) => void;
}

export function AccountLinkPromo({ onConnect }: AccountLinkPromoProps) {
  const pick = (platform: Platform) => {
    hapticTap();
    onConnect(platform);
  };

  return (
    <section
      className="flex-shrink-0 flex flex-col items-center justify-center gap-4 px-5 py-7 min-h-[22vh] max-h-[28vh] border-b border-chess-border/50"
      aria-label="Connect with Chess.com or Lichess"
    >
      <p className="text-[11px] font-medium tracking-[0.22em] uppercase text-chess-muted/75">
        Connect with
      </p>

      <div className="inline-flex items-stretch rounded-2xl border border-chess-border/70 bg-chess-bg/50 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => pick("chesscom")}
          className="group px-5 sm:px-6 py-3 text-sm font-medium text-chess-text/90 hover:bg-move-best/10 hover:text-chess-text transition-colors"
        >
          <span className="block text-[10px] text-chess-muted/60 group-hover:text-move-best/80 mb-0.5 font-normal tracking-wide">
            ♟
          </span>
          Chess.com
        </button>
        <div className="w-px self-stretch bg-chess-border/60" aria-hidden />
        <button
          type="button"
          onClick={() => pick("lichess")}
          className="group px-5 sm:px-6 py-3 text-sm font-medium text-chess-text/90 hover:bg-[#b58863]/10 hover:text-chess-text transition-colors"
        >
          <span className="block text-[10px] text-chess-muted/60 group-hover:text-[#b58863] mb-0.5 font-normal tracking-wide">
            ◆
          </span>
          Lichess
        </button>
      </div>
    </section>
  );
}
