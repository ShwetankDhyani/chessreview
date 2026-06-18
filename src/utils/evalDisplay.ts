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

/** Flip engine cp/mate (always stored white-relative) to the side at the bottom of the board. */
export function cpForBottomPlayer(cp: number, boardFlipped: boolean): number {
  return boardFlipped ? -cp : cp;
}

export function mateForBottomPlayer(mate: number, boardFlipped: boolean): number {
  return boardFlipped ? -mate : mate;
}

/** Eval label beside the board — from the perspective of whoever sits at the bottom. */
export function formatEvalForBoard(
  evalResult: { cp?: number; mate?: number } | null,
  boardFlipped: boolean
): { text: string; favorable: boolean } {
  if (!evalResult) return { text: "0.0", favorable: true };
  if (evalResult.mate !== undefined) {
    const m = mateForBottomPlayer(evalResult.mate, boardFlipped);
    return { text: formatSignedMate(m), favorable: m > 0 };
  }
  const cp = cpForBottomPlayer(evalResult.cp ?? 0, boardFlipped);
  return { text: formatSignedPawnsFromCp(cp), favorable: cp >= 0 };
}

/** Bar segment heights (0–100): light = white advantage, dark = black advantage. */
export function evalBarSegments(
  whitePercent: number,
  boardFlipped: boolean
): { topPct: number; bottomPct: number; topFavorable: boolean; bottomFavorable: boolean } {
  const whiteShare = whitePercent / 100;
  const whiteAtBottom = !boardFlipped;

  if (whiteAtBottom) {
    return {
      bottomPct: whiteShare * 100,
      topPct: (1 - whiteShare) * 100,
      bottomFavorable: whiteShare >= 0.5,
      topFavorable: whiteShare < 0.5,
    };
  }
  return {
    topPct: whiteShare * 100,
    bottomPct: (1 - whiteShare) * 100,
    topFavorable: whiteShare >= 0.5,
    bottomFavorable: whiteShare < 0.5,
  };
}

/** Mate distance from White's perspective. */
export function formatSignedMate(mate: number): string {
  if (mate > 0) return `+M${mate}`;
  if (mate < 0) return `−M${Math.abs(mate)}`;
  return "0.0";
}
