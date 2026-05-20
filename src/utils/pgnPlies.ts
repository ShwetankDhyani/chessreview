import { Chess } from "chess.js";

/** Half-move count (plies) in a PGN — stable before engine analysis finishes. */
export function countPgnPlies(pgn: string): number {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.history().length;
  } catch {
    return 0;
  }
}
