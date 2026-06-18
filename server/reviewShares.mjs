/**
 * File-based share links for completed reviews (engine server).
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { randomBytes } from "crypto";
import { join } from "path";

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const SHARES_FILE = join(DATA_DIR, "review-shares.json");
const MAX_SHARES = 300;
const MAX_BYTES = 480_000;

function loadState() {
  try {
    if (!existsSync(SHARES_FILE)) return { shares: {} };
    const parsed = JSON.parse(readFileSync(SHARES_FILE, "utf8"));
    return { shares: parsed.shares && typeof parsed.shares === "object" ? parsed.shares : {} };
  } catch {
    return { shares: {} };
  }
}

function saveState(state) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${SHARES_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, SHARES_FILE);
}

function newShareId() {
  return randomBytes(6).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x").slice(0, 10);
}

function pruneShares(shares) {
  const entries = Object.entries(shares).sort(
    (a, b) => String(b[1].createdAt).localeCompare(String(a[1].createdAt))
  );
  const kept = entries.slice(0, MAX_SHARES);
  return Object.fromEntries(kept);
}

export function fileGetShare(id) {
  const key = String(id ?? "").trim();
  if (!key || key.length > 16) return null;
  const s = loadState();
  return s.shares[key] ?? null;
}

export function fileCreateShare(payload) {
  const raw = JSON.stringify(payload);
  if (raw.length > MAX_BYTES) {
    throw new Error("Review too large to share");
  }
  const s = loadState();
  let id = newShareId();
  while (s.shares[id]) id = newShareId();
  const row = {
    ...payload,
    id,
    createdAt: new Date().toISOString(),
  };
  s.shares[id] = row;
  s.shares = pruneShares(s.shares);
  saveState(s);
  return { id, urlPath: `/r/${id}` };
}

export function handleEngineShareRequest(req, res, url, { readJsonBody }) {
  const shareGet = url.pathname.match(/^\/share\/([^/]+)$/);
  if (shareGet && req.method === "GET") {
    const row = fileGetShare(decodeURIComponent(shareGet[1]));
    if (!row) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
      return true;
    }
    res.writeHead(200);
    res.end(JSON.stringify(row));
    return true;
  }

  if (url.pathname === "/share" && req.method === "POST") {
    void (async () => {
      try {
        const body = await readJsonBody(req);
        if (!body?.pgn || !Array.isArray(body.moves) || !body.summary) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Invalid share payload" }));
          return;
        }
        const result = fileCreateShare({
          pgn: String(body.pgn).slice(0, 120_000),
          whiteName: body.whiteName ?? "White",
          blackName: body.blackName ?? "Black",
          summary: body.summary,
          moves: body.moves,
          run: body.run ?? null,
        });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Share failed" }));
      }
    })();
    return true;
  }

  return false;
}
