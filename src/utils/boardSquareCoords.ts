/** Pixel center of a square on the board (matches react-chessboard white/black layout). */
export function getSquareCenter(
  square: string,
  boardOrientation: "white" | "black",
  boardWidth: number
): { x: number; y: number } {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square[1] ?? "0", 10);
  if (file < 0 || file > 7 || rank < 1 || rank > 8) {
    return { x: boardWidth / 2, y: boardWidth / 2 };
  }

  const sq = boardWidth / 8;
  let col = file;
  let row = 8 - rank;

  if (boardOrientation === "black") {
    col = 7 - col;
    row = 7 - row;
  }

  return { x: col * sq + sq / 2, y: row * sq + sq / 2 };
}
