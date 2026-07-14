import { useEffect, useState } from "react";
import {
  hapticsEnabled,
  hapticSelection,
  notifySuccess,
  setHapticsEnabled,
  setSoundsEnabled,
  soundsEnabled,
  subscribeSensoryPrefs,
} from "../utils/chessSounds";

function PrefSwitch({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-chess-hover/50"
    >
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold text-chess-text">{label}</span>
        <span className="block text-[10px] text-chess-muted leading-snug">{detail}</span>
      </span>
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

/** Compact Sound / Haptics preferences (profile menu). */
export function FeedbackSettings({ className = "" }: { className?: string }) {
  const [soundOn, setSoundOn] = useState(() => soundsEnabled());
  const [feelOn, setFeelOn] = useState(() => hapticsEnabled());

  useEffect(() => {
    return subscribeSensoryPrefs(() => {
      setSoundOn(soundsEnabled());
      setFeelOn(hapticsEnabled());
    });
  }, []);

  return (
    <div className={`border-t border-chess-border px-3 py-2 ${className}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-0.5">
        Feel & sound
      </div>
      <PrefSwitch
        label="Haptics"
        detail="Tabs, buttons, and chrome — quiet, classy taps"
        checked={feelOn}
        onChange={(next) => {
          setHapticsEnabled(next);
          setFeelOn(next);
          if (next) hapticSelection();
        }}
      />
      <PrefSwitch
        label="Sounds"
        detail="Board moves + rare review cues — soft and low"
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
