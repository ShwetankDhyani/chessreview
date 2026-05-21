/** Same grid mapping as react-chessboard getRelativeCoords */

const WHITE_COLUMNS: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
};

const BLACK_COLUMNS: Record<string, number> = {
  a: 7,
  b: 6,
  c: 5,
  d: 4,
  e: 3,
  f: 2,
  g: 1,
  h: 0,
};

const WHITE_ROWS = [7, 6, 5, 4, 3, 2, 1, 0];
const BLACK_ROWS = [0, 1, 2, 3, 4, 5, 6, 7];

/** Pixel center of a square, relative to the top-left of the board. */
export function getSquareCenter(
  square: string,
  boardOrientation: "white" | "black",
  boardWidth: number
): { x: number; y: number } {
  const file = square[0];
  const rank = parseInt(square[1] ?? "0", 10);
  if (!file || rank < 1 || rank > 8) {
    return { x: boardWidth / 2, y: boardWidth / 2 };
  }

  const sq = boardWidth / 8;
  const columns =
    boardOrientation === "white" ? WHITE_COLUMNS : BLACK_COLUMNS;
  const rows = boardOrientation === "white" ? WHITE_ROWS : BLACK_ROWS;
  const col = columns[file];
  const row = rows[rank - 1];
  if (col === undefined || row === undefined) {
    return { x: boardWidth / 2, y: boardWidth / 2 };
  }

  return { x: col * sq + sq / 2, y: row * sq + sq / 2 };
}
