import type { GameEndInfo } from "../utils/gameEnd";

interface BoardGameEndOverlayProps {
  end: GameEndInfo;
  whiteName: string;
  blackName: string;
}

const KIND_LABEL: Record<string, string> = {
  checkmate: "Checkmate",
  resignation: "Resignation",
  timeout: "Time out",
  abandoned: "Abandoned",
  draw: "Draw",
  repetition: "Draw",
  stalemate: "Stalemate",
  insufficient: "Draw",
  other: "Game over",
};

export function BoardGameEndOverlay({
  end,
  whiteName,
  blackName,
}: BoardGameEndOverlayProps) {
  const winnerColor = end.winner;

  const winnerName =
    winnerColor === "w" ? whiteName : winnerColor === "b" ? blackName : null;
  const headline = KIND_LABEL[end.kind] ?? end.headline;

  const isDraw = !winnerColor;
  const accent = isDraw ? "#bdbab9" : "#f0c050";

  return (
    <div
      className="absolute inset-0 z-30 pointer-events-none board-game-end-layer"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-black/20" aria-hidden />

      {/* Verdict card, centred on the board */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="board-verdict-card"
          style={{ borderColor: `${accent}55` }}
        >
          {!isDraw ? (
            <svg
              className="board-verdict-crown"
              viewBox="0 0 24 24"
              fill={accent}
              aria-hidden
            >
              <path d="M3 8l3.5 3L12 5l5.5 6L21 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
            </svg>
          ) : (
            <svg
              className="board-verdict-crown"
              viewBox="0 0 24 24"
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M16 11a4 4 0 0 0-8 0" />
              <path d="M5 16l3-2 4 2 4-2 3 2" />
            </svg>
          )}
          <p
            className="text-[13px] font-bold leading-none tracking-wide uppercase"
            style={{ color: accent }}
          >
            {headline}
          </p>
          {winnerName ? (
            <p className="text-xs text-white/85 leading-tight">
              <span className="font-semibold">{winnerName}</span> wins
            </p>
          ) : (
            <p className="text-xs text-white/70 leading-tight">{end.detail}</p>
          )}
          {winnerName && end.detail && end.detail.toLowerCase() !== `${winnerName.toLowerCase()} wins` && (
            <p className="text-[10px] text-white/55 leading-tight">{end.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
