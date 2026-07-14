import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";

/** Shared shell matching the main app header + footer chrome. */
export function SiteChrome({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="min-h-[100dvh] bg-chess-bg text-chess-text font-sans flex flex-col">
      <header className="relative z-50 flex flex-shrink-0 items-center gap-2 sm:gap-3 page-inline-pad min-h-[var(--app-header-h)] py-2 bg-chess-panel after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-chess-border after:via-chess-accent/30 after:to-chess-border">
        <a href="/" className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-chess-accent/25 to-chess-accent/[0.04] border border-chess-accent/35 text-chess-accent select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5.5 21h13l-.7-3.4H6.2L5.5 21zM6.5 16h11l-.5-2H7L6.5 16zM7.2 12.6h9.6c-.3-1-1-2.4-2-3.4l1.7-1.7-1.4-1.4-1.7 1.7c-1-1-2.4-1.7-3.4-2L11 4l-1.6.4c-1 .3-2.4 1-3.4 2L4.3 4.7 2.9 6.1l1.7 1.7c-1 1-1.7 2.4-2 3.4l4.6 1.4zM12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
            </svg>
          </span>
          <span className="font-bold text-[17px] tracking-tight leading-none inline-flex items-baseline">
            <span className="text-chess-subtext">Chess</span>
            <span className="text-chess-accent">Review</span>
            <span className="ml-0.5 text-chess-muted font-medium text-xs tracking-normal">
              .org
            </span>
          </span>
        </a>
        <div className="flex-1 min-w-0" />
        {title ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-chess-muted hidden sm:inline">
            {title}
          </span>
        ) : null}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--mobile-footer-stack)+0.5rem)] lg:pb-0">
        {children}
      </div>

      <SiteFooter />
    </div>
  );
}
