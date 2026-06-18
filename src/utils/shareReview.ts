import type { AnalyzedMove, ReviewResult, ReviewSummary } from "../types";

export interface ShareReviewPayload {
  pgn: string;
  whiteName: string;
  blackName: string;
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  run: ReviewResult["run"] | null;
}

export interface ShareReviewResponse {
  ok: boolean;
  id: string;
  urlPath: string;
}

export async function createShareLink(payload: ShareReviewPayload): Promise<ShareReviewResponse> {
  const res = await fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Could not create share link");
  }
  return data as ShareReviewResponse;
}

export async function fetchSharedReview(id: string) {
  const res = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Review not found");
  }
  return data as ShareReviewPayload & { id: string; createdAt?: string };
}

export function shareUrlForId(id: string): string {
  const base = window.location.origin.replace(/\/$/, "");
  return `${base}/r/${id}`;
}
