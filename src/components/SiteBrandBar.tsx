import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

function BrandMark() {
  return (
    <>
      <span
        className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-chess-accent/30 to-chess-accent/[0.06] border border-chess-accent/40 text-chess-accent select-none shadow-rim transition-colors duration-200 ease-soft group-hover:border-chess-accent/60"
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-chess-accent" aria-hidden>
          <path d="M5.5 21h13l-.7-3.4H6.2L5.5 21zM6.5 16h11l-.5-2H7L6.5 16zM7.2 12.6h9.6c-.3-1-1-2.4-2-3.4l1.7-1.7-1.4-1.4-1.7 1.7c-1-1-2.4-1.7-3.4-2L11 4l-1.6.4c-1 .3-2.4 1-3.4 2L4.3 4.7 2.9 6.1l1.7 1.7c-1 1-1.7 2.4-2 3.4l4.6 1.4zM12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
        </svg>
      </span>
      <span className="min-w-0 font-extrabold tracking-[-0.03em] leading-none inline-flex items-baseline text-[16px] sm:text-[18px]">
        <span className="text-chess-text">Chess</span>
        <span className="cr-text-gradient ml-0.5">Review</span>
        <span className="ml-0.5 text-chess-muted font-semibold text-[10px] sm:text-[11px] tracking-normal">
          .org
        </span>
      </span>
    </>
  );
}

/**
 * Shared brand bar — product links (H2H / 3D Board) live in the site footer
 * and profile menu, not here, so the header stays clean on every width.
 */
export function SiteBrandBar({
  trailing,
  title,
  brandAsLink = true,
  showThemeToggle = true,
}: {
  trailing?: ReactNode;
  title?: string;
  brandAsLink?: boolean;
  showThemeToggle?: boolean;
}) {
  const brandInner = (
    <span className="group flex items-center gap-2 sm:gap-2.5 min-w-0">
      <BrandMark />
    </span>
  );

  return (
    <header className="site-brand-header relative z-50 flex h-[var(--app-header-h)] flex-shrink-0 items-center gap-2 sm:gap-3 page-inline-pad shadow-elev-1 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-chess-accent/35 after:to-transparent">
      {/*
        Blur/fill live on a sibling layer — NOT on the header itself — so
        position:fixed menus (profile, depth) are not trapped by backdrop-filter
        containing blocks, and are not clipped by overflow-hidden.
      */}
      <div
        className="site-brand-backdrop pointer-events-none absolute inset-0 -z-10 bg-chess-panel/95 backdrop-blur-md"
        aria-hidden
      />
      {brandAsLink ? (
        <Link
          to="/"
          className="min-w-0 flex-shrink rounded-lg transition-opacity duration-200 ease-soft hover:opacity-90"
          aria-label="ChessReview home"
        >
          {brandInner}
        </Link>
      ) : (
        <div className="min-w-0 flex-shrink">{brandInner}</div>
      )}

      <div className="min-w-0 flex-1" />

      {title ? (
        <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-chess-muted/80 md:inline">
          {title}
        </span>
      ) : null}

      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
        {showThemeToggle ? <ThemeToggle /> : null}
        {trailing}
      </div>
    </header>
  );
}
