import { describe, expect, it } from "vitest";
import { geoFromHeaders, normalizeReviewPayload } from "./reviewStats.mjs";

describe("normalizeReviewPayload geo", () => {
  const base = {
    runId: "run-1",
    depth: 16,
    durationMs: 12_000,
  };

  it("prefers explicit body country over relay headers", () => {
    const row = normalizeReviewPayload(
      { ...base, countryCode: "IN", region: "MH", city: "Pune" },
      geoFromHeaders({ "cf-ipcountry": "US", "cf-region": "CA" })
    );
    expect(row.country_code).toBe("IN");
    expect(row.region).toBe("MH");
    expect(row.city).toBe("Pune");
  });

  it("falls back to request headers when body has no geo", () => {
    const row = normalizeReviewPayload(base, geoFromHeaders({ "x-vercel-ip-country": "DE" }));
    expect(row.country_code).toBe("DE");
  });
});
