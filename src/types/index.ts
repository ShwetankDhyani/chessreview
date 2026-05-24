export type MoveClassification =
  | "book"
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | null;

export interface EvalResult {
  cp?: number;
  mate?: number;
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
  eBest: number;
  eActual: number;
  deltaE: number;
  classification: MoveClassification;
  /** Still in opening theory — hide best-move hints on the board. */
  inOpeningBook?: boolean;
  /** Expected points lost vs engine best (0–1), CAPS2 input */
  epLoss?: number;
  isSacrifice?: boolean;
  bestMove?: string;   // engine best move UCI from fenBefore
  bestMoveSan?: string; // engine best move in SAN notation
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

export interface PhaseAccuracy {
  opening: AccuracyStats;
  middlegame: AccuracyStats;
  endgame: AccuracyStats;
}

export interface KeyMoment {
  moveIdx: number;
  san: string;
  moveNumber: number;
  color: "w" | "b";
  classification: MoveClassification;
  swing: number; // eval swing in pawns
}

export interface ReviewSummary {
  white: ClassificationCounts;
  black: ClassificationCounts;
  accuracy: AccuracyStats;
  phaseAccuracy?: PhaseAccuracy;
  keyMoments?: KeyMoment[];
  coverage?: ReviewCoverage;
  accuracyMeta?: AccuracyMeta;
}

export interface AccuracyMeta {
  method: "classification_counts";
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
  backendPolicy: "consensus";
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
