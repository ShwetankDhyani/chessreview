import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  easeInOutCubic,
  glideHop,
  otbGlideDurationMs,
  resolveOtbMoveAnim,
} from "./otbMoveAnimation";

describe("otbMoveAnimation", () => {
  it("eases smoothly from 0→1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
  });

  it("gives knights a higher hop than sliding pieces", () => {
    expect(glideHop("n")).toBeGreaterThan(glideHop("r"));
    expect(glideHop("n")).toBeGreaterThan(glideHop("p"));
  });

  it("floors 3D glide duration above the 2D board timing", () => {
    expect(otbGlideDurationMs(0)).toBe(0);
    expect(otbGlideDurationMs(380)).toBe(560);
    expect(otbGlideDurationMs(700)).toBe(700);
  });

  it("resolves a quiet forward move", () => {
    const before = new Chess().fen();
    const c = new Chess();
    c.move("e4");
    const after = c.fen();
    const resolved = resolveOtbMoveAnim(before, after, {
      from: "e2",
      to: "e4",
    });
    expect(resolved?.direction).toBe("forward");
    expect(resolved?.move.piece).toBe("p");
    expect(resolved?.captureSquare).toBeNull();
    expect(resolved?.rook).toBeNull();
  });

  it("resolves undo of the same ply", () => {
    const before = new Chess().fen();
    const c = new Chess();
    c.move("e4");
    const after = c.fen();
    const resolved = resolveOtbMoveAnim(after, before, {
      from: "e2",
      to: "e4",
    });
    expect(resolved?.direction).toBe("undo");
    expect(resolved?.move.from).toBe("e2");
    expect(resolved?.move.to).toBe("e4");
  });

  it("flags castling rook glide", () => {
    // Clear path for white O-O
    const before =
      "rnbqk2r/ppppbppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    const c = new Chess(before);
    c.move("O-O");
    const after = c.fen();
    const resolved = resolveOtbMoveAnim(before, after, {
      from: "e1",
      to: "g1",
    });
    expect(resolved?.rook).toEqual({ from: "h1", to: "f1" });
    expect(resolved?.direction).toBe("forward");
  });

  it("flags capture square including en passant", () => {
    // Classic EP setup: white pawn e5, black just played d5
    const before =
      "rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3";
    const c = new Chess(before);
    const move = c.move({ from: "e5", to: "d6" });
    expect(move?.flags).toContain("e");
    const after = c.fen();
    const resolved = resolveOtbMoveAnim(before, after, {
      from: "e5",
      to: "d6",
    });
    expect(resolved?.captureSquare).toBe("d5");
  });
});
