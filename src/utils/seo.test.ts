import { describe, expect, it } from "vitest";
import { escapeHtml, shareReviewJsonLd, SITE_ORIGIN } from "./seo";

describe("seo", () => {
  it("escapes HTML for meta injection", () => {
    expect(escapeHtml(`a & b < "c"`)).toBe("a &amp; b &lt; &quot;c&quot;");
  });

  it("builds share review JSON-LD with accuracy", () => {
    const ld = shareReviewJsonLd({
      id: "abc123",
      whiteName: "Alice",
      blackName: "Bob",
      whiteAccuracy: 91.2,
      blackAccuracy: 88.7,
    });
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe("Alice vs Bob — Chess Game Review");
    expect(ld.url).toBe(`${SITE_ORIGIN}/r/abc123`);
    expect(String(ld.description)).toContain("91%");
    expect(String(ld.description)).toContain("89%");
  });
});
