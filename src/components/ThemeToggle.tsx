import { useEffect, useState } from "react";
import { getTheme, toggleTheme, subscribeTheme, type SiteTheme } from "../utils/theme";
import { hapticTap } from "../utils/chessSounds";

export function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [theme, setLocalTheme] = useState<SiteTheme>(() => getTheme());

  useEffect(() => {
    return subscribeTheme((newTheme) => {
      setLocalTheme(newTheme);
    });
  }, []);

  const handleToggle = () => {
    hapticTap();
    const next = toggleTheme();
    setLocalTheme(next);
  };

  const isGlass = theme === "liquid-glass";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={
        isGlass ? "Switch to Classic theme" : "Switch to Liquid Glass theme"
      }
      title={
        isGlass
          ? "Theme: Liquid Glass — click for Classic"
          : "Theme: Classic — click for Liquid Glass"
      }
      className={`ThemeToggle group relative inline-flex items-center justify-center gap-1.5 rounded-xl transition-all duration-200 ease-soft ${
        isGlass
          ? "border border-white/30 bg-gradient-to-b from-white/25 to-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl hover:from-white/32 hover:to-white/12"
          : "border border-chess-hairline bg-chess-surface/90 text-chess-subtext shadow-elev-1 hover:border-chess-hairline-strong hover:bg-chess-hover hover:text-chess-text"
      } ${
        showLabel
          ? "px-2.5 py-1 text-[12px] font-semibold"
          : "h-8 w-8 sm:h-9 sm:w-9"
      } ${className}`}
    >
      {isGlass ? (
        <svg
          className="h-4 w-4 text-chess-accent transition-transform duration-300 group-hover:scale-110"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 9c1-.9 2.3-1.4 3.7-1.4" stroke="white" strokeWidth="1.6" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 text-chess-muted transition-transform duration-300 group-hover:scale-110 group-hover:text-chess-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 12h16M12 4v16" />
        </svg>
      )}

      {showLabel ? (
        <span className="select-none tracking-tight">
          {isGlass ? "Liquid Glass" : "Classic"}
        </span>
      ) : null}
    </button>
  );
}
