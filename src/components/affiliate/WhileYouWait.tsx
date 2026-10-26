import { useMemo } from "react";
import {
  getEditorsPicks,
  isPlacementEnabled,
} from "../../config/affiliateProducts";
import { AffiliateCard } from "./AffiliateCard";

/** Single subtle card shown during analysis — never blocks the board. */
export function WhileYouWait({ className = "" }: { className?: string }) {
  const product = useMemo(() => {
    if (!isPlacementEnabled("whileYouWait")) return null;
    const picks = getEditorsPicks(3);
    if (picks.length === 0) return null;
    const day = new Date().getDate();
    return picks[day % picks.length] ?? picks[0];
  }, []);

  if (!product) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-chess-muted">
        While you wait
      </p>
      <AffiliateCard
        product={product}
        placement="while-you-wait"
        variant="compact"
      />
    </div>
  );
}
