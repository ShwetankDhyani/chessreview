import React from "react";
import type { AnalyzedMove, ReviewSummary } from "../types";
import {
  buildReviewStory,
  PLAYER_NAME_STYLE,
  type StorySegment,
} from "../utils/reviewStory";

interface ReviewStoryCardProps {
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  whiteName: string;
  blackName: string;
}

function StoryText({ segments }: { segments: StorySegment[] }) {
  return (
    <span className="inline leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        const style = PLAYER_NAME_STYLE[seg.side];
        return (
          <span
            key={i}
            className="font-semibold tracking-tight"
            style={{ color: style.color, fontWeight: style.fontWeight }}
          >
            {seg.name}
          </span>
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
}: ReviewStoryCardProps) {
  const story = buildReviewStory(summary, moves, whiteName, blackName);

  return (
    <div className="rounded-xl border border-chess-accent/20 bg-gradient-to-br from-chess-accent/10 via-chess-bg/40 to-transparent p-3.5 mb-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-chess-accent/90 mb-2">
        Game story
      </p>
      <p className="text-sm text-chess-subtext leading-relaxed">
        <StoryText segments={story.body} />
      </p>
    </div>
  );
}
