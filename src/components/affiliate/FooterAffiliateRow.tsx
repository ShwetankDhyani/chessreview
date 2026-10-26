import { AffiliateStrip } from "./AffiliateStrip";

/** Slim product row above the site footer on content pages. */
export function FooterAffiliateRow({ className = "" }: { className?: string }) {
  return (
    <div className={`page-inline-pad py-4 border-t border-chess-hairline ${className}`}>
      <AffiliateStrip
        placement="footer"
        placementFlag="footerRow"
        title="Recommended gear"
        limit={3}
      />
    </div>
  );
}
