export type PrepPlatform = "lichess" | "chesscom";

export interface PrepColorSplit {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winPct: number;
  scorePct: number;
}

export interface PrepChartPoint {
  n: number;
  scorePct: number;
  result: "win" | "loss" | "draw";
  color: "white" | "black";
}

export interface PrepSparkPoint {
  i: number;
  outcome: "win" | "loss" | "draw";
  value: number;
  color: "white" | "black";
}

export interface PrepFormCharts {
  formTrend: PrepChartPoint[];
  resultsSpark: PrepSparkPoint[];
  wld: Array<{ key: string; label: string; value: number }>;
  byColorScore: Array<{
    key: string;
    label: string;
    scorePct: number;
    played: number;
  }>;
  terminations: Array<{
    key: string;
    label: string;
    value: number;
    pct: number;
  }>;
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
  charts?: PrepFormCharts;
}

export interface PrepBriefNote {
  label: string;
  body: string;
}

/** Structured form write-up: lead + labeled notes. */
export interface PrepFormBrief {
  headline: string;
  notes: PrepBriefNote[];
  /** Flat fallback for older clients / a11y. */
  plain: string;
}

export interface PrepPlayerReport {
  username: string;
  platform: PrepPlatform;
  sampleSize: number;
  stats: PrepFormStats;
  /** Structured blurb with personality (preferred in UI). */
  brief?: PrepFormBrief | null;
  /** Plain short summary of the sample. */
  summary: string;
  /** @deprecated Prefer summary */
  scoutingReport?: string;
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
