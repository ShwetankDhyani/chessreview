import type { PrepAnalyzeRequest, PrepAnalyzeResponse } from "./prepTypes";
import { fetchWithTimeout } from "./netRetry";

export async function analyzePrepForm(
  body: PrepAnalyzeRequest
): Promise<PrepAnalyzeResponse> {
  const res = await fetchWithTimeout(
    "/api/h2h/analyze",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    90_000
  );
  const data = (await res.json().catch(() => ({}))) as PrepAnalyzeResponse & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Couldn't load form"
    );
  }
  // Normalize older cached payloads.
  if (data.opponent && !data.opponent.summary && data.opponent.scoutingReport) {
    data.opponent.summary = data.opponent.scoutingReport;
  }
  if (data.self && !data.self.summary && data.self.scoutingReport) {
    data.self.summary = data.self.scoutingReport;
  }
  return data;
}

/** Optional client-side H2H analytics ping (same shape as review events). */
export function recordPrepLookupCompleted(input: {
  request: PrepAnalyzeRequest;
  response: PrepAnalyzeResponse;
  durationMs: number;
}): void {
  void recordPrepLookupCompletedAsync(input);
}

async function recordPrepLookupCompletedAsync(input: {
  request: PrepAnalyzeRequest;
  response: PrepAnalyzeResponse;
  durationMs: number;
}): Promise<void> {
  const { request, response, durationMs } = input;
  const opponent = response.opponent;
  const self = response.self;
  const payload = {
    username: opponent?.username ?? request.username,
    platform: opponent?.platform ?? request.platform,
    selfUsername: self?.username ?? request.selfUsername ?? null,
    selfPlatform: self?.platform ?? request.selfPlatform ?? null,
    compare: !!self && !response.compareSkipped,
    compareSkipped: !!response.compareSkipped,
    compareSkipReason: response.compareSkipped?.reason ?? null,
    cacheHit: opponent?.cache?.hit ?? null,
    selfCacheHit: self?.cache?.hit ?? null,
    sampleSize: opponent?.sampleSize ?? null,
    selfSampleSize: self?.sampleSize ?? null,
    durationMs,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    source: "h2h-client",
  };

  const postOpts: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  };

  try {
    const res = await fetchWithTimeout("/api/prep-events", postOpts, 8_000);
    if (res.ok) return;
  } catch {
    /* fall through to engine */
  }

  const engineUrl = import.meta.env.VITE_EVAL_SERVER_URL?.replace(/\/$/, "");
  if (!engineUrl) return;

  try {
    await fetchWithTimeout(`${engineUrl}/stats/prep`, postOpts, 8_000);
  } catch {
    /* analytics must never block or surface errors */
  }
}
