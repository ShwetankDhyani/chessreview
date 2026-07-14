import type { ReviewResult } from "../types";
import { samePgn } from "./pgnIdentity";

/** Last finished review for this browser tab — survives App remounts, dies on refresh. */
export type SessionReviewPin = {
  pgn: string;
  label: string;
  gameId: string | null;
  result: ReviewResult;
};

export type ReviewJobIdentity = {
  pgn: string;
  label: string;
  gameId: string | null;
};

export type ActiveReviewSnapshot = {
  gameId: string | null;
  label: string;
  pgn: string;
  running: boolean;
  done: boolean;
  progressPercent: number;
};

let memoryPin: SessionReviewPin | null = null;

export function getSessionReviewPin(): SessionReviewPin | null {
  return memoryPin;
}

export function setSessionReviewPin(pin: SessionReviewPin | null): void {
  memoryPin = pin;
}

export function clearSessionReviewPin(): void {
  memoryPin = null;
}

/** True when a list row / paste target is the pinned (or in-flight) review game. */
export function matchesReviewIdentity(
  target: { pgn: string; gameId?: string | null },
  identity: { pgn: string; gameId?: string | null } | null | undefined
): boolean {
  if (!identity) return false;
  if (
    target.gameId != null &&
    identity.gameId != null &&
    target.gameId === identity.gameId
  ) {
    return true;
  }
  return samePgn(target.pgn, identity.pgn);
}

/** Soft-browse other boards whenever a session review (running or finished) is active. */
export function shouldSoftBrowseOtherGame(opts: {
  analysisRunning: boolean;
  reviewJob: ReviewJobIdentity | null | undefined;
  pin: SessionReviewPin | null | undefined;
}): boolean {
  return opts.analysisRunning || !!opts.reviewJob || !!opts.pin;
}

export function resolveActiveReview(opts: {
  reviewJob: ReviewJobIdentity | null | undefined;
  analysisRunning: boolean;
  parkedResult: ReviewResult | null | undefined;
  pin: SessionReviewPin | null | undefined;
  progressPercent: number;
  pgn: string;
  analysisState: string;
  movesLength: number;
  sessionGameId: string | null;
  vsLabel: string;
}): ActiveReviewSnapshot | null {
  const { reviewJob, analysisRunning, parkedResult, pin, progressPercent } =
    opts;

  if (reviewJob && (analysisRunning || parkedResult)) {
    return {
      gameId: reviewJob.gameId,
      label: reviewJob.label,
      pgn: reviewJob.pgn,
      running: analysisRunning,
      done: !analysisRunning && !!parkedResult,
      progressPercent:
        !analysisRunning && parkedResult ? 100 : progressPercent,
    };
  }

  if (pin) {
    return {
      gameId: pin.gameId,
      label: pin.label,
      pgn: pin.pgn,
      running: false,
      done: true,
      progressPercent: 100,
    };
  }

  if (!opts.pgn.trim()) return null;
  const done = opts.analysisState === "done" && opts.movesLength > 0;
  if (!analysisRunning && !done) return null;
  return {
    gameId: opts.sessionGameId,
    label: opts.vsLabel,
    pgn: opts.pgn,
    running: analysisRunning,
    done,
    progressPercent: done ? 100 : progressPercent,
  };
}

export function jobFromPin(pin: SessionReviewPin): ReviewJobIdentity {
  return {
    pgn: pin.pgn,
    label: pin.label,
    gameId: pin.gameId,
  };
}
