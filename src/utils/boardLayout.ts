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

/**
 * Mobile moves-tab chrome (px) — keep in sync with CSS:
 * `--app-header-h` (2.75rem ≈ 44) and `--mobile-tab-bar-h` (52).
 * `tabBar` is the tab row only; safe-area is handled via CSS padding on the
 * fixed tab bar / `--mobile-chrome-bottom`, not double-counted here.
 */
export const MOBILE_LAYOUT = {
  header: 44,
  tabBar: 52,
  topPad: 6,
  playerTags: 44,
  evalDockCollapsed: 32,
  evalDockOpen: 68,
  evalBar: 20,
  inlinePad: 8,
  /** Commentary should claim at least this share of the main column. */
  coachMinRatio: 0.24,
  coachMinPx: 140,
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

/**
 * Mobile board size when reviewing — prefer a larger board while still
 * leaving a usable coach strip underneath.
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
  return Math.max(260, Math.min(size, byWidth));
}
