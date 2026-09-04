import { describe, expect, it } from "vitest";
import {
  isSnoozed,
  MIN_REVIEWS_BEFORE_APPEAL,
  shouldShowAppeal,
  SUPPORT_APPEAL_SNOOZE_MS,
} from "./SupportAppeal";

const NOW = 1_800_000_000_000;

describe("who sees the appeal", () => {
  it("stays hidden until the site has actually helped someone", () => {
    // A first-time visitor should never be asked for money, and would
    // otherwise see this stacked under the welcome banner.
    for (let reviews = 0; reviews < MIN_REVIEWS_BEFORE_APPEAL; reviews++) {
      expect(
        shouldShowAppeal({ dismissedAt: null, reviewCount: reviews, now: NOW })
      ).toBe(false);
    }
  });

  it("shows once enough reviews are done", () => {
    expect(
      shouldShowAppeal({
        dismissedAt: null,
        reviewCount: MIN_REVIEWS_BEFORE_APPEAL,
        now: NOW,
      })
    ).toBe(true);
  });

  it("respects a dismissal even for a heavy user", () => {
    expect(
      shouldShowAppeal({
        dismissedAt: String(NOW),
        reviewCount: 50,
        now: NOW,
      })
    ).toBe(false);
  });

  it("asks only after real use, never on a first visit", () => {
    expect(MIN_REVIEWS_BEFORE_APPEAL).toBeGreaterThan(1);
  });
});

describe("support appeal snooze", () => {
  it("shows when never dismissed", () => {
    expect(isSnoozed(null, NOW)).toBe(false);
  });

  it("stays hidden immediately after dismissal", () => {
    expect(isSnoozed(String(NOW), NOW)).toBe(true);
  });

  it("stays hidden for the whole snooze window", () => {
    const justInside = NOW - (SUPPORT_APPEAL_SNOOZE_MS - 60_000);
    expect(isSnoozed(String(justInside), NOW)).toBe(true);
  });

  it("returns once the window has passed", () => {
    // Dismissing means "not right now", not "never ask again".
    const expired = NOW - (SUPPORT_APPEAL_SNOOZE_MS + 60_000);
    expect(isSnoozed(String(expired), NOW)).toBe(false);
  });

  it("treats a corrupt timestamp as never dismissed", () => {
    for (const value of ["", "abc", "NaN", "0", "-5"]) {
      expect(isSnoozed(value, NOW)).toBe(false);
    }
  });

  it("keeps it hidden if the clock moved backwards", () => {
    // A future timestamp would otherwise make the card reappear every load.
    expect(isSnoozed(String(NOW + 5_000), NOW)).toBe(true);
  });

  it("snoozes for a couple of months, not days or forever", () => {
    const days = SUPPORT_APPEAL_SNOOZE_MS / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThanOrEqual(30);
    expect(days).toBeLessThanOrEqual(120);
  });
});
