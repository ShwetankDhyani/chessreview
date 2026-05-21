/** Desktop layout constants for fitting the board + eval graph in the viewport */
export const DESKTOP_LAYOUT = {
  header: 44,
  evalGraphBar: 30,
  evalGraphChart: 56,
  verticalPad: 28,
  playerRows: 54,
  sidebar: 288,
  coachPanel: 208,
  navColumn: 48,
  horizontalPad: 48,
} as const;

export function computeDesktopBoardSize(
  winW: number,
  winH: number,
  opts: { evalGraphOpen: boolean; hasAnalyzedMoves: boolean }
): number {
  const coach = opts.hasAnalyzedMoves
    ? DESKTOP_LAYOUT.coachPanel + DESKTOP_LAYOUT.navColumn
    : 0;
  const maxW =
    winW -
    DESKTOP_LAYOUT.sidebar -
    coach -
    DESKTOP_LAYOUT.horizontalPad -
    28; /* eval bar */
  const evalH = opts.hasAnalyzedMoves
    ? DESKTOP_LAYOUT.evalGraphBar +
      (opts.evalGraphOpen ? DESKTOP_LAYOUT.evalGraphChart : 0)
    : 0;
  const maxH =
    winH -
    DESKTOP_LAYOUT.header -
    evalH -
    DESKTOP_LAYOUT.verticalPad -
    DESKTOP_LAYOUT.playerRows;
  const size = Math.floor(Math.min(maxW, maxH));
  return Math.max(240, Math.min(size, 680));
}
