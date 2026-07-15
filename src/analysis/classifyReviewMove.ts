import type { MoveClassification } from "../types";
import type { MultiPvLine } from "./types";
import { checkOpeningBookSync } from "./openingBook";
import {
  BLUNDER_FORCE_EP,
  EP_CLASS_THRESHOLDS,
  STILL_WINNING_EP,
  WAS_WINNING_EP,
} from "./types";
import { expectedPointsLoss } from "./expectedPoints";
import { isDeliveredCheckmate } from "./mateDetection";

export interface ClassifyReviewInput {
  fenBefore: string;
  fenAfter: string;
  fenAfterBest: string | null;
  mover: "w" | "b";
  playedUci: string;
  eBefore: number;
  eAfterPlayed: number;
  eAfterBest: number;
  multipvLines: MultiPvLine[];
  openingBook?: ReadonlySet<string>;
  opponentPriorClass: MoveClassification | null;
  opponentPriorEpLoss: number;
  /** Mover's EP before opponent's last move (for Miss). */
  epBeforeOpponentMove?: number;
  /** Mover's EP after opponent's last move (= eBefore when opponent just blundered). */
  postOpponentEP?: number;
  playerRating?: number;
  forced?: boolean;
}

/**
 * Accuracy input: expected points lost vs engine best only
 * (CAPS2 / Chess.com-style). Zero when the played move is PV1.
 */
export function epLossFromPlayed(input: ClassifyReviewInput): number {
  const best =
    input.multipvLines[0]?.bestMove ?? input.multipvLines[0]?.pv[0];
  if (best && input.playedUci.toLowerCase() === best.toLowerCase()) {
    return 0;
  }
  return expectedPointsLoss(input.eAfterBest, input.eAfterPlayed);
}

/**
 * Classification input: never ignore real win-chance collapse.
 * A move that walks into mate / dumps a won game cannot be "good"
 * just because the engine's best line was also bad in a shallow search.
 */
export function classificationLoss(input: ClassifyReviewInput): number {
  const vsBest = epLossFromPlayed(input);
  const absolute = expectedPointsLoss(input.eBefore, input.eAfterPlayed);
  return Math.max(vsBest, absolute);
}

function isExactBestMove(input: ClassifyReviewInput): boolean {
  const best = input.multipvLines[0]?.bestMove ?? input.multipvLines[0]?.pv[0];
  if (!best) return false;
  return input.playedUci.toLowerCase() === best.toLowerCase();
}

export function isInitiativeSlipNotBlunder(
  eBefore: number,
  eAfter: number,
  eLoss: number
): boolean {
  if (eLoss <= EP_CLASS_THRESHOLDS.mistake) return false;
  if (eLoss >= BLUNDER_FORCE_EP) return false;
  if (eBefore < WAS_WINNING_EP) return false;
  if (eAfter < STILL_WINNING_EP) return false;
  return true;
}

/**
 * Core labels only: best / good / inaccuracy / mistake / blunder
 * (+ book / forced handled by callers as best).
 */
function classifyByLoss(
  eLoss: number,
  isEngineBest: boolean,
  eBefore: number,
  eAfter: number
): MoveClassification {
  if (isEngineBest) return "best";
  if (eLoss <= EP_CLASS_THRESHOLDS.excellent) return "good";
  if (eLoss <= EP_CLASS_THRESHOLDS.good) return "good";
  if (eLoss <= EP_CLASS_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (eLoss <= EP_CLASS_THRESHOLDS.mistake) return "mistake";
  if (isInitiativeSlipNotBlunder(eBefore, eAfter, eLoss)) return "mistake";
  return "blunder";
}

export function classifyReviewMove(input: ClassifyReviewInput): MoveClassification {
  if (input.forced) return "best";

  if (checkOpeningBookSync(input.fenBefore, input.openingBook)) {
    return "book";
  }

  if (isDeliveredCheckmate(input.fenAfter)) {
    return "best";
  }

  const engineBest = isExactBestMove(input);
  const eLoss = classificationLoss(input);

  return classifyByLoss(
    eLoss,
    engineBest,
    input.eBefore,
    input.eAfterPlayed
  );
}

/** 1-based MultiPV rank of the played move, or null if outside the searched lines. */
export function engineRankFromMultipv(
  multipvLines: MultiPvLine[],
  playedUci: string
): number | null {
  const played = playedUci.toLowerCase();
  for (let i = 0; i < multipvLines.length; i++) {
    const uci = (
      multipvLines[i].bestMove ?? multipvLines[i].pv[0]
    )?.toLowerCase();
    if (uci && uci === played) return i + 1;
  }
  return null;
}

/** @deprecated — kept for older tests / tools; classifier no longer emits miss. */
export function detectMiss(_input: ClassifyReviewInput): "miss" | null {
  return null;
}

/** @deprecated — classifier no longer emits great. */
export function detectGreatMove(_input: ClassifyReviewInput): boolean {
  return false;
}

/** @deprecated — classifier no longer emits brilliant. */
export function detectBrilliantMove(_input: ClassifyReviewInput): boolean {
  return false;
}
