import type { OpeningChapter as OpeningChapterType } from "../utils/openingContext";

interface OpeningChapterProps {
  chapter: OpeningChapterType | null;
  currentMoveIndex: number;
  leftBookLabel?: string;
  onJumpToLeftBook?: () => void;
}

export function OpeningChapter({
  chapter,
  currentMoveIndex,
  leftBookLabel,
  onJumpToLeftBook,
}: OpeningChapterProps) {
  if (!chapter) return null;

  const inTheory = !chapter.leftTheory && currentMoveIndex <= chapter.endIdx;
  const sideLabel = chapter.side === "w" ? "White" : "Black";

  return (
    <div
      className={`mb-2 rounded-md border px-2.5 py-2 transition-colors ${
        inTheory
          ? "border-[#b58863]/40 bg-[#b58863]/12"
          : "border-chess-border/40 bg-chess-hover/20"
      }`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-sm flex-shrink-0 select-none" aria-hidden>
          📖
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#b58863]/90">
            {chapter.leftTheory ? "Left theory" : "In theory"}
            <span className="text-chess-muted font-medium normal-case tracking-normal ml-1.5">
              · {sideLabel}
            </span>
          </div>
          <div className="text-xs font-semibold text-chess-text mt-0.5 leading-snug">
            {chapter.eco ? (
              <span className="font-mono text-[10px] text-chess-accent/90 mr-1.5">
                {chapter.eco}
              </span>
            ) : null}
            {chapter.openingName}
          </div>
          <div className="text-[10px] text-chess-muted mt-0.5">
            {chapter.moveSummary}
          </div>
          {chapter.ideas && (
            <p className="text-[10px] text-chess-subtext mt-1 leading-snug line-clamp-3">
              {chapter.ideas}
            </p>
          )}
        </div>
      </div>
      {chapter.leftBookIdx != null && onJumpToLeftBook && leftBookLabel && (
        <button
          type="button"
          onClick={onJumpToLeftBook}
          className={`mt-1.5 text-[10px] font-medium transition-colors ${
            currentMoveIndex === chapter.leftBookIdx
              ? "text-[#b58863]"
              : "text-chess-muted hover:text-chess-subtext"
          }`}
        >
          Left book on {leftBookLabel} →
        </button>
      )}
    </div>
  );
}
