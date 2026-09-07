import { describe, expect, it } from "vitest";

/**
 * Copy contracts for the parked-review board plaque.
 *
 * The old "Review ready" + primary "Open review" pattern made people think the
 * big button reviewed the game on the board. Keep these strings stable so the
 * hierarchy stays: current game first, previous review second and named.
 */
describe("parked review conflict copy", () => {
  it("labels a finished parked review as a previous/other game", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync(
        new URL("./BoardAnalyzeOverlay.tsx", import.meta.url),
        "utf8"
      )
    );
    expect(src).toContain("You're on a different game");
    expect(src).toContain("Previous review still open:");
    expect(src).toContain("Analyze this game");
    expect(src).toContain("Open previous review");
    expect(src).not.toContain("Analyze this instead");
    expect(src).not.toMatch(/done \? "Review ready"/);
  });
});
