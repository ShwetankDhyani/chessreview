import type { ReviewResult } from "../types";
import { safeGetItem, safeRemoveItem, safeSetItem } from "./safeStorage";

type ProfileRef = { name: string; platform: "chesscom" | "lichess" } | null;

interface CachedReviewRecord {
  key: string;
  savedAt: number;
  result: ReviewResult;
}

const STORAGE_KEY = "cr_saved_reviews_v1";
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
