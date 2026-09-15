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
          ? "Theme: Liquid Glass (Click for Classic)"
          : "Theme: Classic (Click for Apple Liquid Glass)"
      }
      className={`group relative inline-flex items-center justify-center gap-1.5 rounded-xl transition-all duration-200 ease-soft ${
        isGlass
          ? "bg-white/[0.12] text-white border border-white/30 shadow-[0_0_16px_rgba(255,255,255,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl hover:bg-white/[0.18]"
          : "bg-chess-surface/90 text-chess-subtext border border-chess-hairline hover:border-chess-hairline-strong hover:text-chess-text hover:bg-chess-hover shadow-elev-1"
      } ${
        showLabel
          ? "px-2.5 py-1 text-[12px] font-semibold"
          : "h-8 w-8 sm:h-9 sm:w-9"
      } ${className}`}
    >
      {isGlass ? (
        // Glass Sparkle / Liquid Orb Icon
        <svg
          className="h-4 w-4 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-transform duration-300 group-hover:scale-110"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {/* Glass sphere with specular highlight */}
          <circle cx="12" cy="12" r="9" className="stroke-cyan-300" />
          <path
            d="M8.5 8.5C9.5 7.5 11 7 12.5 7"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M14.5 15.5C14 16 13.2 16.5 12 16.5"
            className="stroke-cyan-400/80"
            strokeWidth="1.5"
          />
        </svg>
      ) : (
        // Classic Chessboard / Palette Icon
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
          {/* Glass droplet with spark */}
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          <path d="M12 8a4 4 0 0 0-4 4" strokeWidth="1.5" />
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
