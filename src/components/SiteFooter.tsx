import { useState } from "react";
import { DonateModal } from "./DonateModal";
import { PublicStatsModal } from "./PublicStatsModal";

export function SiteFooter() {
  const [statsOpen, setStatsOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  return (
    <>
      <footer
        className="flex-shrink-0 z-40 border-t border-chess-border/80 bg-chess-panel/95 backdrop-blur-sm
          fixed left-0 right-0 bottom-0 lg:static
          pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="page-inline-pad flex items-center justify-center gap-3 min-h-[var(--site-footer)] text-[11px] text-chess-muted">
          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="hover:text-chess-accent transition-colors font-medium tracking-wide"
          >
            Stats
          </button>
          <span className="text-chess-border select-none" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => setDonateOpen(true)}
            className="hover:text-chess-accent transition-colors font-medium tracking-wide"
          >
            Donate
          </button>
        </div>
      </footer>

      <PublicStatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </>
  );
}
