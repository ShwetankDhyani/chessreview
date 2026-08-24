import type {
  AnalyzedMove,
  ClassificationCounts,
  ReviewResult,
  ReviewSummary,
} from "../types";

/**
 * Validation for review data that did not come from this session's analysis.
 *
 * Shared links and cloud-saved reviews are rendered straight from a JSON
 * response. The render path assumes a lot: `summary.accuracy.white` is read
 * without optional chaining, `moves` is iterated, and per-move fields feed
 * `.toFixed()` and board replay. A truncated write, an older schema, or a
 * partially failed save therefore crashes the page rather than showing a
 * message. Everything below is coerced to a renderable shape, and anything that
 * cannot be repaired is rejected with a clear reason.
 */

export class InvalidReviewPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReviewPayloadError";
  }
}

const ACCURACY_METHODS = [
  "chesscom_ep_v3",
  "chesscom_wdl_v4",
  "lichess_caps2_v5",
] as const;

type AccuracyMethod = (typeof ACCURACY_METHODS)[number];

const CLASSIFICATIONS = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Accuracy drives width/percent rendering, so clamp it into 0–100. */
function accuracyValue(value: unknown): number {
  const n = finiteNumber(value, 0);
  return Math.min(100, Math.max(0, n));
}

function nullableAccuracy(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

function normalizeCounts(value: unknown): ClassificationCounts {
  const src = isRecord(value) ? value : {};
  const out = {} as ClassificationCounts;
  for (const key of CLASSIFICATIONS) {
    const n = finiteNumber(src[key], 0);
    out[key] = n < 0 ? 0 : Math.floor(n);
  }
  return out;
}

function normalizePhaseSide(value: unknown) {
  const src = isRecord(value) ? value : {};
  return {
    white: nullableAccuracy(src.white),
    black: nullableAccuracy(src.black),
  };
}

function normalizeEval(value: unknown) {
  if (!isRecord(value)) return null;
  const cp = value.cp;
  const mate = value.mate;
  return {
    ...value,
    cp: cp === null || cp === undefined ? undefined : finiteNumber(cp, 0),
    mate: mate === null || mate === undefined ? undefined : finiteNumber(mate, 0),
    depth: finiteNumber(value.depth, 0),
  } as AnalyzedMove["evalAfter"];
}

/** A move is only renderable if the board can actually replay it. */
function normalizeMove(value: unknown, index: number): AnalyzedMove | null {
  if (!isRecord(value)) return null;

  const san = typeof value.san === "string" ? value.san : "";
  const fenBefore = typeof value.fenBefore === "string" ? value.fenBefore : "";
  const fenAfter = typeof value.fenAfter === "string" ? value.fenAfter : "";
  if (!san || !fenBefore || !fenAfter) return null;

  const color = value.color === "b" ? "b" : "w";
  const classification = CLASSIFICATIONS.includes(
    value.classification as (typeof CLASSIFICATIONS)[number]
  )
    ? (value.classification as AnalyzedMove["classification"])
    : "good";

  return {
    ...(value as object),
    moveNumber: Math.max(
      1,
      Math.floor(finiteNumber(value.moveNumber, Math.floor(index / 2) + 1))
    ),
    color,
    san,
    uci: typeof value.uci === "string" ? value.uci : "",
    fenBefore,
    fenAfter,
    evalBefore: normalizeEval(value.evalBefore),
    evalAfter: normalizeEval(value.evalAfter),
    eBest: finiteNumber(value.eBest, 0),
    eActual: finiteNumber(value.eActual, 0),
    deltaE: finiteNumber(value.deltaE, 0),
    classification,
  } as AnalyzedMove;
}

export function normalizeReviewSummary(value: unknown): ReviewSummary {
  const src = isRecord(value) ? value : {};
  const accuracy = isRecord(src.accuracy) ? src.accuracy : {};

  const summary: ReviewSummary = {
    white: normalizeCounts(src.white),
    black: normalizeCounts(src.black),
    accuracy: {
      white: accuracyValue(accuracy.white),
      black: accuracyValue(accuracy.black),
    },
  };

  if (isRecord(src.phaseAccuracy)) {
    const p = src.phaseAccuracy;
    summary.phaseAccuracy = {
      opening: normalizePhaseSide(p.opening),
      middlegame: normalizePhaseSide(p.middlegame),
      endgame: normalizePhaseSide(p.endgame),
    };
  }
  if (isRecord(src.coverage)) {
    const c = src.coverage;
    const reasons = isRecord(c.unverifiedReasons) ? c.unverifiedReasons : {};
    summary.coverage = {
      totalPlies: Math.max(0, Math.floor(finiteNumber(c.totalPlies, 0))),
      classifiedPlies: Math.max(0, Math.floor(finiteNumber(c.classifiedPlies, 0))),
      verifiedPlies: Math.max(0, Math.floor(finiteNumber(c.verifiedPlies, 0))),
      unverifiedPlies: Math.max(0, Math.floor(finiteNumber(c.unverifiedPlies, 0))),
      unverifiedReasons: {
        missing_eval: Math.max(0, Math.floor(finiteNumber(reasons.missing_eval, 0))),
        shallow_depth: Math.max(0, Math.floor(finiteNumber(reasons.shallow_depth, 0))),
        high_disagreement: Math.max(
          0,
          Math.floor(finiteNumber(reasons.high_disagreement, 0))
        ),
      },
    };
  }
  if (isRecord(src.accuracyMeta)) {
    const method = src.accuracyMeta.method;
    if (ACCURACY_METHODS.includes(method as AccuracyMethod)) {
      summary.accuracyMeta = {
        method: method as AccuracyMethod,
        formulaVersion:
          typeof src.accuracyMeta.formulaVersion === "string"
            ? src.accuracyMeta.formulaVersion
            : "unknown",
      };
    }
  }

  return summary;
}

export function normalizeAnalyzedMoves(value: unknown): AnalyzedMove[] {
  if (!Array.isArray(value)) return [];
  const out: AnalyzedMove[] = [];
  for (let i = 0; i < value.length; i++) {
    const move = normalizeMove(value[i], i);
    // Skip unusable entries rather than discarding the whole review; board
    // replay derives positions from each move's own FEN.
    if (move) out.push(move);
  }
  return out;
}

export interface NormalizedReviewPayload {
  moves: AnalyzedMove[];
  summary: ReviewSummary;
  run: ReviewResult["run"] | null;
  /** True when some entries were unusable, so callers can warn. */
  droppedMoves: number;
}

/**
 * Validate an externally supplied review.
 * Throws only when there is nothing renderable left.
 */
export function normalizeReviewPayload(
  value: unknown
): NormalizedReviewPayload {
  if (!isRecord(value)) {
    throw new InvalidReviewPayloadError("Review data is missing or malformed");
  }

  const rawMoves = Array.isArray(value.moves) ? value.moves : [];
  const moves = normalizeAnalyzedMoves(rawMoves);
  if (moves.length === 0) {
    throw new InvalidReviewPayloadError("Review contains no readable moves");
  }

  return {
    moves,
    summary: normalizeReviewSummary(value.summary),
    // `run` is provenance metadata rendered defensively downstream, so it is
    // passed through as-is when present rather than rebuilt field by field.
    run: isRecord(value.run) ? (value.run as unknown as ReviewResult["run"]) : null,
    droppedMoves: rawMoves.length - moves.length,
  };
}

/** Cached game-list entries, which also render without validation. */
export function normalizeCachedGames(value: unknown): Array<
  Record<string, unknown>
> {
  if (!Array.isArray(value)) return [];
  return value.filter((game): game is Record<string, unknown> => {
    if (!isRecord(game)) return false;
    // The list calls .toLowerCase() on both player names during render.
    return (
      typeof game.id === "string" &&
      typeof game.pgn === "string" &&
      typeof game.white === "string" &&
      typeof game.black === "string"
    );
  });
}
