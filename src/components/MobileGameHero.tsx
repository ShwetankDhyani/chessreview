import { EvalBar } from "./EvalBar";
import { ReviewChessboard } from "./ReviewChessboard";

interface MobileGameHeroProps {
  boardWidth: number;
  boardOrientation: "white" | "black";
  whiteName: string;
  blackName: string;
  whiteRating?: number | null;
  blackRating?: number | null;
  hasGame: boolean;
  analyzing?: boolean;
  onAnalyze?: () => void;
  timeClass?: string;
}

export function MobileGameHero({
  boardWidth,
  boardOrientation,
  whiteName,
  blackName,
  whiteRating,
  blackRating,
  hasGame,
  analyzing = false,
  onAnalyze,
  timeClass,
}: MobileGameHeroProps) {
  const topName = boardOrientation === "black" ? whiteName : blackName;
  const bottomName = boardOrientation === "black" ? blackName : whiteName;
  const topRating = boardOrientation === "black" ? whiteRating : blackRating;
  const bottomRating = boardOrientation === "black" ? blackRating : whiteRating;
  const topColor: "white" | "black" =
    boardOrientation === "black" ? "white" : "black";
  const bottomColor: "white" | "black" =
    boardOrientation === "black" ? "black" : "white";

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <PlayerStrip name={topName} rating={topRating} color={topColor} align="top" />

      <div
        className="relative rounded-lg overflow-hidden border border-chess-border shadow-lg"
        style={{
          background:
            "linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #252525 100%)",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent z-10 pointer-events-none" />

        <div className="flex items-stretch gap-1.5 p-1.5">
          <EvalBar
            evalResult={{ cp: 0, depth: 0, source: "local" }}
            boardFlipped={boardOrientation === "black"}
            barHeight={boardWidth}
            compact
          />
          <div className="relative" style={{ width: boardWidth, height: boardWidth }}>
            <ReviewChessboard
              position="start"
              boardWidth={boardWidth}
              boardOrientation={boardOrientation}
              animationDuration={0}
              dimmed={false}
              continuationActive={false}
              lastMoveHighlight={null}
              continuationArrow={null}
              showBestMoveArrow={false}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-black/55 backdrop-blur-sm border border-white/10 shadow-xl">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-move-best">
                  vs
                </span>
                {timeClass && (
                  <span className="text-[9px] text-chess-muted capitalize">
                    {timeClass}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlayerStrip name={bottomName} rating={bottomRating} color={bottomColor} align="bottom" />

      {hasGame && onAnalyze ? (
        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzing}
          className="w-full max-w-sm flex items-center justify-center gap-2 bg-move-best hover:bg-green-600 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-md"
        >
          {analyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <span>🔍</span>
              Start Game Review
            </>
          )}
        </button>
      ) : (
        <p className="text-xs text-chess-muted text-center px-4 leading-relaxed">
          Open <span className="text-move-best font-semibold">Games</span> and pick
          a match to review
        </p>
      )}
    </div>
  );
}

function PlayerStrip({
  name,
  rating,
  color,
  align,
}: {
  name: string;
  rating?: number | null;
  color: "white" | "black";
  align: "top" | "bottom";
}) {
  return (
    <div
      className={`w-full max-w-sm flex items-center gap-2 px-2 py-1 rounded-md border border-chess-border/80 bg-chess-panel/90 ${
        align === "top" ? "mb-0.5" : "mt-0.5"
      }`}
    >
      <div
        className="w-8 h-8 rounded-md border flex-shrink-0 flex items-center justify-center text-lg font-bold"
        style={{
          backgroundColor: color === "white" ? "#e8e6e3" : "#1a1a1a",
          borderColor: color === "white" ? "#ccc" : "#555",
          color: color === "white" ? "#333" : "#aaa",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-chess-text truncate">{name}</div>
        {rating != null && (
          <div className="text-[10px] text-chess-muted font-mono">{rating}</div>
        )}
      </div>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color === "white" ? "#e8e6e3" : "#333" }}
      />
    </div>
  );
}
