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
  /** Expected points lost vs engine best (0–1), CAPS2 input */
  epLoss?: number;
  isSacrifice?: boolean;
  bestMove?: string;   // engine best move UCI from fenBefore
  bestMoveSan?: string; // engine best move in SAN notation
  pvLine?: string[];   // follow-up principal variation in SAN
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
