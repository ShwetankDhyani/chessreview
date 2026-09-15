import { useEffect, useState } from "react";
import {
  hapticsEnabled,
  hapticSelection,
  hapticTap,
  notifySuccess,
  setHapticsEnabled,
  setSoundsEnabled,
  soundsEnabled,
  subscribeSensoryPrefs,
} from "../utils/chessSounds";
import { getTheme, setTheme, subscribeTheme, type SiteTheme } from "../utils/theme";

function PrefSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-chess-hover/50"
    >
      <span className="text-[12px] font-semibold text-chess-text">{label}</span>
      <span
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
          checked ? "bg-chess-accent" : "bg-chess-border-strong"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/** Compact Appearance / Sound / Haptics preferences (profile menu). */
export function FeedbackSettings({ className = "" }: { className?: string }) {
  const [soundOn, setSoundOn] = useState(() => soundsEnabled());
  const [feelOn, setFeelOn] = useState(() => hapticsEnabled());
  const [theme, setLocalTheme] = useState<SiteTheme>(() => getTheme());

  useEffect(() => {
    const unsubSensory = subscribeSensoryPrefs(() => {
      setSoundOn(soundsEnabled());
      setFeelOn(hapticsEnabled());
    });
    const unsubTheme = subscribeTheme((next) => {
      setLocalTheme(next);
    });

    return () => {
      unsubSensory();
      unsubTheme();
    };
  }, []);

  const handleThemeChange = (next: SiteTheme) => {
    hapticTap();
    setTheme(next);
    setLocalTheme(next);
  };

  return (
    <div className={`border-t border-chess-border px-3 py-2 ${className}`}>
      {/* Theme selector */}
      <div className="mb-2 pb-2 border-b border-chess-hairline">
        <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
          <span className="text-[12px] font-semibold text-chess-text">Theme</span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-chess-muted">
            {theme === "liquid-glass" ? "Liquid Glass" : "Classic"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-chess-bg/80 p-1 border border-chess-hairline">
          <button
            type="button"
            onClick={() => handleThemeChange("default")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 text-[11px] font-semibold transition-all ${
              theme === "default"
                ? "bg-chess-surface text-chess-text shadow-sm border border-chess-border"
                : "text-chess-muted hover:text-chess-text hover:bg-chess-hover/40"
            }`}
          >
            <span>♟️</span>
            <span>Classic</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange("liquid-glass")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 px-2 text-[11px] font-semibold transition-all ${
              theme === "liquid-glass"
                ? "bg-white/[0.18] text-white shadow-sm border border-white/30 backdrop-blur-md"
                : "text-chess-muted hover:text-chess-text hover:bg-chess-hover/40"
            }`}
          >
            <span>🫧</span>
            <span>Liquid Glass</span>
          </button>
        </div>
      </div>

      <PrefSwitch
        label="Haptics"
        checked={feelOn}
        onChange={(next) => {
          setHapticsEnabled(next);
          setFeelOn(next);
          if (next) hapticSelection();
        }}
      />
      <PrefSwitch
        label="Sounds"
        checked={soundOn}
        onChange={(next) => {
          setSoundsEnabled(next);
          setSoundOn(next);
          if (next) notifySuccess();
        }}
      />
    </div>
  );
}
