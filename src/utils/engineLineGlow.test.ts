import { describe, expect, it } from "vitest";
import { shouldShowEngineLineGlow } from "./engineLineGlow";

describe("shouldShowEngineLineGlow", () => {
  it("stays off when only a best-move preview arrow would be set", () => {
    expect(
      shouldShowEngineLineGlow({
        continuationActive: false,
        continuationFen: null,
      })
    ).toBe(false);
  });

  it("turns on once the user steps into the engine line", () => {
    expect(
      shouldShowEngineLineGlow({
        continuationActive: true,
        continuationFen: null,
      })
    ).toBe(true);
    expect(
      shouldShowEngineLineGlow({
        continuationActive: false,
        continuationFen:
          "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      })
    ).toBe(true);
  });
});
