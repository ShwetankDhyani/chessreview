import type { AnalyzedMove, ReviewResult, ReviewSummary } from "../types";
import { fetchWithTimeout } from "./netRetry";

export interface SavedReviewListItem {
  id: string;
  whiteName: string;
  blackName: string;
  savedAt: number;
  movesCount: number;
}

export interface SavedReviewRecord {
  id: string;
  platform: "chesscom" | "lichess";
  username: string;
  whiteName: string;
  blackName: string;
  pgn: string;
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  run: ReviewResult["run"] | null;
  savedAt: number;
}

interface SaveReviewPayload {
  platform: "chesscom" | "lichess";
  username: string;
  pgn: string;
  whiteName: string;
  blackName: string;
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  run: ReviewResult["run"] | null;
}

/** Saved-review calls block user actions, so they need a hard ceiling. */
const SAVED_REVIEW_TIMEOUT_MS = 20_000;

async function readJson(url: string, init?: RequestInit) {
  const res = await fetchWithTimeout(url, init, SAVED_REVIEW_TIMEOUT_MS);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error ?? "Saved review request failed");
  }
  return data;
}

export async function listSavedReviews(profile: {
  platform: "chesscom" | "lichess";
  username: string;
}): Promise<SavedReviewListItem[]> {
  const url = `/api/saved-reviews?platform=${encodeURIComponent(
    profile.platform
  )}&username=${encodeURIComponent(profile.username)}`;
  const data = await readJson(url);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function loadSavedReviewById(params: {
  platform: "chesscom" | "lichess";
  username: string;
  id: string;
}): Promise<SavedReviewRecord> {
  const url = `/api/saved-reviews?id=${encodeURIComponent(
    params.id
  )}&platform=${encodeURIComponent(params.platform)}&username=${encodeURIComponent(
    params.username
  )}`;
  const data = await readJson(url);
  if (!data?.review) throw new Error("Saved review not found");
  return data.review as SavedReviewRecord;
}

export async function saveReviewToCloud(payload: SaveReviewPayload): Promise<void> {
  await readJson("/api/saved-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteSavedReview(params: {
  platform: "chesscom" | "lichess";
  username: string;
  id: string;
}): Promise<void> {
  const url = `/api/saved-reviews?id=${encodeURIComponent(
    params.id
  )}&platform=${encodeURIComponent(params.platform)}&username=${encodeURIComponent(
    params.username
  )}`;
  await readJson(url, { method: "DELETE" });
}
