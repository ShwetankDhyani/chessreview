/** Rating-adjusted thresholds (Chess.com Classification V2 style). */

export function getSacThreshold(playerRating: number): number {
  if (playerRating < 800) return -1;
  if (playerRating < 1200) return -2;
  return -3;
}

export function getGreatMoveThreshold(playerRating: number): number {
  if (playerRating < 1000) return 0.1;
  if (playerRating < 1500) return 0.15;
  if (playerRating < 2000) return 0.2;
  return 0.25;
}

export function getWinningThreshold(playerRating: number): number {
  if (playerRating < 800) return 0.85;
  if (playerRating < 1200) return 0.8;
  if (playerRating < 1600) return 0.75;
  if (playerRating < 2000) return 0.7;
  return 0.65;
}

/** Minimum best-line EP for Great move candidacy. */
export function getGreatMinBestEp(playerRating: number): number {
  if (playerRating < 1200) return 0.55;
  if (playerRating < 1800) return 0.6;
  return 0.6;
}

/** Default rating when unknown (club level). */
export const DEFAULT_PLAYER_RATING = 1500;
