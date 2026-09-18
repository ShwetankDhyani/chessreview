import { describe, expect, it, beforeEach } from "vitest";
import {
  readBoardView,
  writeBoardView,
  toggleBoardView,
  clearBoardViewPreference,
} from "./boardView";
import { squareToWorld } from "./otbPieceMeshes";

describe("boardView preference", () => {
  beforeEach(() => {
    clearBoardViewPreference();
  });

  it("defaults to 2d", () => {
    expect(readBoardView()).toBe("2d");
  });

  it("persists otb3d", () => {
    writeBoardView("otb3d");
    expect(readBoardView()).toBe("otb3d");
  });

  it("toggles between modes", () => {
    expect(toggleBoardView("2d")).toBe("otb3d");
    expect(readBoardView()).toBe("otb3d");
    expect(toggleBoardView("otb3d")).toBe("2d");
  });
});

describe("squareToWorld", () => {
  it("maps a1 near white (+z, -x)", () => {
    expect(squareToWorld("a1")).toEqual({ x: -3.5, z: 3.5 });
  });

  it("maps h8 opposite corner", () => {
    expect(squareToWorld("h8")).toEqual({ x: 3.5, z: -3.5 });
  });

  it("rejects bad squares", () => {
    expect(squareToWorld("z9")).toBeNull();
    expect(squareToWorld("")).toBeNull();
  });
});
