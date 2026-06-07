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

