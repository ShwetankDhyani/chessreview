import { useEffect, useState } from "react";
import { HelpModal } from "./HelpModal";
import { ReviewOdometer } from "./ReviewOdometer";

export function SiteFooter() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen]);

  return (
    <>
      <footer
        className="flex-shrink-0 z-40 border-t border-chess-border/80 bg-chess-panel/95 backdrop-blur-sm
          fixed left-0 right-0 bottom-0 lg:static
          pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="page-inline-pad relative flex items-center justify-center min-h-[var(--site-footer)]">
          <div className="flex items-center gap-3">
            <a
              href="https://www.chess.com/play/online/new?isInvited=1&opponent=ShwetankDhyani"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-chess-muted hover:text-chess-accent transition-colors tracking-wide"
            >
              Play Me!
            </a>
            <span className="text-chess-border-strong text-[10px]" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="text-[11px] text-chess-muted hover:text-chess-accent transition-colors tracking-wide"
            >
              Support Us
            </button>
          </div>
          <div className="absolute right-[var(--page-pad-inline-end)] top-1/2 -translate-y-1/2">
            <ReviewOdometer />
          </div>
        </div>
      </footer>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
