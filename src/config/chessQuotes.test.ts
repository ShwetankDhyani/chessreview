import { describe, expect, it } from "vitest";
import {
  CHESS_QUOTES,
  getQuoteForTags,
  getQuoteByIndex,
} from "./chessQuotes";
import { getProductById } from "./affiliateProducts";

describe("chessQuotes", () => {
  it("ensures every quote maps to a defined affiliate product", () => {
    for (const q of CHESS_QUOTES) {
      expect(q.quote).toBeTruthy();
      expect(q.author).toBeTruthy();
      expect(q.reflection).toBeTruthy();
      const product = getProductById(q.productId);
      expect(
        product,
        `Product with id "${q.productId}" for quote "${q.id}" must exist`
      ).toBeDefined();
    }
  });

  it("returns appropriate quote for tactical weakness", () => {
    const result = getQuoteForTags(["tactics", "blunders"]);
    expect(result).not.toBeNull();
    expect(result?.product).toBeDefined();
    expect(result?.quote.tags).toEqual(
      expect.arrayContaining(["tactics"])
    );
  });

  it("returns appropriate quote for endgame weakness", () => {
    const result = getQuoteForTags(["endgame", "technique"]);
    expect(result).not.toBeNull();
    expect(result?.product.id).toBe("book-silman-endgame");
  });

  it("cycles quotes predictably by index", () => {
    const q0 = getQuoteByIndex(0);
    const q1 = getQuoteByIndex(1);
    expect(q0).not.toBeNull();
    expect(q1).not.toBeNull();
    expect(q0?.quote.id).not.toBe(q1?.quote.id);
  });
});
