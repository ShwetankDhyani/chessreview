/**
 * Precomputed Morphy Opera demo review (engine file store).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { join } from "path";

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const DEMO_FILE = join(DATA_DIR, "demo-review.json");
const MAX_BYTES = 480_000;

export function fileGetDemoReview() {
  try {
    if (!existsSync(DEMO_FILE)) return null;
    const parsed = JSON.parse(readFileSync(DEMO_FILE, "utf8"));
    if (!parsed?.pgn || !Array.isArray(parsed.moves) || !parsed.summary) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function fileSaveDemoReview(payload) {
  const row = {
    pgn: String(payload.pgn ?? "").slice(0, 120_000),
    whiteName: payload.whiteName ?? "White",
    blackName: payload.blackName ?? "Black",
    summary: payload.summary,
    moves: payload.moves,
    run: payload.run ?? null,
    depth: typeof payload.depth === "number" ? payload.depth : 16,
    createdAt: new Date().toISOString(),
  };
  const raw = JSON.stringify(row);
  if (raw.length > MAX_BYTES) {
    throw new Error("Demo review too large");
  }
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DEMO_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(row, null, 2), "utf8");
  renameSync(tmp, DEMO_FILE);
  return row;
}

export function handleEngineDemoReviewRequest(req, res, url) {
  if (url.pathname !== "/demo-review" || req.method !== "GET") {
    return false;
  }
  const row = fileGetDemoReview();
  if (!row) {
    res.writeHead(404, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ error: "Demo review not ready" }));
    return true;
  }
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
  });
  res.end(JSON.stringify(row));
  return true;
}
