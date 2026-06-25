import { createHash } from "crypto";
import { isSupabaseConfigured } from "./reviewStats.mjs";

function supabaseHeaders(prefer = "return=representation") {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

function supabaseBase() {
  return process.env.SUPABASE_URL.trim().replace(/\/$/, "");
}

function reviewId(platform, username, pgn) {
  const profile = `${platform}:${String(username).toLowerCase()}`;
  const h = createHash("sha1").update(String(pgn)).digest("hex").slice(0, 16);
  return `${profile}:${h}`;
}

function normalizeRow(row) {
  return {
    id: row.id,
    platform: row.platform,
    username: row.username,
    whiteName: row.white_name,
    blackName: row.black_name,
    pgn: row.pgn,
    summary: row.summary,
    moves: row.moves,
    run: row.run,
    savedAt: Number(row.saved_at),
  };
}

export function sbIsConfigured() {
  return isSupabaseConfigured();
}

export async function sbListSavedReviews(platform, username) {
  const u = encodeURIComponent(String(username).toLowerCase());
  const p = encodeURIComponent(platform);
  const res = await fetch(
    `${supabaseBase()}/rest/v1/saved_reviews?platform=eq.${p}&username=eq.${u}&select=id,white_name,black_name,saved_at,move_count&order=saved_at.desc&limit=100`,
    { headers: supabaseHeaders("return=minimal") }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Could not load saved games");
  }
  const rows = await res.json();
  return {
    ok: true,
    items: (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      whiteName: r.white_name,
      blackName: r.black_name,
      savedAt: Number(r.saved_at),
      movesCount: Number(r.move_count) || 0,
    })),
  };
}

export async function sbGetSavedReview(id, platform, username) {
  const res = await fetch(
    `${supabaseBase()}/rest/v1/saved_reviews?id=eq.${encodeURIComponent(id)}&platform=eq.${encodeURIComponent(platform)}&username=eq.${encodeURIComponent(String(username).toLowerCase())}&select=*`,
    { headers: supabaseHeaders("return=minimal") }
  );
  if (!res.ok) {
    throw new Error("Could not load saved game");
  }
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("Not found");
  return { ok: true, review: normalizeRow(row) };
}

export async function sbSaveReview(payload) {
  const id = reviewId(payload.platform, payload.username, payload.pgn);
  const row = {
    id,
    platform: payload.platform,
    username: String(payload.username).toLowerCase(),
    white_name: payload.whiteName ?? "White",
    black_name: payload.blackName ?? "Black",
    pgn: String(payload.pgn).slice(0, 120_000),
    summary: payload.summary,
    moves: payload.moves,
    move_count: Array.isArray(payload.moves) ? payload.moves.length : 0,
    run: payload.run ?? null,
    saved_at: Date.now(),
  };
  const res = await fetch(`${supabaseBase()}/rest/v1/saved_reviews`, {
    method: "POST",
    headers: supabaseHeaders("resolution=merge-duplicates,return=representation"),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Could not save game");
  }
  const saved = await res.json();
  const out = Array.isArray(saved) ? saved[0] : saved;
  return { ok: true, id: out?.id ?? id, savedAt: Number(out?.saved_at ?? row.saved_at) };
}

export async function sbDeleteSavedReview(id, platform, username) {
  const res = await fetch(
    `${supabaseBase()}/rest/v1/saved_reviews?id=eq.${encodeURIComponent(id)}&platform=eq.${encodeURIComponent(platform)}&username=eq.${encodeURIComponent(String(username).toLowerCase())}`,
    {
      method: "DELETE",
      headers: supabaseHeaders("return=minimal"),
    }
  );
  if (!res.ok) {
    throw new Error("Could not delete saved game");
  }
  return { ok: true };
}
