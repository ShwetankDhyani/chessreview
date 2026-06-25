import { isDeliveredCheckmate } from "../analysis/mateDetection";
import type { AnalyzedMove } from "../types";
import { buildFactualMoveComment } from "./factualMoveComment";

export { commentarySeed } from "./coachVariety";

export type PositionOutlook =
  | "winning_mate"
  | "crushing"
  | "comfortable"
  | "slight_edge"
  | "level"
  | "slight_down"
  | "trouble"
  | "desperate"
  | "losing_mate";

export function playerCp(move: AnalyzedMove, when: "before" | "after"): number {
  const e = when === "before" ? move.evalBefore : move.evalAfter;
  if (!e) return 0;
  if (e.mate !== undefined) {
    const whiteWinning = e.mate > 0;
    const playerWinning = move.color === "w" ? whiteWinning : !whiteWinning;
    const sign = playerWinning ? 1 : -1;
    return sign * (9000 - Math.min(Math.abs(e.mate), 20) * 400);
  }
  const cp = e.cp ?? 0;
  return move.color === "w" ? cp : -cp;
}

export function getPositionOutlook(
  move: AnalyzedMove,
  when: "before" | "after" = "after"
): PositionOutlook {
  const e = when === "before" ? move.evalBefore : move.evalAfter;
  if (!e) return "level";
  if (e.mate !== undefined) {
    const whiteWinning = e.mate > 0;
    const playerWinning = move.color === "w" ? whiteWinning : !whiteWinning;
    return playerWinning ? "winning_mate" : "losing_mate";
  }
  const cp = playerCp(move, when);
  if (cp >= 400) return "crushing";
  if (cp >= 200) return "comfortable";
  if (cp >= 50) return "slight_edge";
  if (cp >= -50) return "level";
  if (cp >= -200) return "slight_down";
  if (cp >= -400) return "trouble";
  return "desperate";
}

function isAlreadyLost(outlook: PositionOutlook): boolean {
  return outlook === "trouble" || outlook === "desperate" || outlook === "losing_mate";
}

function stillLosingAfter(outlook: PositionOutlook): boolean {
  return (
    outlook === "slight_down" ||
    outlook === "trouble" ||
    outlook === "desperate" ||
    outlook === "losing_mate"
  );
}

function isAlreadyWinning(outlook: PositionOutlook): boolean {
  return (
    outlook === "crushing" ||
    outlook === "comfortable" ||
    outlook === "winning_mate"
  );
}

export function describePositionForCoach(move: AnalyzedMove): string {
  const before = getPositionOutlook(move, "before");
  const after = getPositionOutlook(move, "after");
  const cpBefore = (playerCp(move, "before") / 100).toFixed(1);
  const cpAfter = (playerCp(move, "after") / 100).toFixed(1);
  const lines: string[] = [
    `Eval for the student before → after: ${cpBefore} → ${cpAfter} (positive = student better).`,
    `Before the move: ${before.replace(/_/g, " ")}. After: ${after.replace(/_/g, " ")}.`,
  ];

  if (move.classification === "brilliant" && stillLosingAfter(after)) {
    lines.push("Student is still losing after this move.");
  } else if (move.classification === "blunder" && isAlreadyLost(before)) {
    lines.push("Position was already losing before this move.");
  } else if (
    (move.classification === "best" || move.classification === "excellent") &&
    isAlreadyWinning(before)
  ) {
    lines.push("Student was already winning.");
  }

  return lines.join("\n");
}

/** Factual per-move commentary for the coach panel. */
export function getPositionAwareMoveComment(
  move: AnalyzedMove,
  moveIdx = 0,
  openingHint?: string,
  _trackUsage = true,
  moves?: AnalyzedMove[]
): string | null {
  if (!move.classification) return null;
  if (isDeliveredCheckmate(move.fenAfter)) {
    return "Checkmate. Game over.";
  }
  return buildFactualMoveComment(move, { openingHint, moveIdx, moves });
}
