import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { createHash } from "crypto";
import { join } from "path";

const DATA_DIR = process.env.REVIEW_STATS_DIR ?? join(process.cwd(), "data");
const SAVES_FILE = join(DATA_DIR, "saved-reviews.json");
/** Soft ceiling only for runaway growth — admin keeps full history otherwise. */
const MAX_SAVED = 50_000;
const MAX_BYTES = 700_000;

function loadState() {
  try {
    if (!existsSync(SAVES_FILE)) return { reviews: {} };
    const parsed = JSON.parse(readFileSync(SAVES_FILE, "utf8"));
    return {
      reviews:
        parsed && parsed.reviews && typeof parsed.reviews === "object"
          ? parsed.reviews
          : {},
    };
  } catch {
    return { reviews: {} };
  }
}

function saveState(state) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${SAVES_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, SAVES_FILE);
}

function keyFor(platform, username, pgn) {
  const profile = `${platform}:${String(username).toLowerCase()}`;
  const h = createHash("sha1").update(String(pgn)).digest("hex").slice(0, 16);
  return `${profile}:${h}`;
}

function pruneReviews(reviews) {
  const entries = Object.entries(reviews).sort(
    (a, b) => Number(b[1].savedAt || 0) - Number(a[1].savedAt || 0)
  );
  return Object.fromEntries(entries.slice(0, MAX_SAVED));
}

function validatePayload(payload) {
  if (!payload?.platform || !payload?.username) {
    throw new Error("Missing profile");
  }
  if (!payload?.pgn || !Array.isArray(payload?.moves) || !payload?.summary) {
    throw new Error("Invalid review payload");
  }
}

export function fileSaveReview(payload) {
  validatePayload(payload);
  const raw = JSON.stringify(payload);
  if (raw.length > MAX_BYTES) {
    throw new Error("Review too large to save");
  }
  const state = loadState();
  const id = keyFor(payload.platform, payload.username, payload.pgn);
  state.reviews[id] = {
    id,
    platform: payload.platform,
    username: String(payload.username).toLowerCase(),
    whiteName: payload.whiteName ?? "White",
    blackName: payload.blackName ?? "Black",
    pgn: payload.pgn,
    summary: payload.summary,
    moves: payload.moves,
    run: payload.run ?? null,
    savedAt: Date.now(),
  };
  state.reviews = pruneReviews(state.reviews);
  saveState(state);
  return { id, savedAt: state.reviews[id].savedAt };
}

export function fileListSavedReviews(platform, username) {
  const state = loadState();
  const u = String(username).toLowerCase();
  return Object.values(state.reviews)
    .filter((r) => r.platform === platform && r.username === u)
    .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))
    .map((r) => ({
      id: r.id,
      whiteName: r.whiteName,
      blackName: r.blackName,
      savedAt: r.savedAt,
      movesCount: Array.isArray(r.moves) ? r.moves.length : 0,
    }));
}

export function fileGetSavedReview(id, platform, username) {
  const row = loadState().reviews[String(id)];
  if (!row) return null;
  if (
    row.platform !== platform ||
    row.username !== String(username).toLowerCase()
  ) {
    return null;
  }
  return row;
}

export function fileDeleteSavedReview(id, platform, username) {
  const state = loadState();
  const row = state.reviews[String(id)];
  if (!row) return { ok: true };
  if (
    row.platform !== platform ||
    row.username !== String(username).toLowerCase()
  ) {
    return { ok: false };
  }
  delete state.reviews[String(id)];
  saveState(state);
  return { ok: true };
}

/** Admin aggregate: total saves and counts per Chess.com / Lichess user. */
export function fileAdminSavedSummary() {
  const state = loadState();
  const byUserMap = new Map();
  let total = 0;
  for (const r of Object.values(state.reviews)) {
    if (!r || typeof r !== "object") continue;
    total += 1;
    const platform = String(r.platform ?? "");
    const username = String(r.username ?? "").toLowerCase();
    if (!platform || !username) continue;
    const key = `${platform}:${username}`;
    const row = byUserMap.get(key) ?? {
      platform,
      username,
      count: 0,
      lastSavedAt: 0,
    };
    row.count += 1;
    row.lastSavedAt = Math.max(row.lastSavedAt, Number(r.savedAt) || 0);
    byUserMap.set(key, row);
  }
  const byUser = [...byUserMap.values()].sort(
    (a, b) => b.count - a.count || b.lastSavedAt - a.lastSavedAt
  );
  return { total, byUser };
}

export function handleEngineSavedReviewsRequest(req, res, url, { readJsonBody }) {
  if (url.pathname === "/saved-reviews" && req.method === "GET") {
    const platform = String(url.searchParams.get("platform") ?? "").trim();
    const username = String(url.searchParams.get("username") ?? "").trim();
    const id = String(url.searchParams.get("id") ?? "").trim();
    if (!platform || !username) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing platform/username" }));
      return true;
    }
    if (id) {
      const row = fileGetSavedReview(id, platform, username);
      if (!row) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not found" }));
        return true;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, review: row }));
      return true;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, items: fileListSavedReviews(platform, username) }));
    return true;
  }

  if (url.pathname === "/saved-reviews" && req.method === "POST") {
    void (async () => {
      try {
        const body = await readJsonBody(req);
        const result = fileSaveReview(body);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (e) {
        res.writeHead(400);
        res.end(
          JSON.stringify({
            error: e instanceof Error ? e.message : "Could not save review",
          })
        );
      }
    })();
    return true;
  }

  if (url.pathname === "/saved-reviews" && req.method === "DELETE") {
    const platform = String(url.searchParams.get("platform") ?? "").trim();
    const username = String(url.searchParams.get("username") ?? "").trim();
    const id = String(url.searchParams.get("id") ?? "").trim();
    if (!platform || !username || !id) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing id/platform/username" }));
      return true;
    }
    const result = fileDeleteSavedReview(id, platform, username);
    if (!result.ok) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: "Access denied" }));
      return true;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  return false;
}
