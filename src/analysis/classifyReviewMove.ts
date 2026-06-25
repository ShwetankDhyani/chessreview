import type { MoveClassification } from "../types";
import type { MultiPvLine } from "./types";
import { computeMaterialDelta } from "./material";
import { checkOpeningBookSync } from "./openingBook";
import {
  BLUNDER_FORCE_EP,
  EP_CLASS_THRESHOLDS,
  STILL_WINNING_EP,
  WAS_WINNING_EP,
} from "./types";
import {
  expectedPointsFromLine,
  expectedPointsLoss,
} from "./expectedPoints";
import { isDeliveredCheckmate } from "./mateDetection";
import {
  DEFAULT_PLAYER_RATING,
  getGreatMinBestEp,
  getGreatMoveThreshold,
  getSacThreshold,
  getWinningThreshold,
} from "./ratingThresholds";

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

function epLossFromPlayed(input: ClassifyReviewInput): number {
  return expectedPointsLoss(input.eBefore, input.eAfterPlayed);
}

function isExactBestMove(input: ClassifyReviewInput): boolean {
  const best = input.multipvLines[0]?.bestMove ?? input.multipvLines[0]?.pv[0];
  if (!best) return epLossFromPlayed(input) <= 1e-6;
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

function epAfterLineForMover(
  line: MultiPvLine,
  mover: "w" | "b",
  fen: string
): number {
  return expectedPointsFromLine(line, mover, fen);
}

/**
 * Failed to capitalize on opponent's mistake (rating-adjusted winning threshold).
 */
export function detectMiss(input: ClassifyReviewInput): MoveClassification | null {
  const rating = input.playerRating ?? DEFAULT_PLAYER_RATING;
  const winThreshold = getWinningThreshold(rating);

  const epBeforeOpp = input.epBeforeOpponentMove;
  const epAfterOpp = input.postOpponentEP ?? input.eBefore;
  const epAfterPlay = input.eAfterPlayed;

  if (epBeforeOpp !== undefined) {
    if (epBeforeOpp > winThreshold) return null;
    if (epAfterOpp < winThreshold) return null;
    if (epAfterPlay >= winThreshold) return null;
    const eLoss = expectedPointsLoss(input.eBefore, epAfterPlay);
    if (isInitiativeSlipNotBlunder(input.eBefore, epAfterPlay, eLoss)) {
      return "mistake";
    }
    if (eLoss >= BLUNDER_FORCE_EP || epAfterPlay <= 0.45) return "blunder";
    return "mistake";
  }

  const opp = input.opponentPriorClass;
  if (opp !== "inaccuracy" && opp !== "mistake" && opp !== "blunder") {
    return null;
  }
  if (input.opponentPriorEpLoss < EP_CLASS_THRESHOLDS.inaccuracy) return null;
  if (input.eBefore < winThreshold - 0.1) return null;

  const eLoss = expectedPointsLoss(input.eBefore, epAfterPlay);
  const failedToPunish =
    epAfterPlay <= STILL_WINNING_EP || eLoss >= EP_CLASS_THRESHOLDS.mistake;
  if (!failedToPunish) return null;

  if (isInitiativeSlipNotBlunder(input.eBefore, epAfterPlay, eLoss)) {
    return "mistake";
  }
  if (eLoss >= BLUNDER_FORCE_EP || epAfterPlay <= 0.45) return "blunder";
  return "mistake";
}

function classifyByEpLoss(
  eLoss: number,
  isEngineBest: boolean,
  eBefore: number,
  eAfter: number
): MoveClassification {
  if (isEngineBest && eLoss < 0.01) return "best";
  if (eLoss < 0.01) return "excellent";
  if (eLoss <= EP_CLASS_THRESHOLDS.excellent) return "excellent";
  if (eLoss <= EP_CLASS_THRESHOLDS.good) return "good";
  if (eLoss <= EP_CLASS_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (eLoss <= EP_CLASS_THRESHOLDS.mistake) return "mistake";
  if (eBefore < 0.15 && eLoss < 0.05) return "best";
  if (isInitiativeSlipNotBlunder(eBefore, eAfter, eLoss)) return "mistake";
  return "blunder";
}

export function detectGreatMove(input: ClassifyReviewInput): boolean {
  if (input.multipvLines.length < 2) return false;
  const rating = input.playerRating ?? DEFAULT_PLAYER_RATING;
  const [first, second] = input.multipvLines;
  const e1 = epAfterLineForMover(first, input.mover, input.fenBefore);
  const e2 = epAfterLineForMover(second, input.mover, input.fenBefore);
  const playedEP = input.eAfterPlayed;

  if (e1 - playedEP > 0.02) return false;
  if (e1 < getGreatMinBestEp(rating)) return false;
  if (e1 - e2 < getGreatMoveThreshold(rating)) return false;
  if (input.eBefore < 0.05 || input.eBefore > 0.95) return false;

  return isExactBestMove(input);
}

export function detectBrilliantMove(input: ClassifyReviewInput): boolean {
  const rating = input.playerRating ?? DEFAULT_PLAYER_RATING;
  const eLoss = epLossFromPlayed(input);
  if (eLoss > 0.02) return false;
  if (input.eBefore >= 0.9) return false;
  if (input.eAfterPlayed < 0.45) return false;

  const materialDelta = computeMaterialDelta(input.fenBefore, input.fenAfter);
  return materialDelta <= getSacThreshold(rating);
}

export function classifyReviewMove(input: ClassifyReviewInput): MoveClassification {
  if (input.forced) return "best";

  if (checkOpeningBookSync(input.fenBefore, input.openingBook)) {
    return "book";
  }

  if (isDeliveredCheckmate(input.fenAfter)) {
    return "best";
  }

  const eLoss = epLossFromPlayed(input);
  const engineBest = isExactBestMove(input);

  if (detectGreatMove(input)) return "great";

  const miss = detectMiss(input);
  if (miss) return miss;

  let base = classifyByEpLoss(
    eLoss,
    engineBest,
    input.eBefore,
    input.eAfterPlayed
  );

  if (detectBrilliantMove(input)) return "brilliant";

  return base;
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

export { epLossFromPlayed };
