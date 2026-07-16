import { describe, expect, it } from "vitest";
import {
  applyPinMapToPosts,
  comparePostsWithPins,
  parseBlogPinMap,
} from "./blogPins.mjs";

describe("blogPins compat map", () => {
  it("parses pins from reserved post body", () => {
    expect(
      parseBlogPinMap({ body: JSON.stringify({ pins: { a: 2, b: 1 } }) })
    ).toEqual({ a: 2, b: 1 });
    expect(parseBlogPinMap({ post: { body: '{"pins":{"x":3}}' } })).toEqual({
      x: 3,
    });
  });

  it("applies pin map and sorts pinned first", () => {
    const posts = [
      { id: "old", title: "Old", createdAt: "2026-01-01", pinned: false },
      { id: "new", title: "New", createdAt: "2026-06-01", pinned: false },
      { id: "mid", title: "Mid", createdAt: "2026-03-01", pinned: false },
    ];
    const applied = applyPinMapToPosts(posts, { mid: 1, old: 2 }).sort(
      comparePostsWithPins
    );
    expect(applied.map((p) => p.id)).toEqual(["mid", "old", "new"]);
    expect(applied[0].pinned).toBe(true);
    expect(applied[0].pinOrder).toBe(1);
    expect(applied[2].pinned).toBe(false);
  });
});
