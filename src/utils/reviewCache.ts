import type { ReviewResult } from "../types";
import { safeGetItem, safeRemoveItem, safeSetItem } from "./safeStorage";

type ProfileRef = { name: string; platform: "chesscom" | "lichess" } | null;

interface CachedReviewRecord {
  key: string;
  savedAt: number;
  result: ReviewResult;
}

const STORAGE_KEY = "cr_saved_reviews_v1";
/** Lightweight monotonic count of finished local reviews (not full result payloads). */
const COMPLETION_COUNT_KEY = "cr_reviews_completed_count";
const MAX_RECORDS = 40;

function hashText(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = (hash * 33) ^ value.charCodeAt(i);
  return `h${(hash >>> 0).toString(16)}`;
}

function normalizePgn(pgn: string): string {
  return pgn.replace(/\s+/g, " ").trim();
}

function profileKey(profile: ProfileRef): string {
  if (!profile) return "local:guest";
  return `${profile.platform}:${profile.name.toLowerCase()}`;
}

function reviewKey(profile: ProfileRef, pgn: string): string {
  return `${profileKey(profile)}:${hashText(normalizePgn(pgn))}`;
}

function readRecords(): CachedReviewRecord[] {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedReviewRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: CachedReviewRecord[]): void {
  safeSetItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}

/**
 * How many reviews this browser has completed.
 *
 * Used as a "has this person actually got value yet?" signal, so we can hold
 * back anything that would be presumptuous to show a first-time visitor.
 *
 * Prefers the dedicated completion counter (bumped on every successful analysis).
 * Falls back to timing samples / cached result records for sessions that
 * finished reviews before the counter existed.
 */
export function countCachedReviews(): number {
  const raw = safeGetItem(COMPLETION_COUNT_KEY);
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }

  const fromRecords = readRecords().length;
  let fromTiming = 0;
  try {
    const timingRaw = safeGetItem("cr_review_timing_v1");
    if (timingRaw) {
      const parsed = JSON.parse(timingRaw) as unknown;
      if (Array.isArray(parsed)) fromTiming = parsed.length;
    }
  } catch {
    /* ignore corrupt timing history */
  }

  const legacy = Math.max(fromRecords, fromTiming);
  // Persist so later increments stay monotonic even if timing history is cleared.
  if (legacy > 0) {
    safeSetItem(COMPLETION_COUNT_KEY, String(legacy));
  }
  return legacy;
}

/**
 * Record that a review finished in this browser.
 *
 * Kept separate from {@link saveReview}: storing full analysis payloads is optional
 * and can fail on quota, but the appeal gate still needs a reliable use signal.
 */
export function recordReviewCompletion(): void {
  try {
    const next = countCachedReviews() + 1;
    safeSetItem(COMPLETION_COUNT_KEY, String(next));
  } catch {
    // Best-effort only.
  }
}

export function loadSavedReview(profile: ProfileRef, pgn: string): ReviewResult | null {
  const key = reviewKey(profile, pgn);
  const hit = readRecords().find((r) => r.key === key);
  return hit?.result ?? null;
}

export function saveReview(profile: ProfileRef, pgn: string, result: ReviewResult): void {
  try {
    const key = reviewKey(profile, pgn);
    const existing = readRecords().filter((r) => r.key !== key);
    const next: CachedReviewRecord = {
      key,
      savedAt: Date.now(),
      result,
    };
    existing.sort((a, b) => b.savedAt - a.savedAt);
    writeRecords([next, ...existing]);
  } catch {
    // Best-effort cache only.
  }
}
