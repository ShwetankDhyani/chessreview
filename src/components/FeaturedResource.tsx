import { useEffect, useMemo, useState } from "react";
import {
  getEditorsPicks,
  getLiveProducts,
  isPlacementEnabled,
  type AffiliatePlacementName,
} from "../config/affiliateProducts";
import { AffiliateCard } from "./affiliate/AffiliateCard";
import { hapticSoft } from "../utils/chessSounds";

interface FeaturedResourceProps {
  className?: string;
  context?: "sidebar" | "inline";
  placementFlag?: AffiliatePlacementName;
  placement?: string;
}

/**
 * One rotating, dismissible product card for welcome / empty / about.
 */
export function FeaturedResource({
  className = "",
  context = "inline",
  placementFlag = "welcomeBanner",
  placement = "featured-resource",
}: FeaturedResourceProps) {
  const [dismissed, setDismissed] = useState(false);

  const product = useMemo(() => {
    if (!isPlacementEnabled(placementFlag)) return null;
    const live = getLiveProducts();
    if (live.length === 0) return null;
    const picks = getEditorsPicks(live.length);
    const pool = picks.length ? picks : live;
    const day = new Date().getDate();
    return pool[day % pool.length] ?? null;
  }, [placementFlag]);

  useEffect(() => {
    if (!product) return;
    const key = `featured_resource_dismissed_${product.id}`;
    const today = new Date().toDateString();
    if (localStorage.getItem(key) === today) setDismissed(true);
  }, [product]);

  if (!product || dismissed) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hapticSoft();
    localStorage.setItem(
      `featured_resource_dismissed_${product.id}`,
      new Date().toDateString()
    );
    setDismissed(true);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md text-chess-muted/70 hover:text-chess-text hover:bg-white/5 text-sm"
        aria-label="Dismiss recommendation"
      >
        ×
      </button>
      <AffiliateCard
        product={product}
        placement={placement}
        variant={context === "sidebar" ? "compact" : "inline"}
      />
    </div>
  );
}
