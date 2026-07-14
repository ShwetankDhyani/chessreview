import { describe, expect, it } from "vitest";
import { normalizePgn, samePgn } from "./pgnIdentity";

describe("pgnIdentity", () => {
  it("treats whitespace-equivalent PGNs as the same game", () => {
    const a = "1. e4 e5\n2. Nf3";
    const b = "1. e4 e5 2. Nf3";
    expect(normalizePgn(a)).toBe("1. e4 e5 2. Nf3");
    expect(samePgn(a, b)).toBe(true);
  });

  it("distinguishes different games", () => {
    expect(samePgn("1. e4 e5", "1. d4 d5")).toBe(false);
  });
});
