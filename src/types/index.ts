export type MoveClassification =
  | "book"
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder"
  | null;

export interface EvalResult {
  cp?: number;
  mate?: number;
  /** Native Stockfish WDL (per-mille, white-oriented). */
  wdl?: { w: number; d: number; l: number };
  depth: number;
  source: "cloud" | "local";
  knodes?: number;
  bestMove?: string; // UCI e.g. "e2e4"
  pv?: string[];    // principal variation as UCI moves
  /** Depth target requested for this position. */
  targetDepth?: number;
  /** Position was fully verified under run policy. */
  verified?: boolean;
  /** 0..1 confidence from consensus/disagreement checks. */
  confidence?: number;
  /** Why this eval could not be fully trusted. */
  unverifiedReason?: "missing_eval" | "shallow_depth" | "high_disagreement";
  /** Absolute cp disagreement between pass A/B (if available). */
  disagreementCp?: number;
}

export interface AnalyzedMove {
  moveNumber: number;
  color: "w" | "b";
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: EvalResult | null;
  evalAfter: EvalResult | null;
  /** Mover expected points before the ply (0–1). */
  eBefore?: number;
  eBest: number;
  eActual: number;
  deltaE: number;
  classification: MoveClassification;
  /** Still in opening theory — hide best-move hints on the board. */
  inOpeningBook?: boolean;
  /** Expected points lost vs engine best (0–1), CAPS2 input */
  epLoss?: number;
  /** Only one legal move — excluded from accuracy */
  forced?: boolean;
  isSacrifice?: boolean;
  bestMove?: string;   // engine best move UCI from fenBefore
  bestMoveSan?: string; // engine best move in SAN notation
  /** 1-based MultiPV rank when the played move appears in engine lines. */
  engineRank?: number | null;
  /** MultiPV line count used for this position (typically 3). */
  engineLineCount?: number;
  pvLine?: string[];   // follow-up principal variation in SAN
  verified?: boolean;
  confidence?: number;
  unverifiedReason?: "missing_eval" | "shallow_depth" | "high_disagreement";
  reviewRunId?: string;
}

export interface AccuracyStats {
  white: number;
  black: number;
}

/** Per-phase CAPS2 accuracy; null = not enough scored moves to grade. */
export interface PhaseSideAccuracy {
  white: number | null;
  black: number | null;
}

export interface PhaseAccuracyStats {
  opening: PhaseSideAccuracy;
  middlegame: PhaseSideAccuracy;
  endgame: PhaseSideAccuracy;
}

export interface ReviewSummary {
  white: ClassificationCounts;
  black: ClassificationCounts;
  accuracy: AccuracyStats;
  phaseAccuracy?: PhaseAccuracyStats;
  coverage?: ReviewCoverage;
  accuracyMeta?: AccuracyMeta;
}

export interface AccuracyMeta {
  method: "chesscom_ep_v3" | "chesscom_wdl_v4" | "lichess_caps2_v5";
  formulaVersion: string;
}

export interface ReviewCoverage {
  totalPlies: number;
  classifiedPlies: number;
  verifiedPlies: number;
  unverifiedPlies: number;
  unverifiedReasons: {
    missing_eval: number;
    shallow_depth: number;
    high_disagreement: number;
  };
}

export interface ReviewRun {
  runId: string;
  engineVersion: string;
  startedAt: string;
  finishedAt: string;
  requestedDepth: number;
  fastDepth: number;
  deepDepth: number;
  backendPolicy: "consensus" | "full-depth";
  pgnHash: string;
}

export interface ReviewResult {
  run: ReviewRun;
  moves: AnalyzedMove[];
  summary: ReviewSummary;
}

export interface ClassificationCounts {
  brilliant: number;
  great: number;
  best: number;
  excellent: number;
  good: number;
  book: number;
  inaccuracy: number;
  mistake: number;
  miss: number;
  blunder: number;
}

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  white: ChessComPlayer;
  black: ChessComPlayer;
  time_class: string;
  rules: string;
}

export interface ChessComPlayer {
  rating: number;
  result: string;
  "@id": string;
  username: string;
  uuid: string;
}

export interface GameListItem {
  id: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating: number;
  blackRating: number;
  whiteResult: string;
  blackResult: string;
  timeClass: string;
  endTime: number;
}

export type AnalysisState =
  | "idle"
  | "loading"
  | "analyzing"
  | "done"
  | "error";
