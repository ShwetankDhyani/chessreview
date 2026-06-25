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
const MAX_SAVED = 400;
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
