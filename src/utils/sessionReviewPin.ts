import type { ReviewResult } from "../types";

/** Last finished review for this browser tab — survives App remounts, dies on refresh. */
export type SessionReviewPin = {
  pgn: string;
  label: string;
  gameId: string | null;
  result: ReviewResult;
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
