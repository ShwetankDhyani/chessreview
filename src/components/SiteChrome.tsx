import type { ReactNode } from "react";
import { SiteBrandBar } from "./SiteBrandBar";
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
    <div className="relative h-[100dvh] overflow-hidden bg-chess-bg text-chess-text font-sans flex flex-col spa-panel-enter">
      <div className="site-ambient" aria-hidden />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <SiteBrandBar title={title} />
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[calc(var(--mobile-footer-stack)+0.75rem)] lg:pb-6">
          {children}
        </div>
        <SiteFooter />
      </div>
    </div>
  );
}
