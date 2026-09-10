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
      typeof data.error === "string" ? data.error : "Couldn’t load form"
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
