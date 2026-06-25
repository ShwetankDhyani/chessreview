import type { AnalyzedMove } from "../types";

function normalizeUci(uci: string): string {
  return uci.replace(/[^a-h0-9]/gi, "").slice(0, 4);
}

/** Non-book moves with a stored engine best line. */
export function shouldShowBestMoveHint(
  move: AnalyzedMove | null | undefined
): boolean {
  if (!move?.bestMove || move.bestMove.length < 4) return false;
  if (move.inOpeningBook || move.classification === "book") return false;
  if (move.forced) return false;
  return true;
}

/** Step-through engine line in the coach panel. */
export function shouldShowBestContinuation(
  move: AnalyzedMove | null | undefined
): boolean {
  if (!shouldShowBestMoveHint(move)) return false;
  return !!(move?.bestMoveSan || move?.bestMove);
}

/** @deprecated Use shouldShowBestMoveHint */
export function shouldSuggestBestMove(
  move: AnalyzedMove | null | undefined
): boolean {
  return shouldShowBestMoveHint(move);
}

export function playedMatchesEngineBest(move: AnalyzedMove): boolean {
  if (!move.bestMove || move.bestMove.length < 4) return false;
  const played = normalizeUci(move.uci);
  const engine = normalizeUci(move.bestMove);
  if (played && engine && played === engine) return true;
  if (
    move.bestMoveSan &&
    move.san &&
    move.bestMoveSan.replace(/[+#]/g, "") === move.san.replace(/[+#]/g, "")
  ) {
    return true;
  }
  return false;
}
