import { useMemo } from "react";
import {
  getProductsByTags,
  isPlacementEnabled,
  type AffiliatePlacementName,
} from "../../config/affiliateProducts";
import { AffiliateCard, type AffiliateCardVariant } from "./AffiliateCard";
import { AffiliateDisclosure } from "./AffiliateDisclosure";

interface ContextualRecommendationsProps {
  tags: string[];
  limit?: number;
  placement: string;
  title?: string;
  subtitle?: string;
  variant?: AffiliateCardVariant;
  showDisclosure?: boolean;
  className?: string;
  /** Gates rendering via AFFILIATE_PLACEMENTS */
  placementFlag: AffiliatePlacementName;
}

export function ContextualRecommendations({
  tags,
  limit = 2,
  placement,
  title,
  subtitle,
  variant = "inline",
  showDisclosure = true,
  className = "",
  placementFlag,
}: ContextualRecommendationsProps) {
  const products = useMemo(
    () => getProductsByTags(tags, Math.min(limit, 3)),
    [tags, limit]
  );

  if (!isPlacementEnabled(placementFlag)) return null;
  if (products.length === 0) return null;

  return (
    <section
      className={`space-y-2 ${className}`}
      aria-label={title || "Recommended chess tools"}
    >
      {(title || subtitle) && (
        <div>
          {title ? (
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.13em] text-chess-accent/90">
              {title}
            </h3>
          ) : null}
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-chess-muted leading-snug">
              {subtitle}
            </p>
          ) : null}
        </div>
      )}
      <div
        className={
          variant === "featured" ? "grid gap-3 sm:grid-cols-2" : "space-y-1.5"
        }
      >
        {products.map((product) => (
          <AffiliateCard
            key={product.id}
            product={product}
            placement={placement}
            variant={variant}
            contextTags={tags}
          />
        ))}
      </div>
      {showDisclosure ? <AffiliateDisclosure inline /> : null}
    </section>
  );
}
