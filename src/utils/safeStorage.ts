/**
 * localStorage that cannot throw.
 *
 * The native API throws in several ordinary situations: Safari private
 * browsing, iOS "Block All Cookies", storage disabled by policy, and quota
 * exhaustion. Several call sites here run inside `useState` initialisers and
 * render bodies, so an unguarded throw takes down the whole app before any UI
 * exists. Every accessor below degrades to an in-memory map instead.
 */

/** Fallback used when the real store is unavailable, so a session still works. */
const memoryStore = new Map<string, string>();

let backendChecked = false;
let persistentAvailable = false;

function probe(): boolean {
  if (backendChecked) return persistentAvailable;
  backendChecked = true;
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      persistentAvailable = false;
      return false;
    }
    // Presence is not enough: Safari private mode exposes the object but
    // throws on write, so the probe has to actually write.
    const probeKey = "__cr_storage_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    persistentAvailable = true;
  } catch {
    persistentAvailable = false;
  }
  return persistentAvailable;
}

/** True when writes survive a reload. Callers may use this to soften copy. */
export function isPersistentStorageAvailable(): boolean {
  return probe();
}

export function safeGetItem(key: string): string | null {
  if (probe()) {
    try {
      const stored = window.localStorage.getItem(key);
      // A hit always wins. On a miss, fall through: the value may have failed
      // to persist (quota) yet still be valid for this session.
      if (stored !== null) return stored;
    } catch {
      /* fall through to memory */
    }
  }
  return memoryStore.has(key) ? (memoryStore.get(key) as string) : null;
}

export function safeSetItem(key: string, value: string): boolean {
  memoryStore.set(key, value);
  if (!probe()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // Most often QuotaExceededError. Drop our own bulky, rebuildable caches
    // and retry once before giving up.
    try {
      window.localStorage.removeItem("cr_games");
      window.localStorage.removeItem("cr_games_meta");
      window.localStorage.removeItem("cr_review_cache_v1");
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

export function safeRemoveItem(key: string): void {
  memoryStore.delete(key);
  if (!probe()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing further to do */
  }
}

/** Read and parse JSON, returning `fallback` for missing or corrupt values. */
export function safeGetJson<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    // Corrupt entry — discard it so the failure does not repeat every load.
    safeRemoveItem(key);
    return fallback;
  }
}

export function safeSetJson(key: string, value: unknown): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    // Circular or otherwise unserialisable value.
    return false;
  }
}

/** Parse an integer setting, falling back when absent or malformed. */
export function safeGetInt(key: string, fallback: number): number {
  const raw = safeGetItem(key);
  if (raw == null) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Test seam: forget the cached probe result. */
export function resetSafeStorageForTests(): void {
  backendChecked = false;
  persistentAvailable = false;
  memoryStore.clear();
}
