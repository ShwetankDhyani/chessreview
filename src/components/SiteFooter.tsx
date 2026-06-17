import { useEffect, useState } from "react";
import { HelpModal } from "./HelpModal";
import { ReviewStatsTrigger } from "./ReviewStatsTrigger";

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
        className="flex-shrink-0 z-[55] border-t border-chess-border bg-chess-panel/98 backdrop-blur-sm
          fixed left-0 right-0 bottom-0 lg:static
          pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_12px_rgba(0,0,0,0.25)]"
      >
        <div className="page-inline-pad flex items-center justify-center gap-2 sm:gap-4 min-h-[var(--site-footer)] flex-wrap py-1.5">
          <ReviewStatsTrigger variant="footer" />
          <span className="text-chess-border/70" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] sm:text-xs text-chess-muted hover:text-chess-accent transition-colors tracking-wide"
          >
            Help ChessReview.org
          </button>
        </div>
      </footer>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
