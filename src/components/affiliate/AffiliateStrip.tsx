import { Link } from "react-router-dom";
import {
  getEditorsPicks,
  getLiveProducts,
  isPlacementEnabled,
  type AffiliatePlacementName,
} from "../../config/affiliateProducts";
import { AffiliateCard } from "./AffiliateCard";
import { AffiliateDisclosure } from "./AffiliateDisclosure";

interface AffiliateStripProps {
  placement: string;
  placementFlag: AffiliatePlacementName;
  title?: string;
  limit?: number;
  tags?: string[];
  className?: string;
}

/** Horizontal/stack strip for home & footer — max 3 cards. */
export function AffiliateStrip({
  placement,
  placementFlag,
  title = "Recommended chess tools & books",
  limit = 3,
  className = "",
}: AffiliateStripProps) {
  if (!isPlacementEnabled(placementFlag)) return null;

  const products =
    getEditorsPicks(limit).length > 0
      ? getEditorsPicks(Math.min(limit, 3))
      : getLiveProducts().slice(0, Math.min(limit, 3));

  if (products.length === 0) return null;

  return (
    <section
      className={`space-y-2 ${className}`}
      aria-label={title}
    >
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-chess-muted">
          {title}
        </h2>
        <Link
          to="/resources"
          className="text-[11px] font-medium text-chess-accent hover:underline whitespace-nowrap"
        >
          Browse all
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <AffiliateCard
            key={p.id}
            product={p}
            placement={placement}
            variant="compact"
          />
        ))}
      </div>
      <AffiliateDisclosure inline />
    </section>
  );
}
