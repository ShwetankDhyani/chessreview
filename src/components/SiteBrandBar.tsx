import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

function BrandMark() {
  return (
    <>
      <span
        className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-chess-accent/30 to-chess-accent/[0.05] border border-chess-accent/40 text-chess-accent select-none shadow-rim transition-colors duration-200 ease-soft group-hover:border-chess-accent/60"
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M5.5 21h13l-.7-3.4H6.2L5.5 21zM6.5 16h11l-.5-2H7L6.5 16zM7.2 12.6h9.6c-.3-1-1-2.4-2-3.4l1.7-1.7-1.4-1.4-1.7 1.7c-1-1-2.4-1.7-3.4-2L11 4l-1.6.4c-1 .3-2.4 1-3.4 2L4.3 4.7 2.9 6.1l1.7 1.7c-1 1-1.7 2.4-2 3.4l4.6 1.4zM12 3a1 1 0 0 1 1 1v1h-2V4a1 1 0 0 1 1-1z" />
        </svg>
      </span>
      {/* Full wordmark from sm up; compact "Review" on phones so trailing controls fit. */}
      <span className="min-w-0 font-extrabold tracking-[-0.03em] leading-none">
        <span className="hidden sm:inline-flex items-baseline text-[18px]">
          <span className="text-chess-subtext">Chess</span>
          <span className="text-chess-accent">Review</span>
          <span className="ml-0.5 text-chess-muted font-semibold text-[11px] tracking-normal">
            .org
          </span>
        </span>
        <span className="sm:hidden text-[15px] text-chess-accent">Review</span>
      </span>
    </>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative inline-flex flex-shrink-0 items-center rounded-lg px-1.5 sm:px-2 py-1 text-[12px] font-semibold tracking-wide transition-colors duration-200 ease-soft ${
    isActive
      ? "bg-chess-accent/10 text-chess-accent"
      : "text-chess-muted hover:bg-white/[0.04] hover:text-chess-text"
  }`;

/**
 * Shared brand + product nav.
 * Mobile priority (left → right): brand · H2H · spacer · depth/profile trailing.
 * Learn is sm+ only so it never collides with D14 / avatar.
 */
export function SiteBrandBar({
  trailing,
  title,
  brandAsLink = true,
}: {
  trailing?: ReactNode;
  title?: string;
  brandAsLink?: boolean;
}) {
  const brandInner = (
    <span className="group flex items-center gap-1.5 sm:gap-2.5 min-w-0">
      <BrandMark />
    </span>
  );

  return (
    <header className="relative z-50 flex h-[var(--app-header-h)] flex-shrink-0 items-center gap-1 sm:gap-3 page-inline-pad overflow-hidden bg-chess-panel/95 backdrop-blur-md shadow-elev-1 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-chess-accent/35 after:to-transparent">
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

      <nav
        className="flex flex-shrink-0 items-center gap-0.5"
        aria-label="Product"
      >
        <NavLink to="/h2h" className={navClass}>
          H2H
        </NavLink>
        <NavLink
          to="/learn"
          className={({ isActive }) =>
            `${navClass({ isActive })} hidden sm:inline-flex`
          }
        >
          Learn
        </NavLink>
      </nav>

      <div className="min-w-0 flex-1" />

      {title ? (
        <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-chess-muted/80 md:inline">
          {title}
        </span>
      ) : null}

      {trailing ? (
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          {trailing}
        </div>
      ) : null}
    </header>
  );
}
