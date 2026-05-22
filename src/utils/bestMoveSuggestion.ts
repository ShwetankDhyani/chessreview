import type { AnalyzedMove } from "../types";

/** Show engine best-move hint unless the played move is book or already engine-best. */
export function shouldSuggestBestMove(
  move: AnalyzedMove | null | undefined
): boolean {
  if (!move?.bestMove || move.bestMove.length < 4) return false;

  const classification = move.classification;
  if (classification === "best" || classification === "book") return false;

  const played = move.uci.replace(/[^a-h0-9]/gi, "").slice(0, 4);
  const engine = move.bestMove.replace(/[^a-h0-9]/gi, "").slice(0, 4);
  if (played && engine && played === engine) return false;

  return true;
}
