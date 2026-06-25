import { describe, expect, it } from "vitest";
import {
  buildReviewShareText,
  telegramShareUrl,
  whatsAppShareUrl,
} from "./socialShare";

describe("socialShare", () => {
  it("builds share text with accuracy", () => {
    expect(
      buildReviewShareText({
        whiteName: "Alice",
        blackName: "Bob",
        whiteAccuracy: 91.2,
        blackAccuracy: 88.7,
      })
    ).toBe(
      "Alice vs Bob — chess game review on ChessReview (91% vs 89% accuracy)"
    );
  });

  it("builds WhatsApp and Telegram URLs", () => {
    const text = "Game review";
    const url = "https://www.chessreview.org/r/abc";
    expect(whatsAppShareUrl(url, text)).toContain("wa.me");
    expect(whatsAppShareUrl(url, text)).toContain(encodeURIComponent(url));
    expect(telegramShareUrl(url, text)).toContain("t.me/share/url");
  });
});
