import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPersistentStorageAvailable,
  resetSafeStorageForTests,
  safeGetInt,
  safeGetItem,
  safeGetJson,
  safeRemoveItem,
  safeSetItem,
  safeSetJson,
} from "./safeStorage";

/**
 * The suite runs in Node, so `window` is stubbed per test. That also lets each
 * case model a specific browser condition: working storage, Safari private
 * browsing, a missing API, and quota exhaustion.
 */
function installWindow(localStorage: unknown) {
  vi.stubGlobal("window", localStorage === undefined ? {} : { localStorage });
  resetSafeStorageForTests();
}

function workingStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

/** Safari private browsing exposes the object but throws on every call. */
function throwingStorage() {
  const boom = () => {
    throw new Error("SecurityError: storage is disabled");
  };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

beforeEach(() => resetSafeStorageForTests());

afterEach(() => {
  vi.unstubAllGlobals();
  resetSafeStorageForTests();
});

describe("safeStorage with a working backend", () => {
  beforeEach(() => installWindow(workingStorage()));

  it("round-trips values", () => {
    expect(safeSetItem("k", "v")).toBe(true);
    expect(safeGetItem("k")).toBe("v");
    safeRemoveItem("k");
    expect(safeGetItem("k")).toBeNull();
  });

  it("reports persistence as available", () => {
    expect(isPersistentStorageAvailable()).toBe(true);
  });

  it("round-trips JSON", () => {
    safeSetJson("obj", { a: 1 });
    expect(safeGetJson("obj", null)).toEqual({ a: 1 });
  });

  it("returns the fallback for corrupt JSON and clears the entry", () => {
    safeSetItem("bad", "{not json");
    expect(safeGetJson("bad", { ok: true })).toEqual({ ok: true });
    // The bad value is discarded so it cannot fail again on the next load.
    expect(safeGetItem("bad")).toBeNull();
  });

  it("parses integers with a fallback", () => {
    safeSetItem("n", "42");
    expect(safeGetInt("n", 7)).toBe(42);
    safeSetItem("n", "abc");
    expect(safeGetInt("n", 7)).toBe(7);
    expect(safeGetInt("missing", 3)).toBe(3);
  });

  it("does not throw on unserialisable values", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => safeSetJson("c", circular)).not.toThrow();
    expect(safeSetJson("c", circular)).toBe(false);
  });
});

describe("safeStorage when the backend throws (private browsing)", () => {
  beforeEach(() => installWindow(throwingStorage()));

  it("never throws and reports persistence unavailable", () => {
    expect(() => safeSetItem("k", "v")).not.toThrow();
    expect(() => safeGetItem("k")).not.toThrow();
    expect(() => safeRemoveItem("k")).not.toThrow();
    expect(isPersistentStorageAvailable()).toBe(false);
  });

  it("keeps values for the session via the memory fallback", () => {
    safeSetItem("k", "v");
    expect(safeGetItem("k")).toBe("v");
  });

  it("still supports JSON helpers", () => {
    safeSetJson("obj", { a: 2 });
    expect(safeGetJson("obj", null)).toEqual({ a: 2 });
  });
});

describe("safeStorage when localStorage is absent entirely", () => {
  beforeEach(() => installWindow(undefined));

  it("degrades to memory rather than throwing", () => {
    expect(() => safeSetItem("k", "v")).not.toThrow();
    expect(safeGetItem("k")).toBe("v");
    expect(isPersistentStorageAvailable()).toBe(false);
  });
});

describe("safeStorage on quota exhaustion", () => {
  it("sheds rebuildable caches and retries once", () => {
    const map = new Map<string, string>();
    let full = true;
    installWindow({
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => {
        // The probe must succeed so the backend counts as available.
        if (k === "__cr_storage_probe__") return void map.set(k, v);
        if (full) throw new Error("QuotaExceededError");
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
        // Freeing the bulky caches makes room for the retry.
        if (k === "cr_games") full = false;
      },
    });
    map.set("cr_games", "[huge]");

    expect(safeSetItem("cr_profiles", "[]")).toBe(true);
    expect(map.get("cr_profiles")).toBe("[]");
    expect(map.has("cr_games")).toBe(false);
  });

  it("gives up quietly when the retry also fails", () => {
    installWindow({
      getItem: () => null,
      setItem: (k: string) => {
        if (k === "__cr_storage_probe__") return;
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    });

    expect(safeSetItem("k", "v")).toBe(false);
    // The value is still readable this session via the memory fallback.
    expect(safeGetItem("k")).toBe("v");
  });
});
