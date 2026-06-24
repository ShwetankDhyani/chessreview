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

function engineShareUrl(): string | null {
  const raw = import.meta.env.VITE_EVAL_SERVER_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

async function readShareJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  let data: { error?: string; id?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error ?? "Could not create share link");
  }
  return data;
}

export async function createShareLink(
  payload: ShareReviewPayload
): Promise<ShareReviewResponse> {
  const engineUrl = engineShareUrl();
  const sources = [
    "/api/share",
    engineUrl ? `${engineUrl}/share` : null,
  ].filter(Boolean) as string[];

  let lastError = "Could not create share link";
  for (const url of sources) {
    try {
      const data = await readShareJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (data?.id) return data as ShareReviewResponse;
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    }
  }
  throw new Error(lastError);
}

export async function fetchSharedReview(id: string) {
  const engineUrl = engineShareUrl();
  const sources = [
    `/api/share?id=${encodeURIComponent(id)}`,
    engineUrl ? `${engineUrl}/share/${encodeURIComponent(id)}` : null,
  ].filter(Boolean) as string[];

  let lastError = "Review not found";
  for (const url of sources) {
    try {
      const data = await readShareJson(url);
      if (data) {
        return data as ShareReviewPayload & { id: string; createdAt?: string };
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    }
  }
  throw new Error(lastError);
}

export function shareUrlForId(id: string): string {
  const base = window.location.origin.replace(/\/$/, "");
  return `${base}/r/${id}`;
}
