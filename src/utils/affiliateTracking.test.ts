import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { affiliateGoHref, resolveOutboundUrl } from "./affiliateTracking";

function createMockStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => void map.clear(),
  };
}

describe("affiliateTracking", () => {
  let mockSession: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockSession = createMockStorage();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", mockSession);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves direct Amazon URL with US tag when country is US", () => {
    mockSession.setItem("amazon_store", "US");
    const url = resolveOutboundUrl("book-woodpecker");
    expect(url).toBeDefined();
    expect(url).toContain("amazon.com");
    expect(url).toContain("tag=chessreview-20");
    expect(url).toContain("woodpecker");
  });

  it("resolves direct Amazon India URL with IN tag when country is IN", () => {
    mockSession.setItem("amazon_store", "IN");
    const url = resolveOutboundUrl("book-woodpecker");
    expect(url).toBeDefined();
    expect(url).toContain("amazon.in");
    expect(url).toContain("tag=chessreview-21");
    expect(url).toContain("woodpecker");
  });

  it("affiliateGoHref returns direct geo URL for existing products", () => {
    mockSession.setItem("amazon_store", "IN");
    const href = affiliateGoHref("book-woodpecker", "desktop-study");
    expect(href).toContain("amazon.in");
    expect(href).toContain("tag=chessreview-21");
  });

  it("affiliateGoHref falls back to /go/:id for unlisted products", () => {
    mockSession.setItem("amazon_store", "US");
    const href = affiliateGoHref("unlisted-item", "desktop-study");
    expect(href).toContain("/go/unlisted-item");
  });
});
