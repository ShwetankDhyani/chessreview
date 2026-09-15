import { safeGetItem, safeSetItem } from "./safeStorage";

export type SiteTheme = "default" | "liquid-glass";

/** Keep in sync with the blocking bootstrap in index.html. */
export const THEME_STORAGE_KEY = "chessreview-theme";
const THEME_CHANGE_EVENT = "chessreview-theme-change";

export const THEME_BROWSER_COLORS: Record<SiteTheme, string> = {
  default: "#312e2b",
  "liquid-glass": "#121412",
};

/**
 * Get current theme from safe storage or default.
 * Defaults to 'default' (Chess.com warm dark theme).
 */
export function getTheme(): SiteTheme {
  const saved = safeGetItem(THEME_STORAGE_KEY);
  if (saved === "liquid-glass" || saved === "default") {
    return saved;
  }
  return "default";
}

/**
 * Apply theme to document and persist to safe storage.
 */
export function setTheme(theme: SiteTheme): void {
  safeSetItem(THEME_STORAGE_KEY, theme);
  applyThemeToDom(theme);

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent<SiteTheme>(THEME_CHANGE_EVENT, { detail: theme })
    );
  }
}

/**
 * Toggle between 'default' and 'liquid-glass'.
 */
export function toggleTheme(): SiteTheme {
  const current = getTheme();
  const next: SiteTheme = current === "liquid-glass" ? "default" : "liquid-glass";
  setTheme(next);
  return next;
}

/**
 * Apply theme attribute + browser chrome color to the document.
 */
export function applyThemeToDom(theme: SiteTheme): void {
  if (
    typeof document === "undefined" ||
    !document.documentElement ||
    typeof document.documentElement.setAttribute !== "function"
  ) {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);

  try {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", THEME_BROWSER_COLORS[theme]);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Initialize theme on page load (after the index.html bootstrap).
 */
export function initTheme(): SiteTheme {
  const current = getTheme();
  applyThemeToDom(current);
  return current;
}

/**
 * Subscribe to theme changes across the app.
 */
export function subscribeTheme(listener: (theme: SiteTheme) => void): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<SiteTheme>;
    listener(customEvent.detail || getTheme());
  };

  window.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handler);
  };
}
