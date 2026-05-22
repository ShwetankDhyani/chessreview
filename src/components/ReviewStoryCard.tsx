import React, { useState } from "react";
import type { AnalyzedMove, MoveClassification, ReviewSummary } from "../types";
import {
  buildReviewStory,
  formatMoveLabel,
  PLAYER_NAME_STYLE,
  type StorySegment,
} from "../utils/reviewStory";
import { CLASSIFICATION_META } from "../utils/classificationMeta";
import { ClassificationIcon } from "./ClassificationIcon";
import { hapticTap } from "../utils/chessSounds";

interface ReviewStoryCardProps {
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  whiteName: string;
  blackName: string;
  onJumpToMove: (idx: number) => void;
}

function StoryBody({
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
        }
        const meta = seg.classification
          ? CLASSIFICATION_META[
              seg.classification as keyof typeof CLASSIFICATION_META
            ]
          : null;
        const color = meta?.color ?? "#e6c84a";
        const label = formatMoveLabel(seg.moveNumber, seg.color, seg.san);
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              hapticTap();
              onJumpToMove(seg.moveIdx);
            }}
            className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold align-baseline transition-all hover:brightness-125 hover:scale-[1.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-chess-accent/60"
            style={{
              color,
              backgroundColor: `${color}18`,
              border: `1px solid ${color}40`,
            }}
            title={
              meta
                ? `${label} — ${meta.label}${seg.swing != null ? ` (±${seg.swing.toFixed(1)})` : ""}`
                : label
            }
          >
            {seg.classification && (
              <ClassificationIcon
                type={seg.classification as NonNullable<MoveClassification>}
                size="xs"
              />
            )}
            {label}
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
  const [copied, setCopied] = useState(false);
  const story = buildReviewStory(summary, moves, whiteName, blackName);

  const copyHomework = async () => {
    if (story.homework.length === 0) return;
    hapticTap();
    const lines = story.homework.map(
      (h, i) => `${i + 1}. ${h.label}\nFEN: ${h.fen}`
    );
    const plainHeadline = story.headline
      .map((s) => (s.kind === "text" ? s.value : s.kind === "player" ? s.name : formatMoveLabel(s.moveNumber, s.color, s.san)))
      .join("");
    const text = `ChessReview homework\n${plainHeadline}\n\n${lines.join("\n\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-chess-accent/20 bg-gradient-to-br from-chess-accent/10 via-chess-bg/40 to-transparent p-3.5 mb-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-chess-accent/90 mb-2">
        Game story
      </p>
      <p className="text-[15px] text-chess-text font-medium leading-snug font-[family-name:var(--font-display,ui-serif,Georgia,serif)]">
        <StoryBody segments={story.headline} onJumpToMove={onJumpToMove} />
      </p>
      <ul className="mt-2.5 space-y-2">
        {story.bullets.map((bullet, i) => (
          <li
            key={i}
            className="text-xs text-chess-subtext leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[0.55em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-chess-accent/50"
          >
            <StoryBody segments={bullet} onJumpToMove={onJumpToMove} />
          </li>
        ))}
      </ul>

      {story.homework.length > 0 && (
        <div className="mt-3 pt-3 border-t border-chess-accent/15">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-chess-muted">
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
            {story.homework.map((h) => {
              const meta = h.classification
                ? CLASSIFICATION_META[
                    h.classification as keyof typeof CLASSIFICATION_META
                  ]
                : null;
              const color = meta?.color ?? "#ca3c3c";
              return (
                <button
                  key={h.moveIdx}
                  type="button"
                  onClick={() => {
                    hapticTap();
                    onJumpToMove(h.moveIdx);
                  }}
                  className="group flex items-center gap-2 text-left text-xs px-2.5 py-2 rounded-lg border border-chess-border/50 bg-chess-bg/40 hover:border-chess-accent/35 hover:bg-chess-accent/5 transition-colors"
                >
                  {h.classification && (
                    <ClassificationIcon
                      type={h.classification as NonNullable<MoveClassification>}
                      size="xs"
                    />
                  )}
                  <span
                    className="font-mono font-bold tabular-nums"
                    style={{ color }}
                  >
                    {h.moveNumber}
                    {h.color === "w" ? "." : "…"}
                    {h.san}
                  </span>
                  {meta && (
                    <span
                      className="text-[10px] font-medium opacity-80 group-hover:opacity-100"
                      style={{ color }}
                    >
                      {meta.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
