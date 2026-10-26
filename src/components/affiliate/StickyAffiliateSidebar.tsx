import { useMemo } from "react";
import {
  getEditorsPicks,
  isPlacementEnabled,
} from "../../config/affiliateProducts";
import { AffiliateCard } from "./AffiliateCard";

/** Desktop-only sticky card for long content pages. Hidden on mobile. */
export function StickyAffiliateSidebar({
  tags = ["strategy", "book"],
  className = "",
}: {
  tags?: string[];
  className?: string;
}) {
  const product = useMemo(() => {
    if (!isPlacementEnabled("stickySidebar")) return null;
    const picks = getEditorsPicks(5);
    if (picks.length === 0) return null;
    return picks[new Date().getDate() % picks.length] ?? picks[0];
  }, []);

  if (!product) return null;

  return (
    <aside
      className={`hidden xl:block sticky top-20 w-56 flex-shrink-0 ${className}`}
      aria-label="Recommended resource"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-chess-muted mb-1.5">
        Recommended
      </p>
      <AffiliateCard
        product={product}
        placement="sticky-sidebar"
        variant="compact"
        contextTags={tags}
      />
    </aside>
  );
}
