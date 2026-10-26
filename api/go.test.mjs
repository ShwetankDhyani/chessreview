import { describe, expect, it } from "vitest";
import handler, {
  resolveAffiliateDestination,
  normalizeStore,
  TAG_US,
  TAG_IN,
  TAG_EU,
  AMAZON_ASINS,
  AMAZON_QUERIES,
  DIRECT_URLS,
} from "./go.mjs";

describe("normalizeStore", () => {
  it("maps store params and EU country headers", () => {
    expect(normalizeStore("US", "")).toBe("us");
    expect(normalizeStore("IN", "")).toBe("in");
    expect(normalizeStore("DE", "")).toBe("de");
    expect(normalizeStore("UK", "")).toBe("uk");
    expect(normalizeStore("GB", "")).toBe("uk");
    expect(normalizeStore("FR", "")).toBe("fr");
    expect(normalizeStore("", "DE")).toBe("de");
    expect(normalizeStore("", "GB")).toBe("uk");
    expect(normalizeStore("", "NL")).toBe("de");
    expect(normalizeStore("", "PL")).toBe("de");
    expect(normalizeStore("", "SE")).toBe("de");
    expect(normalizeStore("", "IN")).toBe("in");
    expect(normalizeStore("", "US")).toBe("us");
  });
});

describe("/api/go affiliate redirect handler", () => {
  it("resolves woodpecker via /dp/ASIN for India with chessreview-21", () => {
    const url = resolveAffiliateDestination("book-woodpecker", "in");
    expect(url).toBe(
      `https://www.amazon.in/dp/${AMAZON_ASINS["book-woodpecker"]}?tag=${TAG_IN}`
    );
  });

  it("resolves woodpecker via /dp/ASIN for US with chessreview-20", () => {
    const url = resolveAffiliateDestination("book-woodpecker", "us");
    expect(url).toBe(
      `https://www.amazon.com/dp/${AMAZON_ASINS["book-woodpecker"]}?tag=${TAG_US}`
    );
  });

  it("resolves EU stores with chessreview04-21 and /dp/ASIN", () => {
    for (const store of ["de", "uk", "fr", "it", "es"]) {
      const url = resolveAffiliateDestination("book-logical-chess", store);
      const domain =
        store === "uk"
          ? "amazon.co.uk"
          : store === "us"
            ? "amazon.com"
            : `amazon.${store}`;
      expect(url).toBe(
        `https://www.${domain}/dp/${AMAZON_ASINS["book-logical-chess"]}?tag=${TAG_EU}`
      );
    }
  });

  it("resolves all known Amazon ASINs for US and IN", () => {
    for (const id of Object.keys(AMAZON_ASINS)) {
      const usUrl = resolveAffiliateDestination(id, "us");
      const inUrl = resolveAffiliateDestination(id, "in");
      expect(usUrl).toContain("amazon.com/dp/");
      expect(usUrl).toContain("tag=chessreview-20");
      expect(inUrl).toContain("amazon.in/dp/");
      expect(inUrl).toContain("tag=chessreview-21");
    }
  });

  it("keeps AMAZON_QUERIES as search fallback catalog keys", () => {
    expect(Object.keys(AMAZON_QUERIES).sort()).toEqual(
      Object.keys(AMAZON_ASINS).sort()
    );
  });

  it("resolves direct partner URLs like chessable", () => {
    for (const [id, dest] of Object.entries(DIRECT_URLS)) {
      expect(resolveAffiliateDestination(id, "us")).toBe(dest);
      expect(resolveAffiliateDestination(id, "de")).toBe(dest);
    }
  });

  it("handles unknown product IDs gracefully with fallback search", () => {
    const fallbackIn = resolveAffiliateDestination("unknown-custom-item", "in");
    expect(fallbackIn).toContain("amazon.in");
    expect(fallbackIn).toContain("tag=" + TAG_IN);

    const fallbackDe = resolveAffiliateDestination("unknown-custom-item", "de");
    expect(fallbackDe).toContain("amazon.de");
    expect(fallbackDe).toContain("tag=" + TAG_EU);
  });

  it("handler redirects 302 for India store param", async () => {
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
    expect(redirectUrl).toContain("amazon.in/dp/");
    expect(redirectUrl).toContain("tag=chessreview-21");
    expect(headers["Cache-Control"]).toBe("no-store");
  });

  it("handler routes DE store and DE country header to amazon.de", async () => {
    let redirectUrl = null;
    await handler(
      {
        method: "GET",
        query: { id: "book-logical-chess", store: "DE" },
        headers: {},
      },
      {
        setHeader() {},
        redirect(_c, url) {
          redirectUrl = url;
        },
      }
    );
    expect(redirectUrl).toContain("amazon.de/dp/");
    expect(redirectUrl).toContain("tag=chessreview04-21");

    redirectUrl = null;
    await handler(
      {
        method: "GET",
        query: { id: "wooden-chess-set" },
        headers: { "x-vercel-ip-country": "DE" },
      },
      {
        setHeader() {},
        redirect(_c, url) {
          redirectUrl = url;
        },
      }
    );
    expect(redirectUrl).toContain("amazon.de/dp/");
    expect(redirectUrl).toContain("tag=chessreview04-21");
  });

  it("handler auto-detects India via x-vercel-ip-country header", async () => {
    let statusCode = null;
    let redirectUrl = null;

    await handler(
      {
        method: "GET",
        query: { id: "wooden-chess-set" },
        headers: { "x-vercel-ip-country": "IN" },
      },
      {
        setHeader() {},
        redirect(code, url) {
          statusCode = code;
          redirectUrl = url;
        },
      }
    );

    expect(statusCode).toBe(302);
    expect(redirectUrl).toContain("amazon.in/dp/");
    expect(redirectUrl).toContain("tag=chessreview-21");
  });
});
