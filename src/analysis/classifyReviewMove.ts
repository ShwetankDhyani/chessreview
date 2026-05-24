import type { MoveClassification } from "../types";
import type { MultiPvLine } from "./types";
import { detectPieceSacrifice } from "./detectPieceSacrifice";
import { checkOpeningBookSync } from "./openingBook";
import {
  EP_CLASS_THRESHOLDS,
  GREAT_MIN_BEST_EP,
  GREAT_SECOND_LINE_GAP,
  BRILLIANT_MAX_WP_BEFORE,
  BRILLIANT_MIN_WP_AFTER,
} from "./types";
import { expectedPointsFromMoverCp, expectedPointsLoss } from "./expectedPoints";

export interface ClassifyReviewInput {
  fenBefore: string;
  fenAfter: string;
  fenAfterBest: string | null;
  mover: "w" | "b";
  playedUci: string;
  /** Expected points (0–1) before the move for mover. */
  eBefore: number;
  /** Expected points after played move for mover. */
  eAfterPlayed: number;
  /** Expected points after engine best for mover. */
  eAfterBest: number;
  multipvLines: MultiPvLine[];
  openingBook?: ReadonlySet<string>;
  /** Opponent's prior classification (for Miss). */
  opponentPriorClass: MoveClassification | null;
  /** Opponent ep loss on prior move (how much they blundered). */
  opponentPriorEpLoss: number;
}

function epLossFromPlayed(input: ClassifyReviewInput): number {
  return expectedPointsLoss(input.eBefore, input.eAfterPlayed);
}

function isExactBestMove(input: ClassifyReviewInput): boolean {
  const best = input.multipvLines[0]?.bestMove ?? input.multipvLines[0]?.pv[0];
  if (!best) return epLossFromPlayed(input) <= 1e-6;
  return input.playedUci.toLowerCase() === best.toLowerCase();
}

function classifyByEpLoss(eLoss: number): MoveClassification {
  if (eLoss <= EP_CLASS_THRESHOLDS.best + 1e-9) return "best";
  if (eLoss <= EP_CLASS_THRESHOLDS.excellent) return "excellent";
  if (eLoss <= EP_CLASS_THRESHOLDS.good) return "good";
  if (eLoss <= EP_CLASS_THRESHOLDS.inaccuracy) return "inaccuracy";
  if (eLoss <= EP_CLASS_THRESHOLDS.mistake) return "mistake";
  return "blunder";
}

function epAfterLineForMover(line: MultiPvLine, mover: "w" | "b"): number {
  const cpWhite = line.mate !== undefined ? (line.mate > 0 ? 10000 : -10000) : (line.cp ?? 0);
  const signed = mover === "w" ? cpWhite : -cpWhite;
  return expectedPointsFromMoverCp(signed);
}

/** Great: only good move — best line keeps advantage, 2nd line drops ≥0.20 ep, user plays best. */
export function detectGreatMove(input: ClassifyReviewInput): boolean {
  if (input.multipvLines.length < 2) return false;
  const [first, second] = input.multipvLines;
  const e1 = epAfterLineForMover(first, input.mover);
  const e2 = epAfterLineForMover(second, input.mover);
  if (e1 < GREAT_MIN_BEST_EP) return false;
  if (e1 - e2 < GREAT_SECOND_LINE_GAP) return false;
  return isExactBestMove(input);
}

/**
 * Miss: opponent just blundered/mistaked; user fails to capitalize (returns to ~equal or worse).
 */
export function detectMiss(input: ClassifyReviewInput): boolean {
  const opp = input.opponentPriorClass;
  if (opp !== "mistake" && opp !== "blunder") return false;
  if (input.opponentPriorEpLoss < EP_CLASS_THRESHOLDS.inaccuracy) return false;

  const hadChance = input.eBefore >= 0.55;
  const wasted =
    input.eAfterPlayed <= 0.52 ||
    expectedPointsLoss(input.eBefore, input.eAfterPlayed) >= EP_CLASS_THRESHOLDS.good;

  return hadChance && wasted;
}

export function detectBrilliantMove(
  input: ClassifyReviewInput,
  baseLabel: MoveClassification
): boolean {
  if (baseLabel !== "best" && baseLabel !== "excellent") return false;
  if (input.eBefore >= BRILLIANT_MAX_WP_BEFORE) return false;
  if (input.eAfterPlayed < BRILLIANT_MIN_WP_AFTER) return false;
  return detectPieceSacrifice(
    input.fenBefore,
    input.fenAfter,
    input.multipvLines[0]?.pv
  );
}

/**
 * Chess.com-style review classification (expected-points + special overrides).
 */
export function classifyReviewMove(input: ClassifyReviewInput): MoveClassification {
  if (checkOpeningBookSync(input.fenBefore, input.openingBook)) {
    return "book";
  }

  const eLoss = epLossFromPlayed(input);

  if (detectGreatMove(input)) return "great";

  if (detectMiss(input)) return "blunder";

  let base = classifyByEpLoss(eLoss);
  if (!isExactBestMove(input) && base === "best" && eLoss > 0) {
    base = classifyByEpLoss(eLoss);
  }
  if (isExactBestMove(input) && eLoss <= EP_CLASS_THRESHOLDS.excellent) {
    base = "best";
  }

  if (detectBrilliantMove(input, base)) return "brilliant";

  return base;
}

export { epLossFromPlayed };
