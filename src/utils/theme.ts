import { safeGetItem, safeSetItem } from "./safeStorage";

export type SiteTheme = "default" | "liquid-glass";

const THEME_STORAGE_KEY = "chessreview-theme";
const THEME_CHANGE_EVENT = "chessreview-theme-change";

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
 * Apply theme attribute to document element.
 */
export function applyThemeToDom(theme: SiteTheme): void {
  if (
    typeof document !== "undefined" &&
    document.documentElement &&
    typeof document.documentElement.setAttribute === "function"
  ) {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

/**
 * Initialize theme on page load.
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
