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
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        if (seg.kind === "player") {
          return (
            <span key={i} className="text-chess-text font-medium">
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
            className={`inline font-mono text-[0.95em] font-medium align-baseline cursor-pointer border-0 bg-transparent p-0 mx-0.5 underline underline-offset-[3px] transition-opacity hover:opacity-80 ${
              meta
                ? ""
                : "text-chess-accent decoration-chess-accent/35 hover:decoration-chess-accent/60"
            }`}
            style={
              meta
                ? {
                    color: meta.color,
                    textDecorationColor: `${meta.color}50`,
                  }
                : undefined
            }
            title={meta ? `${seg.label} — ${meta.label}` : seg.label}
          >
            {seg.label}
          </button>
        );
      })}
    </>
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
    <div className="rounded-xl border border-chess-border/60 bg-chess-bg/30 p-3.5 mb-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-chess-muted mb-2.5">
        Game story
      </p>
      <div className="space-y-2">
        {story.lines.map((line, i) => (
          <p
            key={i}
            className={
              i === 0
                ? "text-[13px] text-chess-text leading-[1.55]"
                : "text-xs text-chess-subtext leading-[1.5] pl-2.5 border-l border-chess-border/50"
            }
          >
            <StoryText segments={line} onJumpToMove={onJumpToMove} />
          </p>
        ))}
      </div>
    </div>
  );
}
