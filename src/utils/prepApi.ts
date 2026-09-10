import type { PrepAnalyzeRequest, PrepAnalyzeResponse } from "./prepTypes";
import { fetchWithTimeout } from "./netRetry";

export async function analyzePrepForm(
  body: PrepAnalyzeRequest
): Promise<PrepAnalyzeResponse> {
  const res = await fetchWithTimeout(
    "/api/prep/analyze",
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
      typeof data.error === "string" ? data.error : "Prep analyze failed"
    );
  }
  return data;
}
