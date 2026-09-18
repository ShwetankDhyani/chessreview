/** Desktop layout constants for fitting the board + eval graph in the viewport */
export const DESKTOP_LAYOUT = {
  header: 44,
  /** SiteFooter (`--site-footer`) on desktop */
  footer: 40,
  evalGraphBar: 30,
  evalGraphChart: 56,
  /** Main column py + gaps around the board stack */
  verticalPad: 20,
  /** Top + bottom PlayerTag rows */
  playerRows: 52,
  /** Reanalyze / save / export row under the board */
  reviewActions: 36,
  /** Matches `aside` `lg:w-[22rem]` */
  sidebar: 352,
  /** Matches coach `xl:w-72` (use larger so board never clips it) */
  coachPanel: 288,
  /** Board nav strip `w-11` */
  navColumn: 44,
  /** Main column horizontal padding + gaps */
  horizontalPad: 36,
  evalBar: 28,
  /**
   * Soft ceiling — large enough to feel immersive on 1440p+/1080p,
   * without swallowing the coach column on ultra-wide screens.
   */
  maxBoard: 960,
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
    : DESKTOP_LAYOUT.navColumn;
  const maxW =
    winW -
    DESKTOP_LAYOUT.sidebar -
    coach -
    DESKTOP_LAYOUT.horizontalPad -
    DESKTOP_LAYOUT.evalBar;
  const evalH = opts.hasAnalyzedMoves
    ? DESKTOP_LAYOUT.evalGraphBar +
      (opts.evalGraphOpen ? DESKTOP_LAYOUT.evalGraphChart : 0)
    : 0;
  const maxH =
    winH -
    DESKTOP_LAYOUT.header -
    DESKTOP_LAYOUT.footer -
    evalH -
    DESKTOP_LAYOUT.verticalPad -
    DESKTOP_LAYOUT.playerRows -
    DESKTOP_LAYOUT.reviewActions;
  const size = Math.floor(Math.min(maxW, maxH));
  return Math.max(280, Math.min(size, DESKTOP_LAYOUT.maxBoard));
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
