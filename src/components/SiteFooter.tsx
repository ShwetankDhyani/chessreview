import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HelpModal } from "./HelpModal";
import { ReviewOdometer } from "./ReviewOdometer";
import { hapticTap } from "../utils/chessSounds";
import {
  ADMIN_KEY_CHANGED,
  loadSessionAdminKey,
} from "../utils/blogApi";

function SettingsGearIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.57.23-1.12.54-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.71 1.62.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.57-.23 1.12-.54 1.62-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
    </svg>
  );
}

export function SiteFooter() {
  const [helpOpen, setHelpOpen] = useState<false | "contact" | "support">(false);
  const [showAdminEntry, setShowAdminEntry] = useState(
    () => !!loadSessionAdminKey()
  );

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen]);

  useEffect(() => {
    const sync = () => setShowAdminEntry(!!loadSessionAdminKey());
    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener(ADMIN_KEY_CHANGED, sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener(ADMIN_KEY_CHANGED, sync);
    };
  }, []);

  return (
    <>
      <footer
        className="flex-shrink-0 z-40 border-t border-chess-border/80 bg-chess-panel/95 backdrop-blur-sm
          fixed left-0 right-0 bottom-0 lg:static
          pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="page-inline-pad relative flex items-center justify-center min-h-[var(--site-footer)]">
          {showAdminEntry && (
            <div className="absolute left-[var(--page-pad-inline)] top-1/2 -translate-y-1/2">
              <Link
                to="/admin"
                onClick={() => hapticTap()}
                title="Control panel"
                aria-label="Open admin control panel"
                className="flex h-7 w-7 items-center justify-center rounded-md text-chess-muted/70 transition-colors hover:bg-chess-hover hover:text-chess-accent"
              >
                <SettingsGearIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                hapticTap();
                setHelpOpen("contact");
              }}
              className="text-[11px] text-chess-muted hover:text-chess-accent transition-colors tracking-wide"
            >
              Contact
            </button>
            <span className="text-chess-border-strong text-[10px]" aria-hidden>
              ·
            </span>
            <Link
              to="/blog"
              className="text-[11px] text-chess-muted hover:text-chess-accent transition-colors tracking-wide"
            >
              Blog
            </Link>
            <span className="text-chess-border-strong text-[10px]" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={() => {
                hapticTap();
                setHelpOpen("support");
              }}
              className="text-[11px] text-chess-muted hover:text-chess-accent transition-colors tracking-wide"
            >
              Free Coffee!
            </button>
          </div>
          <div className="absolute right-[var(--page-pad-inline-end)] top-1/2 -translate-y-1/2">
            <ReviewOdometer />
          </div>
        </div>
      </footer>

      <HelpModal
        open={!!helpOpen}
        onClose={() => setHelpOpen(false)}
        initial={helpOpen === "support" ? "support" : "contact"}
      />
    </>
  );
}
