/** Desktop layout constants for fitting the board + eval graph in the viewport */
export const DESKTOP_LAYOUT = {
  /** Matches `--app-header-h` (3rem) */
  header: 48,
  /** Eval graph toggle row (`py-2` + label) */
  evalGraphBar: 36,
  /** Open chart height (`h-14`) */
  evalGraphChart: 56,
  /** Main area padding (`py-3`) + chart `mt-1.5` + slack */
  verticalPad: 32,
  /**
   * Two PlayerTag rows (~34px each) plus `gap-1` slots in the board column.
   * Tags sit above and below the board.
   */
  playerRows: 76,
  /**
   * Save / Reanalyze / Download row under the board (`h-9` + `pt-1.5` + column gap).
   * Must stay reserved or shorter laptop viewports clip the buttons.
   */
  boardActions: 48,
  sidebar: 288,
  coachPanel: 208,
  navColumn: 48,
  horizontalPad: 48,
} as const;

/** Mobile moves-tab chrome (px) — used to reserve commentary space below the board. */
export const MOBILE_LAYOUT = {
  header: 48,
  tabBar: 88,
  topPad: 8,
  playerTags: 48,
  evalDockCollapsed: 36,
  evalDockOpen: 72,
  evalBar: 22,
  inlinePad: 12,
  /** Commentary should claim at least this share of the main column. */
  coachMinRatio: 0.4,
  coachMinPx: 220,
} as const;

export function computeDesktopBoardSize(
  winW: number,
  winH: number,
  opts: {
    evalGraphOpen: boolean;
    hasAnalyzedMoves: boolean;
    /** Reserve space for Save / Reanalyze / Download under the board (default true). */
    reserveBoardActions?: boolean;
  }
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
  const actions =
    opts.reserveBoardActions === false ? 0 : DESKTOP_LAYOUT.boardActions;
  const maxH =
    winH -
    DESKTOP_LAYOUT.header -
    evalH -
    DESKTOP_LAYOUT.verticalPad -
    DESKTOP_LAYOUT.playerRows -
    actions;
  const size = Math.floor(Math.min(maxW, maxH));
  return Math.max(240, Math.min(size, 680));
}

/**
 * Mobile board size when reviewing — caps height so move commentary keeps
 * ~40%+ of the viewport (largest panel after the board).
 */
export function computeMobileBoardSize(
  winW: number,
  winH: number,
  opts: { evalGraphOpen: boolean }
): number {
  const byWidth = Math.floor(
    winW - MOBILE_LAYOUT.inlinePad - MOBILE_LAYOUT.evalBar
  );

  const evalDock =
    MOBILE_LAYOUT.evalDockCollapsed +
    (opts.evalGraphOpen ? MOBILE_LAYOUT.evalDockOpen : 0);
  const chrome =
    MOBILE_LAYOUT.topPad + MOBILE_LAYOUT.playerTags + evalDock;
  const contentH = winH - MOBILE_LAYOUT.header - MOBILE_LAYOUT.tabBar;
  const coachMin = Math.max(
    MOBILE_LAYOUT.coachMinPx,
    Math.floor(contentH * MOBILE_LAYOUT.coachMinRatio)
  );
  const maxByHeight = contentH - chrome - coachMin;

  const size = Math.floor(Math.min(byWidth, maxByHeight));
  return Math.max(240, Math.min(size, byWidth));
}
