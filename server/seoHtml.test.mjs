import { describe, expect, it } from "vitest";
import { cleanMetaDescription, escapeHtml } from "./seoHtml.mjs";

describe("seoHtml", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml(`a & b < "c"`)).toBe("a &amp; b &lt; &quot;c&quot;");
  });

  it("collapses whitespace and truncates meta descriptions", () => {
    const messy = "Upto 5-8 times faster\n\nreviews, improved\naccuracy";
    expect(cleanMetaDescription(messy)).toBe(
      "Upto 5-8 times faster reviews, improved accuracy"
    );
    const long = "word ".repeat(80).trim();
    const out = cleanMetaDescription(long, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("…")).toBe(true);
  });
});
