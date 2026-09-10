export type PrepPlatform = "lichess" | "chesscom";

export interface PrepColorSplit {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winPct: number;
  scorePct: number;
}

export interface PrepFormStats {
  gamesAnalyzed: number;
  byColor: {
    white: PrepColorSplit;
    black: PrepColorSplit;
    overall: PrepColorSplit;
  };
  tpr: {
    value: number | null;
    averageOpponentRating: number | null;
    scorePct: number;
  };
  tilt: {
    index: number;
    lossStreaksOf3Plus: number;
    longestLossStreak: number;
    rapidRequeuesAfterLoss: number;
    rapidRequeueSampleLosses: number;
  };
  terminations: {
    losses: number;
    timePct: number;
    resignationPct: number;
    matePct: number;
    abandonedPct: number;
    otherPct: number;
    counts: Record<string, number>;
  };
}

export interface PrepPlayerReport {
  username: string;
  platform: PrepPlatform;
  sampleSize: number;
  stats: PrepFormStats;
  scoutingReport: string;
  generatedAt: string;
  cacheTtlMs: number;
  cache?: { hit: boolean; source: string | null };
}

export interface PrepHeadToHeadRow {
  label: string;
  self: number | null;
  opponent: number | null;
  format?: "pct";
}

export interface PrepAnalyzeResponse {
  ok: boolean;
  opponent: PrepPlayerReport;
  self: PrepPlayerReport | null;
  headToHead: { rows: PrepHeadToHeadRow[] } | null;
  error?: string;
}

export interface PrepAnalyzeRequest {
  username: string;
  platform: PrepPlatform;
  selfUsername?: string;
  selfPlatform?: PrepPlatform;
  bypassCache?: boolean;
}
