import { EP_CLASS_THRESHOLDS } from "../analysis/types";
import type { AnalyzedMove } from "../types";

function normalizeUci(uci: string): string {
  return uci.replace(/[^a-h0-9]/gi, "").slice(0, 4);
}

/** @deprecated Use coachShowsBestWas from moveFactSheet — kept for continuation panel. */
export function shouldShowBestMoveArrow(
  move: AnalyzedMove | null | undefined
): boolean {
  if (!move?.bestMove || move.bestMove.length < 4) return false;
  if (move.inOpeningBook || move.classification === "book") return false;
  return true;
}

/** Show engine best-move hint unless the played move is book or already engine-best. */
export function shouldSuggestBestMove(
  move: AnalyzedMove | null | undefined
): boolean {
  if (!move?.bestMove || move.bestMove.length < 4) return false;

  if (move.inOpeningBook || move.classification === "book") return false;

  const classification = move.classification;
  if (classification === "best") return false;

  const played = normalizeUci(move.uci);
  const engine = normalizeUci(move.bestMove);
  if (played && engine && played === engine) return false;

  if (
    move.bestMoveSan &&
    move.san &&
    move.bestMoveSan.replace(/[+#]/g, "") === move.san.replace(/[+#]/g, "")
  ) {
    return false;
  }

  const epLoss = move.epLoss ?? 1;
  if (epLoss <= EP_CLASS_THRESHOLDS.inaccuracy) {
    if (
      classification === "excellent" ||
      classification === "good" ||
      classification === "great"
    ) {
      return false;
    }
  }

  return true;
}
