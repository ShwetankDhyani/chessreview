/** Single MultiPV line from Stockfish (white-relative eval). */
export interface MultiPvLine {
  multipv: number;
  cp?: number;
  mate?: number;
  depth: number;
  pv: string[];
  bestMove?: string;
}

export interface PositionAnalysis {
  fen: string;
  depth: number;
  lines: MultiPvLine[];
}

export interface ReviewEngineOptions {
  depth?: number;
  multiPv?: number;
  /** Minimum depth (default 18). */
  minDepth?: number;
}

export const EP_CLASS_THRESHOLDS = {
  best: 0,
  excellent: 0.02,
  good: 0.05,
  inaccuracy: 0.1,
  mistake: 0.2,
  /** Raw ep band — blunder also needs a real swing unless still clearly winning. */
  blunder: 0.2,
} as const;

/** After the move, mover is still at least equal (did not throw away the game). */
export const STILL_WINNING_EP = 0.5;
/** Before the move, mover had a clear edge. */
export const WAS_WINNING_EP = 0.55;
/** Ep loss this large in a won game is still a blunder (e.g. 80% → 45%). */
export const BLUNDER_FORCE_EP = 0.32;
/** Minimum edge to treat a reply as failing to punish a prior mistake. */
export const MISS_MIN_CHANCE_EP = 0.55;

export const GREAT_MIN_BEST_EP = 0.6;
export const GREAT_SECOND_LINE_GAP = 0.2;
export const BRILLIANT_MAX_WP_BEFORE = 0.85;
export const BRILLIANT_MIN_WP_AFTER = 0.42;
