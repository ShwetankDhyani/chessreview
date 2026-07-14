import type { AnalyzedMove, ReviewResult, ReviewSummary } from "../types";

export interface DemoReviewPayload {
  pgn: string;
  whiteName: string;
  blackName: string;
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  run: ReviewResult["run"] | null;
  depth?: number;
  createdAt?: string;
}

function engineUrl(): string | null {
  const raw = import.meta.env.VITE_EVAL_SERVER_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

async function readDemoJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  let data: { error?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Demo review unavailable"
    );
  }
  return data;
}

export async function fetchDemoReview(): Promise<DemoReviewPayload> {
  const remote = engineUrl();
  const sources = [
    "/api/demo-review",
    remote ? `${remote}/demo-review` : null,
  ].filter(Boolean) as string[];

  let lastError = "Demo review unavailable";
  for (const url of sources) {
    try {
      const data = await readDemoJson(url);
      if (
        data &&
        typeof (data as DemoReviewPayload).pgn === "string" &&
        Array.isArray((data as DemoReviewPayload).moves) &&
        (data as DemoReviewPayload).summary
      ) {
        return data as DemoReviewPayload;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    }
  }
  throw new Error(lastError);
}
