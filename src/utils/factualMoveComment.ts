import { isDeliveredCheckmate } from "../analysis/mateDetection";
import type { AnalyzedMove } from "../types";
import { getMeta } from "./classificationMeta";
import { formatSignedPawnsFromCp } from "./evalDisplay";
import { formatWinChanceLoss } from "./evalDisplay";
import {
  computeOpeningChapter,
  isLeftBookMove,
  openingHintForMove,
} from "./openingContext";

export interface FactualCommentOptions {
  openingHint?: string;
  moveIdx?: number;
  moves?: AnalyzedMove[];
}

function playerCp(move: AnalyzedMove, when: "before" | "after"): number {
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

function formatPlayerEvalPawns(move: AnalyzedMove, when: "before" | "after"): string {
  return formatSignedPawnsFromCp(playerCp(move, when));
}

function normalizeSan(san: string): string {
  return san.replace(/[+#]/g, "");
}

function playedMatchesBest(move: AnalyzedMove): boolean {
  if (!move.bestMove || move.bestMove.length < 4) return false;
  const played = move.uci.toLowerCase();
  const best = move.bestMove.toLowerCase();
  if (played === best) return true;
  if (
    move.bestMoveSan &&
    normalizeSan(move.bestMoveSan) === normalizeSan(move.san)
  ) {
    return true;
  }
  return false;
}

function rankPhrase(move: AnalyzedMove): string | null {
  if (move.engineRank != null && move.engineRank > 0) {
    if (move.engineRank === 1) return "Engine rank: 1st (best)";
    if (move.engineRank === 2) return "Engine rank: 2nd";
    if (move.engineRank === 3) return "Engine rank: 3rd";
    return `Engine rank: ${move.engineRank}th`;
  }
  if (playedMatchesBest(move)) return "Engine rank: 1st (best)";
  const n = move.engineLineCount;
  if (n && n > 0) return `Not in engine top ${n}`;
  return null;
}

function bestMovePhrase(move: AnalyzedMove): string | null {
  if (!move.bestMoveSan) return null;
  if (playedMatchesBest(move)) return null;
  return `Best was ${move.bestMoveSan}`;
}

/** Short, factual per-move commentary — classification, rank, best move, eval. */
export function buildFactualMoveComment(
  move: AnalyzedMove,
  options: FactualCommentOptions = {}
): string | null {
  const c = move.classification;
  if (!c) return null;

  if (isDeliveredCheckmate(move.fenAfter)) {
    return "Checkmate. Game over.";
  }

  const moveIdx = options.moveIdx ?? 0;
  const moves = options.moves;
  const openingHint =
    options.openingHint ??
    (moves ? openingHintForMove(moveIdx, moves) : undefined);
  const chapter = moves ? computeOpeningChapter(moves) : null;
  const openingName = chapter?.openingName;

  if (moves && isLeftBookMove(moveIdx, moves)) {
    const parts = ["Out of theory."];
    if (openingName) parts.push(`Opening: ${openingName}.`);
    parts.push(`Played ${move.san}.`);
    return parts.join(" ");
  }

  if (c === "book") {
    const parts = ["Book move."];
    if (openingHint) parts.push(openingHint.endsWith(".") ? openingHint : `${openingHint}.`);
    else if (openingName) parts.push(`Opening: ${openingName}.`);
    return parts.join(" ");
  }

  if (move.forced) {
    return "Forced move — only legal option.";
  }

  const label = getMeta(c)?.label ?? c;
  const parts: string[] = [label + "."];

  const rank = rankPhrase(move);
  if (rank) parts.push(rank + ".");

  parts.push(`Played ${move.san}.`);

  const best = bestMovePhrase(move);
  if (best) parts.push(best + ".");

  const evalBefore = formatPlayerEvalPawns(move, "before");
  const evalAfter = formatPlayerEvalPawns(move, "after");
  parts.push(`Eval ${evalBefore} → ${evalAfter} (your perspective).`);

  const loss = formatWinChanceLoss(move.deltaE);
  if (loss) parts.push(`Loss: ${loss}.`);

  return parts.join(" ");
}
