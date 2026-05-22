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
            <span key={i} className="text-chess-subtext/90 font-medium">
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
            className={`inline font-mono text-[0.92em] font-medium align-baseline cursor-pointer border-0 bg-transparent p-0 mx-0.5 underline underline-offset-[3px] decoration-chess-muted/40 transition-opacity hover:opacity-80 ${
              meta ? "" : "text-chess-subtext decoration-chess-accent/30 hover:decoration-chess-accent/50"
            }`}
            style={
              meta
                ? {
                    color: `${meta.color}bb`,
                    textDecorationColor: `${meta.color}40`,
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
    <div className="rounded-xl border border-chess-accent/20 bg-gradient-to-br from-chess-accent/[0.08] via-chess-bg/50 to-transparent p-3.5 mb-3 shadow-sm">
      <p className="text-xs text-chess-muted font-semibold uppercase tracking-wider mb-2 px-1">
        Game story
      </p>
      <div className="space-y-2.5 px-1">
        {story.lines.map((line, i) => (
          <p
            key={i}
            className={
              i === 0
                ? "text-xs text-chess-subtext font-medium leading-relaxed"
                : "text-xs text-chess-muted leading-relaxed pl-2.5 border-l border-chess-border/40"
            }
          >
            <StoryText segments={line} onJumpToMove={onJumpToMove} />
          </p>
        ))}
      </div>
    </div>
  );
}
