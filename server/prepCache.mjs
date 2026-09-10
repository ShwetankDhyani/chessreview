/**
 * 24h cache for prep form JSON — Supabase when configured, else in-memory.
 */

import { createHash } from "crypto";
import { isSupabaseConfigured } from "./reviewStats.mjs";

const TTL_MS = 24 * 60 * 60 * 1000;
/** @type {Map<string, { expiresAt: number, payload: object }>} */
const memory = new Map();

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

export function prepCacheKey(platform, username) {
  const p = String(platform || "").toLowerCase();
  const u = String(username || "").trim().toLowerCase();
  return createHash("sha1").update(`${p}:${u}`).digest("hex");
}

export function prepCacheTtlMs() {
  return TTL_MS;
}

function memoryGet(key) {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.payload;
}

function memorySet(key, payload) {
  memory.set(key, { expiresAt: Date.now() + TTL_MS, payload });
  // Bound memory map in long-lived processes.
  if (memory.size > 200) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
  }
}

async function sbGet(cacheKey) {
  const res = await fetch(
    `${supabaseBase()}/rest/v1/prep_form_cache?cache_key=eq.${encodeURIComponent(
      cacheKey
    )}&select=payload,expires_at&limit=1`,
    { headers: supabaseHeaders("return=minimal") }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;
  const expires = Date.parse(row.expires_at);
  if (!Number.isFinite(expires) || expires <= Date.now()) return null;
  return row.payload;
}

async function sbSet(cacheKey, platform, username, payload) {
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const body = {
    cache_key: cacheKey,
    platform,
    username: String(username).trim().toLowerCase(),
    payload,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  const res = await fetch(
    `${supabaseBase()}/rest/v1/prep_form_cache?on_conflict=cache_key`,
    {
      method: "POST",
      headers: {
        ...supabaseHeaders("resolution=merge-duplicates,return=minimal"),
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    console.warn("[prep-cache] supabase upsert failed:", text.slice(0, 200));
  }
}

/**
 * @param {string} platform
 * @param {string} username
 * @returns {Promise<{ hit: boolean, payload: object | null, source: "supabase"|"memory"|null }>}
 */
export async function getPrepCache(platform, username) {
  const key = prepCacheKey(platform, username);
  if (isSupabaseConfigured()) {
    try {
      const payload = await sbGet(key);
      if (payload) return { hit: true, payload, source: "supabase" };
    } catch (e) {
      console.warn("[prep-cache] supabase get failed:", e);
    }
  }
  const mem = memoryGet(key);
  if (mem) return { hit: true, payload: mem, source: "memory" };
  return { hit: false, payload: null, source: null };
}

/**
 * @param {string} platform
 * @param {string} username
 * @param {object} payload
 */
export async function setPrepCache(platform, username, payload) {
  const key = prepCacheKey(platform, username);
  memorySet(key, payload);
  if (isSupabaseConfigured()) {
    try {
      await sbSet(key, platform, username, payload);
    } catch (e) {
      console.warn("[prep-cache] supabase set failed:", e);
    }
  }
}

/** Test helper */
export function clearPrepMemoryCache() {
  memory.clear();
}
