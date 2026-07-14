import { describe, expect, it } from "vitest";
import {
  formatTablebaseSummary,
  isTablebasePosition,
  pieceCountFromFen,
} from "./tablebase";

describe("tablebase helpers", () => {
  it("counts pieces and detects TB range", () => {
    expect(
      pieceCountFromFen(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      )
    ).toBe(32);
    expect(isTablebasePosition("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1")).toBe(true);
    expect(
      isTablebasePosition(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
      )
    ).toBe(false);
  });

  it("formats win/loss summaries", () => {
    expect(
      formatTablebaseSummary({
        category: "win",
        dtz: 12,
        dtm: 8,
      })
    ).toMatch(/DTM 8/);
    expect(
      formatTablebaseSummary({
        category: "draw",
        dtz: 0,
        dtm: null,
      })
    ).toBe("Tablebase draw");
  });
});
