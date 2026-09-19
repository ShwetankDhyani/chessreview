import { useState, useEffect } from "react";
import { safeGetJson, safeSetJson } from "./safeStorage";
import { chesscomFetch, chesscomPlayerUrl } from "./chesscomClient";
import { retryingFetch } from "./netRetry";

export type PlatformHint = "chesscom" | "lichess" | null;

interface CachedAvatarEntry {
  url: string | null;
  exp: number;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const memCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Validates whether a username could be an actual player account on Chess.com or Lichess.
 * Avoids wasting network requests on generic labels, bot/engine names, or multi-word strings.
 */
export function isFetchableUsername(username?: string | null): boolean {
  if (!username) return false;
  const trimmed = username.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 30) return false;
  if (/\s/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower === "white" ||
    lower === "black" ||
    lower === "anonymous" ||
    lower === "computer" ||
    lower === "unknown" ||
    lower === "opponent" ||
    lower === "engine" ||
    lower === "guest" ||
    lower.startsWith("stockfish") ||
    lower.startsWith("komodo") ||
    lower.startsWith("torch")
  ) {
    return false;
  }
  return true;
}

/**
 * Detects if a PGN string originated from Chess.com or Lichess.
 */
export function detectPlatformFromPgn(pgn?: string | null): PlatformHint {
  if (!pgn) return null;
  const sample = pgn.slice(0, 1000);
  if (/chess\.com/i.test(sample)) return "chesscom";
  if (/lichess\.org/i.test(sample)) return "lichess";
  return null;
}

function makeCacheKey(name: string, platformHint?: PlatformHint): string {
  return `${name.toLowerCase()}:${platformHint ?? "auto"}`;
}

function getStorageKey(cacheKey: string): string {
  return `cr_avatar_${cacheKey.replace(/[^a-z0-9_]/gi, "_")}`;
}

async function fetchFromChesscom(cleanName: string): Promise<string | null> {
  try {
    const url = `https://api.chess.com/pub/player/${encodeURIComponent(cleanName.toLowerCase())}`;
    const res = await retryingFetch(url, {
      headers: { Accept: "application/json" },
      timeoutMs: 6000,
      attempts: 2,
      notFoundStatuses: [404],
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.avatar === "string" && data.avatar.trim()) {
        return data.avatar.trim();
      }
    }
  } catch {
    /* ignore fetch / parse errors */
  }
  return null;
}

async function fetchFromLichess(cleanName: string): Promise<string | null> {
  try {
    const url = `https://lichess.org/api/user/${encodeURIComponent(cleanName.toLowerCase())}`;
    const res = await retryingFetch(url, {
      headers: { Accept: "application/json" },
      timeoutMs: 6000,
      attempts: 2,
      notFoundStatuses: [404],
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.flair === "string" && data.flair.trim()) {
        return `https://lichess1.org/assets/______4/flair/img/${encodeURIComponent(data.flair.trim())}.webp`;
      }
    }
  } catch {
    /* ignore fetch / parse errors */
  }
  return null;
}

/**
 * Fetches the avatar URL for a player from Chess.com or Lichess flair,
 * caching results in memory and local storage.
 */
export async function fetchPlayerAvatar(
  username: string,
  platformHint?: PlatformHint
): Promise<string | null> {
  if (!isFetchableUsername(username)) return null;
  const cleanName = username.trim();
  const cKey = makeCacheKey(cleanName, platformHint);

  // 1. Check in-memory cache
  if (memCache.has(cKey)) {
    const cached = memCache.get(cKey);
    if (cached !== undefined && cached !== null) return cached;
  }

  // 2. Check persistent safeStorage - only accept valid non-null URLs
  const sKey = getStorageKey(cKey);
  const stored = safeGetJson<CachedAvatarEntry | null>(sKey, null);
  if (stored && stored.exp > Date.now() && typeof stored.url === "string" && stored.url) {
    memCache.set(cKey, stored.url);
    return stored.url;
  }

  // 3. Deduplicate in-flight promises
  if (inFlight.has(cKey)) {
    return inFlight.get(cKey)!;
  }

  const promise = (async (): Promise<string | null> => {
    let result: string | null = null;

    if (platformHint === "chesscom") {
      result = await fetchFromChesscom(cleanName);
      if (!result) {
        result = await fetchFromLichess(cleanName);
      }
    } else if (platformHint === "lichess") {
      result = await fetchFromLichess(cleanName);
      if (!result) {
        result = await fetchFromChesscom(cleanName);
      }
    } else {
      // Auto: try Chess.com first, then Lichess
      result = await fetchFromChesscom(cleanName);
      if (!result) {
        result = await fetchFromLichess(cleanName);
      }
    }

    // Save positive hits in memory & persistent cache
    memCache.set(cKey, result);
    if (result) {
      safeSetJson(sKey, {
        url: result,
        exp: Date.now() + CACHE_TTL_MS,
      });
    }

    return result;
  })().finally(() => {
    inFlight.delete(cKey);
  });

  inFlight.set(cKey, promise);
  return promise;
}

/**
 * React hook to get a player's avatar URL with synchronous initial cache lookup.
 */
export function usePlayerAvatar(
  username?: string | null,
  platformHint?: PlatformHint
): { avatarUrl: string | null; loading: boolean } {
  const cleanName = username?.trim() ?? "";
  const isFetchable = isFetchableUsername(cleanName);
  const cKey = isFetchable ? makeCacheKey(cleanName, platformHint) : "";

  // Check synchronous caches
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (!cKey) return null;
    if (memCache.has(cKey)) {
      const cached = memCache.get(cKey);
      if (cached) return cached;
    }
    const stored = safeGetJson<CachedAvatarEntry | null>(getStorageKey(cKey), null);
    if (stored && stored.exp > Date.now() && typeof stored.url === "string" && stored.url) {
      memCache.set(cKey, stored.url);
      return stored.url;
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!isFetchable) return false;
    if (memCache.has(cKey) && memCache.get(cKey)) return false;
    const stored = safeGetJson<CachedAvatarEntry | null>(getStorageKey(cKey), null);
    return !(stored && stored.exp > Date.now() && typeof stored.url === "string" && stored.url);
  });

  useEffect(() => {
    if (!isFetchable) {
      setAvatarUrl(null);
      setLoading(false);
      return;
    }

    let active = true;

    // Check if already in cache
    if (memCache.has(cKey)) {
      setAvatarUrl(memCache.get(cKey) ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchPlayerAvatar(cleanName, platformHint)
      .then((url) => {
        if (active) {
          setAvatarUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setAvatarUrl(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cleanName, platformHint, cKey, isFetchable]);

  return { avatarUrl, loading };
}

/**
 * Testing seam: reset in-memory cache and in-flight requests.
 */
export function resetPlayerAvatarCacheForTests(): void {
  memCache.clear();
  inFlight.clear();
}
