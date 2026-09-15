import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetSafeStorageForTests } from "./safeStorage";
import {
  getTheme,
  setTheme,
  toggleTheme,
  initTheme,
  subscribeTheme,
  type SiteTheme,
} from "./theme";

describe("theme utility", () => {
  let docAttrs: Record<string, string> = {};
  let eventListeners: Record<string, Array<(e: unknown) => void>> = {};
  let themeColorContent = "#312e2b";

  beforeEach(() => {
    resetSafeStorageForTests();
    docAttrs = {};
    eventListeners = {};
    themeColorContent = "#312e2b";

    vi.stubGlobal("document", {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          docAttrs[k] = v;
        },
        getAttribute: (k: string) => docAttrs[k] ?? null,
        removeAttribute: (k: string) => {
          delete docAttrs[k];
        },
      },
      querySelector: (sel: string) => {
        if (sel === 'meta[name="theme-color"]') {
          return {
            setAttribute: (_k: string, v: string) => {
              themeColorContent = v;
            },
            getAttribute: () => themeColorContent,
          };
        }
        return null;
      },
    });

    vi.stubGlobal("window", {
      addEventListener: (evt: string, fn: (e: unknown) => void) => {
        eventListeners[evt] = eventListeners[evt] || [];
        eventListeners[evt].push(fn);
      },
      removeEventListener: (evt: string, fn: (e: unknown) => void) => {
        if (eventListeners[evt]) {
          eventListeners[evt] = eventListeners[evt].filter((cb) => cb !== fn);
        }
      },
      dispatchEvent: (evt: { type: string; detail: unknown }) => {
        const listeners = eventListeners[evt.type] || [];
        listeners.forEach((cb) => cb(evt));
        return true;
      },
      CustomEvent: class CustomEvent {
        type: string;
        detail: unknown;
        constructor(type: string, opts?: { detail: unknown }) {
          this.type = type;
          this.detail = opts?.detail;
        }
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSafeStorageForTests();
  });

  it("defaults to 'default' when nothing in storage", () => {
    expect(getTheme()).toBe("default");
  });

  it("sets and retrieves 'liquid-glass' theme", () => {
    setTheme("liquid-glass");
    expect(getTheme()).toBe("liquid-glass");
    expect(docAttrs["data-theme"]).toBe("liquid-glass");
    expect(themeColorContent).toBe("#121412");
  });

  it("restores classic browser theme-color", () => {
    setTheme("liquid-glass");
    setTheme("default");
    expect(themeColorContent).toBe("#312e2b");
  });

  it("toggleTheme switches between default and liquid-glass", () => {
    expect(getTheme()).toBe("default");
    const next = toggleTheme();
    expect(next).toBe("liquid-glass");
    expect(getTheme()).toBe("liquid-glass");

    const back = toggleTheme();
    expect(back).toBe("default");
    expect(getTheme()).toBe("default");
  });

  it("initTheme applies the stored or default theme to the document", () => {
    setTheme("liquid-glass");
    initTheme();
    expect(docAttrs["data-theme"]).toBe("liquid-glass");
  });

  it("subscribeTheme notifies on theme change", () => {
    const changes: SiteTheme[] = [];
    const unsubscribe = subscribeTheme((t) => {
      changes.push(t);
    });

    setTheme("liquid-glass");
    setTheme("default");

    expect(changes).toEqual(["liquid-glass", "default"]);
    unsubscribe();

    setTheme("liquid-glass");
    expect(changes).toEqual(["liquid-glass", "default"]);
  });
});
