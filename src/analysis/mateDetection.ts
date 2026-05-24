import { Chess } from "chess.js";

/** True when side to move in `fen` is checkmated (previous ply delivered mate). */
export function isCheckmatePosition(fen: string): boolean {
  try {
    return new Chess(fen).isCheckmate();
  } catch {
    return false;
  }
}

/** Mover just played; `fenAfter` is opponent to move and is mated. */
export function isDeliveredCheckmate(fenAfter: string): boolean {
  return isCheckmatePosition(fenAfter);
}

/** True when `fen` has a decisive mate score for the side that just moved (mover). */
export function isDecisiveWinForMover(
  evalWhite: { cp?: number; mate?: number },
  mover: "w" | "b",
  fenAfter: string
): boolean {
  if (isDeliveredCheckmate(fenAfter)) return true;
  if (evalWhite.mate === undefined) return false;
  const whiteWinning = evalWhite.mate > 0;
  const moverWinning = mover === "w" ? whiteWinning : !whiteWinning;
  return moverWinning && Math.abs(evalWhite.mate) <= 3;
}
