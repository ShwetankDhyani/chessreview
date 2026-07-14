/**
 * Analyze the Morphy Opera demo once and write data/demo-review.json.
 *
 * Prefer running on the Oracle engine host where Stockfish is local:
 *
 *   npx vite-node scripts/precompute-demo-review.ts
 *
 * Or point at a live eval server:
 *
 *   VITE_EVAL_SERVER_URL=http://127.0.0.1:8765 npx vite-node scripts/precompute-demo-review.ts
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { analyzePgn } from "../src/utils/analyzer";
import { DEMO_GAME_PGN } from "../src/demoGame";
import { extractGameMeta } from "../src/utils/gameMeta";

const DEPTH = 16;
const OUT =
  process.env.DEMO_REVIEW_OUT?.trim() ||
  join(process.cwd(), "data", "demo-review.json");

// MultiPV WASM worker is optional; batch native path covers this short game.
if (typeof globalThis.Worker === "undefined") {
  // @ts-expect-error Node has no DOM Worker
  globalThis.Worker = class {
    constructor() {
      throw new Error("Worker unavailable in precompute");
    }
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

const meta = extractGameMeta(DEMO_GAME_PGN);
console.log(`Precomputing demo review at depth ${DEPTH}…`);
console.log(`White: ${meta.white}  Black: ${meta.black}`);

const result = await analyzePgn(
  DEMO_GAME_PGN,
  (done, total) => {
    if (done === total || done % 10 === 0) {
      console.log(`  progress ${done}/${total}`);
    }
  },
  DEPTH
);

if (!result?.moves?.length || !result.summary) {
  throw new Error("Analysis produced an empty review");
}

const payload = {
  pgn: DEMO_GAME_PGN,
  whiteName: meta.white,
  blackName: meta.black,
  summary: result.summary,
  moves: result.moves,
  run: result.run ?? null,
  depth: DEPTH,
  createdAt: new Date().toISOString(),
};

mkdirSync(join(OUT, ".."), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
console.log(
  `Wrote ${OUT} (${result.moves.length} moves, accuracy W ${result.summary.accuracy?.white} / B ${result.summary.accuracy?.black})`
);
