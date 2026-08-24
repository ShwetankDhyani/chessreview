import { describe, expect, it } from "vitest";
import { isStaleChunkError } from "./globalErrorHandlers";

describe("isStaleChunkError", () => {
  it("recognises the browser messages for a missing chunk", () => {
    // A tab left open across a deploy requests hashed chunks that no longer
    // exist; reloading once picks up the new index.html.
    const messages = [
      "Failed to fetch dynamically imported module: https://x/assets/a.js",
      "error loading dynamically imported module",
      "Importing a module script failed.",
      "Unexpected token '<'",
    ];
    for (const message of messages) {
      expect(isStaleChunkError(message)).toBe(true);
    }
  });

  it("does not treat ordinary errors as stale chunks", () => {
    // Auto-reloading on these would loop without fixing anything.
    const messages = [
      "Cannot read properties of undefined (reading 'white')",
      "NetworkError when attempting to fetch resource",
      "Unexpected token 'e' in JSON",
      "",
    ];
    for (const message of messages) {
      expect(isStaleChunkError(message)).toBe(false);
    }
  });
});
