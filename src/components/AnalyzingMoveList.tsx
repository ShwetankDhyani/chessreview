import { useEffect, useRef } from "react";
import type { ReplayFrame } from "../utils/pgnReplay";

interface AnalyzingMoveListProps {
  frames: ReplayFrame[];
  currentPly: number;
}

/**
 * Skeleton MoveList shown while analysis is running: rows are greyed-out SANs
 * from the PGN replay frames. The row matching the currently-scanned ply gets
 * a subtle shimmer so the user can see progress sweep through the game.
 */
export function AnalyzingMoveList({ frames, currentPly }: AnalyzingMoveListProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentPly]);

  if (frames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-chess-muted text-xs gap-2 px-3 text-center">
        <span>Preparing analysis…</span>
      </div>
    );
  }

  const pairs: Array<[ReplayFrame | undefined, ReplayFrame | undefined]> = [];
  for (let i = 0; i < frames.length; i += 2) {
    pairs.push([frames[i], frames[i + 1]]);
  }

  return (
    <div className="pr-1">
      <div className="space-y-0.5">
        {pairs.map((pair, pairIdx) => {
          const whiteIdx = pairIdx * 2;
          const blackIdx = pairIdx * 2 + 1;
          return (
            <div
              key={pairIdx}
              className="flex items-center gap-0.5 rounded-sm"
            >
              <span className="w-7 text-right text-xs text-chess-muted font-mono pr-1 flex-shrink-0">
                {pairIdx + 1}.
              </span>
              <SkeletonMove
                frame={pair[0]}
                isCurrent={whiteIdx === currentPly}
                isScanned={whiteIdx < currentPly}
                ref={whiteIdx === currentPly ? activeRef : null}
              />
              <SkeletonMove
                frame={pair[1]}
                isCurrent={blackIdx === currentPly}
                isScanned={blackIdx < currentPly}
                ref={blackIdx === currentPly ? activeRef : null}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from "react";

const SkeletonMove = React.forwardRef<
  HTMLDivElement,
  { frame?: ReplayFrame; isCurrent: boolean; isScanned: boolean }
>(({ frame, isCurrent, isScanned }, ref) => {
  if (!frame) {
    return <div className="flex-1" />;
  }
  return (
    <div
      ref={ref}
      className={`relative flex-1 flex items-center px-2 py-1 rounded text-sm font-mono overflow-hidden ${
        isCurrent
          ? "bg-chess-accent/15 text-chess-text ring-1 ring-inset ring-chess-accent/40"
          : isScanned
            ? "text-chess-subtext"
            : "text-chess-muted/55"
      }`}
    >
      <span className="truncate">{frame.san}</span>
      {isCurrent && (
        <span
          className="absolute inset-y-0 -left-2 w-[140%] pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, rgba(129,182,76,0.18) 50%, transparent 65%)",
            animation: "analysisShimmer 1.8s ease-in-out infinite",
          }}
          aria-hidden
        />
      )}
    </div>
  );
});
SkeletonMove.displayName = "SkeletonMove";
