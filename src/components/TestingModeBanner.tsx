import { useEffect, useState } from "react";
import { fetchSiteSettings } from "../utils/siteSettings";

const POLL_MS = 60_000;
export const TESTING_MODE_CHANGED = "cr_testing_mode_changed";

function applyBannerHeight(on: boolean) {
  document.documentElement.dataset.testingMode = on ? "1" : "0";
}

/** Site-wide strip when admin enables Testing Mode. */
export function TestingModeBanner() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const settings = await fetchSiteSettings();
        if (!cancelled) setOn(!!settings.testingMode);
      } catch {
        if (!cancelled) setOn(false);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ testingMode?: boolean }>).detail;
      if (typeof detail?.testingMode === "boolean") {
        setOn(detail.testingMode);
      } else {
        void load();
      }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(TESTING_MODE_CHANGED, onChanged);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(TESTING_MODE_CHANGED, onChanged);
      applyBannerHeight(false);
    };
  }, []);

  useEffect(() => {
    applyBannerHeight(on);
  }, [on]);

  if (!on) return null;

  return (
    <div
      className="testing-mode-banner"
      role="status"
      aria-live="polite"
    >
      <div className="page-inline-pad flex items-center justify-center gap-2 py-1.5 text-center">
        <span
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400 animate-pulse"
          aria-hidden
        />
        <p className="text-[11px] font-semibold tracking-wide sm:text-xs">
          <span className="uppercase">Testing Mode</span>
          <span className="mx-1.5 text-amber-200/50">·</span>
          <span className="font-medium text-amber-100/90">
            Features may glitch.
          </span>
        </p>
      </div>
    </div>
  );
}
