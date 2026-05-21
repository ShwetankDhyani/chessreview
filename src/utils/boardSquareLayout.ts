import { Chess } from "chess.js";

/** King square for color in FEN (e.g. "e8"). */
export function findKingSquare(fen: string, color: "w" | "b"): string | null {
  try {
    const chess = new Chess(fen);
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === "k" && p.color === color) {
          const file = String.fromCharCode(97 + f);
          const rank = String(8 - r);
          return `${file}${rank}`;
        }
      }
    }
  } catch {
    /* invalid fen */
  }
  return null;
}

/** Center of square as % for board overlay (matches react-chessboard orientation). */
export function squareToPercent(
  square: string,
  orientation: "white" | "black"
): { left: number; top: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10);

  let col: number;
  let row: number;
  if (orientation === "white") {
    col = file;
    row = 8 - rank;
  } else {
    col = 7 - file;
    row = rank - 1;
  }

  return {
    left: ((col + 0.5) / 8) * 100,
    top: ((row + 0.5) / 8) * 100,
  };
}
