import { describe, expect, it } from "vitest";
import {
  aboutJsonLd,
  blogPostJsonLd,
  escapeHtml,
  homeJsonLdGraph,
  shareReviewJsonLd,
  SITE_ORIGIN,
} from "./seo";

describe("seo", () => {
  it("escapes HTML for meta injection", () => {
    expect(escapeHtml(`a & b < "c"`)).toBe("a &amp; b &lt; &quot;c&quot;");
  });

  it("builds home JSON-LD with WebSite, WebApplication, and Organization", () => {
    const graph = homeJsonLdGraph();
    const nodes = graph["@graph"] as Array<Record<string, unknown>>;
    expect(nodes.map((node) => node["@type"])).toEqual([
      "WebSite",
      "WebApplication",
      "Organization",
    ]);
    const app = nodes.find((n) => n["@type"] === "WebApplication")!;
    expect(app.areaServed).toEqual(
      expect.arrayContaining(["United States", "United Kingdom", "Australia"])
    );
  });

  it("builds about FAQ JSON-LD that mirrors visible copy", () => {
    const graph = aboutJsonLd();
    const nodes = graph["@graph"] as Array<Record<string, unknown>>;
    expect(nodes.map((n) => n["@type"])).toEqual(["AboutPage", "FAQPage"]);
    const faq = nodes.find((n) => n["@type"] === "FAQPage") as {
      mainEntity: Array<{ name: string }>;
    };
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
    expect(faq.mainEntity[0]!.name).toMatch(/free/i);
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

  it("builds blog post JSON-LD", () => {
    const ld = blogPostJsonLd({
      slug: "welcome",
      title: "Welcome",
      excerpt: "Hello club players",
      createdAt: "2026-07-14T00:00:00.000Z",
      authorName: "Shwetank",
    });
    expect(ld["@type"]).toBe("BlogPosting");
    expect(ld.url).toBe(`${SITE_ORIGIN}/blog/welcome`);
    expect(ld.headline).toBe("Welcome");
  });
});
