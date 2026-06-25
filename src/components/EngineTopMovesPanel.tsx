import React, { useEffect, useState } from "react";
import type { AnalyzedMove } from "../types";
import {
  fetchEngineTopMoves,
  playedInTopThree,
  type EngineTopMove,
} from "../utils/engineTopMoves";

interface EngineTopMovesPanelProps {
  move: AnalyzedMove;
  embedded?: boolean;
}

function rankLabel(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

export const EngineTopMovesPanel: React.FC<EngineTopMovesPanelProps> = ({
  move,
  embedded = false,
}) => {
  const [topMoves, setTopMoves] = useState<EngineTopMove[] | null>(null);
  const [loading, setLoading] = useState(false);

  const skip =
    move.forced ||
    move.classification === "book" ||
    move.inOpeningBook;

  useEffect(() => {
    if (skip) {
      setTopMoves(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setTopMoves(null);

    const depth =
      move.evalBefore?.depth && move.evalBefore.depth >= 12
        ? Math.min(move.evalBefore.depth, 16)
        : 14;

    fetchEngineTopMoves(move.fenBefore, move.uci, move.color, { depth })
      .then((moves) => {
        if (!cancelled) {
          setTopMoves(moves.length > 0 ? moves : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTopMoves(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    skip,
    move.fenBefore,
    move.uci,
    move.color,
    move.evalBefore?.depth,
  ]);

  if (skip) return null;
  if (!loading && !topMoves) return null;

  const playedInTop = topMoves ? playedInTopThree(topMoves) : false;

  return (
    <div
      className={
        embedded
          ? "border-l-2 border-chess-border/40 pl-2.5 py-0.5"
          : "rounded-md border border-chess-border/50 p-2.5"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-chess-muted mb-2">
        Top engine moves
      </p>

      {loading && (
        <p className="text-xs text-chess-muted animate-pulse">Searching…</p>
      )}

      {!loading && topMoves && (
        <ol className="space-y-1.5">
          {topMoves.map((entry) => (
            <li
              key={`${entry.rank}-${entry.uci}`}
              className={`flex items-center gap-2 text-xs rounded px-1.5 py-1 ${
                entry.isPlayed
                  ? "bg-chess-accent/15 ring-1 ring-chess-accent/35"
                  : ""
              }`}
            >
              <span className="text-chess-muted w-7 shrink-0 tabular-nums">
                {rankLabel(entry.rank)}
              </span>
              <span className="font-mono font-semibold text-chess-text flex-1 min-w-0">
                {entry.san}
              </span>
              <span className="font-mono text-chess-muted shrink-0 tabular-nums">
                {entry.evalLabel}
              </span>
              {entry.isPlayed && (
                <span className="text-[10px] text-chess-accent shrink-0">
                  played
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {!loading && topMoves && !playedInTop && (
        <p className="text-[10px] text-chess-muted mt-2">
          You played{" "}
          <span className="font-mono text-chess-text">{move.san}</span> — outside
          the top 3.
        </p>
      )}
    </div>
  );
};
