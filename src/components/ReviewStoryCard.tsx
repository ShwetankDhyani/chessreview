import React from "react";
import type { AnalyzedMove, ReviewSummary } from "../types";
import { buildReviewStory, type StorySegment } from "../utils/reviewStory";
import { CLASSIFICATION_META } from "../utils/classificationMeta";
import { hapticTap } from "../utils/chessSounds";

interface ReviewStoryCardProps {
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  whiteName: string;
  blackName: string;
  onJumpToMove: (idx: number) => void;
}

function StoryText({
  segments,
  onJumpToMove,
}: {
  segments: StorySegment[];
  onJumpToMove: (idx: number) => void;
}) {
  return (
    <span className="inline leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        if (seg.kind === "player") {
          return (
            <span
              key={i}
              className="font-medium text-chess-text/95 bg-chess-border/25 px-1 rounded-sm box-decoration-clone"
            >
              {seg.name}
            </span>
          );
        }
        const meta = seg.classification
          ? CLASSIFICATION_META[
              seg.classification as keyof typeof CLASSIFICATION_META
            ]
          : null;
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              hapticTap();
              onJumpToMove(seg.moveIdx);
            }}
            className={`inline font-mono text-[0.92em] font-semibold align-baseline cursor-pointer border-0 bg-transparent p-0 mx-0.5 underline underline-offset-[3px] transition-colors hover:opacity-90 ${
              meta ? "" : "text-chess-accent decoration-chess-accent/40 hover:decoration-chess-accent/70"
            }`}
            style={
              meta
                ? {
                    color: meta.color,
                    textDecorationColor: `${meta.color}55`,
                  }
                : undefined
            }
            title={meta ? `${seg.label} — ${meta.label}` : seg.label}
          >
            {seg.label}
          </button>
        );
      })}
    </span>
  );
}

export function ReviewStoryCard({
  summary,
  moves,
  whiteName,
  blackName,
  onJumpToMove,
}: ReviewStoryCardProps) {
  const story = buildReviewStory(summary, moves, whiteName, blackName);

  return (
    <div className="rounded-xl border border-chess-accent/20 bg-gradient-to-br from-chess-accent/10 via-chess-bg/40 to-transparent p-3.5 mb-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-chess-accent/90 mb-2">
        Game story
      </p>
      <p className="text-sm text-chess-subtext leading-relaxed">
        <StoryText segments={story.body} onJumpToMove={onJumpToMove} />
      </p>
    </div>
  );
}
