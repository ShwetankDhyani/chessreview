/**
 * Display helpers — engine eval uses centipawns; classification loss uses expected points (0–1).
 */

/** Expected-points loss (deltaE / epLoss) → whole-percent win chance lost. */
export function winChanceLossPercent(epLoss: number): number {
  return Math.round(Math.abs(epLoss) * 100);
}

/** e.g. "−18% win chance" for tooltips and coach copy. */
export function formatWinChanceLoss(epLoss: number): string | null {
  if (Math.abs(epLoss) < 0.01) return null;
  const pct = winChanceLossPercent(epLoss);
  if (pct < 1) return null;
  return `−${pct}% win chance`;
}

/** Compact form for inline UI: "−18%" */
export function formatWinChanceLossShort(epLoss: number): string {
  return `−${winChanceLossPercent(epLoss)}%`;
}

/** Signed pawn eval from White's perspective (Lichess / Chess.com convention). */
export function formatSignedPawnsFromCp(cp: number): string {
  const pawns = cp / 100;
  if (Math.abs(pawns) < 0.05) return "0.0";
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

/** Mate distance from White's perspective. */
export function formatSignedMate(mate: number): string {
  if (mate > 0) return `+M${mate}`;
  if (mate < 0) return `−M${Math.abs(mate)}`;
  return "0.0";
}
