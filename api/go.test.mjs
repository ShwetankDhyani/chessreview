import { describe, expect, it } from "vitest";
import handler, {
  resolveAffiliateDestination,
  TAG_US,
  TAG_IN,
  AMAZON_QUERIES,
  DIRECT_URLS,
} from "./go.mjs";

describe("/api/go affiliate redirect handler", () => {
  it("resolves woodpecker method for India store with chessreview-21", () => {
    const url = resolveAffiliateDestination("book-woodpecker", "in");
    expect(url).toContain("amazon.in");
    expect(url).toContain("tag=" + TAG_IN);
    expect(url).toContain("woodpecker");
  });

  it("resolves woodpecker method for US store with chessreview-20", () => {
    const url = resolveAffiliateDestination("book-woodpecker", "us");
    expect(url).toContain("amazon.com");
    expect(url).toContain("tag=" + TAG_US);
    expect(url).toContain("woodpecker");
  });

  it("resolves all known Amazon products correctly for US and IN", () => {
    for (const [id, query] of Object.entries(AMAZON_QUERIES)) {
      const usUrl = resolveAffiliateDestination(id, "us");
      const inUrl = resolveAffiliateDestination(id, "in");

      expect(usUrl).toContain("amazon.com");
      expect(usUrl).toContain("tag=chessreview-20");

      expect(inUrl).toContain("amazon.in");
      expect(inUrl).toContain("tag=chessreview-21");
    }
  });

  it("resolves direct partner URLs like chessable", () => {
    for (const [id, dest] of Object.entries(DIRECT_URLS)) {
      expect(resolveAffiliateDestination(id, "us")).toBe(dest);
      expect(resolveAffiliateDestination(id, "in")).toBe(dest);
    }
  });

  it("handles unknown product IDs gracefully with fallback search rather than 404", () => {
    const fallbackIn = resolveAffiliateDestination("unknown-custom-item", "in");
    expect(fallbackIn).toContain("amazon.in");
    expect(fallbackIn).toContain("tag=" + TAG_IN);
    expect(fallbackIn).toContain("unknown%20custom%20item");

    const fallbackUs = resolveAffiliateDestination("unknown-custom-item", "us");
    expect(fallbackUs).toContain("amazon.com");
    expect(fallbackUs).toContain("tag=" + TAG_US);
  });

  it("handler redirects 302 with proper destination", async () => {
    let statusCode = null;
    let redirectUrl = null;
    const headers = {};

    const req = {
      method: "GET",
      query: { id: "book-woodpecker", store: "IN", placement: "desktop-study" },
      headers: {},
    };

    const res = {
      setHeader(k, v) {
        headers[k] = v;
      },
      status(c) {
        statusCode = c;
        return this;
      },
      redirect(code, url) {
        statusCode = code;
        redirectUrl = url;
        return this;
      },
      json() {},
    };

    await handler(req, res);

    expect(statusCode).toBe(302);
    expect(redirectUrl).toContain("amazon.in");
    expect(redirectUrl).toContain("the%20woodpecker%20method%20chess");
    expect(redirectUrl).toContain("tag=chessreview-21");
    expect(headers["Cache-Control"]).toBe("no-store");
  });

  it("handler auto-detects India via x-vercel-ip-country header", async () => {
    let statusCode = null;
    let redirectUrl = null;

    const req = {
      method: "GET",
      query: { id: "wooden-chess-set" },
      headers: { "x-vercel-ip-country": "IN" },
    };

    const res = {
      setHeader() {},
      redirect(code, url) {
        statusCode = code;
        redirectUrl = url;
      },
    };

    await handler(req, res);

    expect(statusCode).toBe(302);
    expect(redirectUrl).toContain("amazon.in");
    expect(redirectUrl).toContain("tag=chessreview-21");
  });
});
