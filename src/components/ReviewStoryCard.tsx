import React, { useState } from "react";
import type { AnalyzedMove, ReviewSummary } from "../types";
import { buildReviewStory } from "../utils/reviewStory";
import { hapticTap } from "../utils/chessSounds";

interface ReviewStoryCardProps {
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  whiteName: string;
  blackName: string;
  onJumpToMove: (idx: number) => void;
}

export function ReviewStoryCard({
  summary,
  moves,
  whiteName,
  blackName,
  onJumpToMove,
}: ReviewStoryCardProps) {
  const [copied, setCopied] = useState(false);
  const story = buildReviewStory(summary, moves, whiteName, blackName);

  const copyHomework = async () => {
    if (story.homework.length === 0) return;
    hapticTap();
    const lines = story.homework.map(
      (h, i) => `${i + 1}. ${h.label}\nFEN: ${h.fen}`
    );
    const text = `ChessReview homework\n${story.headline}\n\n${lines.join("\n\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-chess-accent/25 bg-gradient-to-br from-chess-accent/12 to-transparent p-3.5 mb-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-chess-accent mb-1.5">
        Game story
      </p>
      <p className="text-sm text-chess-text font-medium leading-snug">
        {story.headline}
      </p>
      <ul className="mt-2 space-y-1">
        {story.bullets.map((b, i) => (
          <li
            key={i}
            className="text-xs text-chess-subtext leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-chess-muted"
          >
            {b}
          </li>
        ))}
      </ul>

      {story.homework.length > 0 && (
        <div className="mt-3 pt-3 border-t border-chess-accent/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted">
              Replay these
            </span>
            <button
              type="button"
              onClick={() => void copyHomework()}
              className="text-[10px] font-semibold text-chess-accent hover:underline"
            >
              {copied ? "Copied" : "Copy FENs"}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {story.homework.map((h) => (
              <button
                key={h.moveIdx}
                type="button"
                onClick={() => onJumpToMove(h.moveIdx)}
                className="text-left text-xs font-mono px-2 py-1.5 rounded-lg border border-chess-border/60 bg-chess-bg/50 hover:border-chess-accent/40 hover:text-chess-accent transition-colors"
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
