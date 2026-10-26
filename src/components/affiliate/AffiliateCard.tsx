import type { AffiliateProduct } from "../../config/affiliateProducts";
import { affiliateGoHref, trackAffiliateClick } from "../../utils/affiliateTracking";
import { hapticSoft } from "../../utils/chessSounds";

export type AffiliateCardVariant = "inline" | "compact" | "featured";

interface AffiliateCardProps {
  product: AffiliateProduct;
  placement: string;
  variant?: AffiliateCardVariant;
  className?: string;
  contextTags?: string[];
}

const CTA_FALLBACK: Record<string, string> = {
  Amazon: "View on Amazon",
  Chessable: "See the course",
  ChessMood: "See the course",
  "Chess.com": "See membership",
};

export function AffiliateCard({
  product,
  placement,
  variant = "inline",
  className = "",
  contextTags = [],
}: AffiliateCardProps) {
  const href = affiliateGoHref(product.id, placement);
  const cta =
    product.ctaLabel ||
    CTA_FALLBACK[product.merchant] ||
    "Learn more";
  const isAmazon = product.merchant.toLowerCase().includes("amazon");

  const onClick = () => {
    hapticSoft();
    trackAffiliateClick(product.id, placement, [
      ...contextTags,
      ...product.tags.slice(0, 4),
    ]);
  };

  if (variant === "compact") {
    return (
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={onClick}
        className={`group block rounded-lg border border-chess-hairline bg-chess-card/70 px-2.5 py-2 transition-colors duration-200 ease-soft hover:border-chess-accent/30 hover:bg-chess-accent/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chess-accent/50 ${className}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {product.badge ? (
              <span className="text-[8px] font-semibold uppercase tracking-wider text-chess-accent/90">
                {product.badge}
              </span>
            ) : null}
            <p className="text-xs font-semibold text-chess-text truncate group-hover:text-chess-accent transition-colors">
              {product.title}
            </p>
            <p className="mt-0.5 text-[10px] text-chess-muted leading-snug line-clamp-2">
              {product.description}
            </p>
          </div>
          <span className="flex-shrink-0 text-[10px] text-chess-muted group-hover:text-chess-accent">
            →
          </span>
        </div>
        <p className="mt-1.5 text-[8px] text-chess-muted/70">
          Affiliate · {product.merchant}
          {isAmazon ? " · As an Amazon Associate I earn from qualifying purchases" : ""}
        </p>
      </a>
    );
  }

  if (variant === "featured") {
    return (
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={onClick}
        className={`group block rounded-xl border border-chess-hairline bg-chess-card shadow-elev-1 p-4 transition-colors duration-200 ease-soft hover:border-chess-accent/30 hover:bg-chess-card-hover hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chess-accent/50 ${className}`}
      >
        <div className="flex gap-3">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-chess-hairline bg-chess-surface text-chess-accent"
            aria-hidden
          >
            {product.image ? (
              <img
                src={product.image}
                alt=""
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 rounded-lg object-cover"
              />
            ) : (
              <span className="text-lg font-bold">{product.merchant[0]}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {product.badge ? (
                <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-chess-accent/10 text-chess-accent">
                  {product.badge}
                </span>
              ) : null}
              <span className="text-[9px] font-semibold uppercase tracking-wider text-chess-muted">
                {product.merchant}
              </span>
            </div>
            <h3 className="text-sm font-bold text-chess-text group-hover:text-chess-accent transition-colors">
              {product.title}
            </h3>
            <p className="mt-1 text-xs text-chess-subtext leading-relaxed">
              {product.description}
            </p>
            {product.bestFor ? (
              <p className="mt-1.5 text-[10px] text-chess-muted">
                Best for: {product.bestFor}
              </p>
            ) : null}
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-chess-accent px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-elev-1 transition-opacity group-hover:opacity-90">
              {cta}
              <span aria-hidden>→</span>
            </span>
            {product.priceHint ? (
              <span className="ml-2 text-[10px] text-chess-muted">
                {product.priceHint}
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-[9px] text-chess-muted/70">
          Affiliate link
          {isAmazon
            ? " · As an Amazon Associate I earn from qualifying purchases"
            : ""}
        </p>
      </a>
    );
  }

  // inline (default)
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      onClick={onClick}
      className={`group block rounded-xl border border-chess-accent/20 bg-gradient-to-br from-chess-accent/[0.04] to-transparent px-3 py-2.5 transition-colors duration-200 ease-soft hover:border-chess-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chess-accent/50 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-chess-accent/20 bg-chess-accent/10 text-chess-accent text-xs font-bold"
          aria-hidden
        >
          {product.image ? (
            <img
              src={product.image}
              alt=""
              width={36}
              height={36}
              loading="lazy"
              decoding="async"
              className="h-9 w-9 rounded-lg object-cover"
            />
          ) : (
            product.merchant[0]
          )}
        </div>
        <div className="min-w-0 flex-1">
          {product.badge ? (
            <p className="text-[9px] font-semibold uppercase tracking-wider text-chess-accent/90 mb-0.5">
              {product.badge}
            </p>
          ) : null}
          <p className="text-xs font-semibold text-chess-text group-hover:text-chess-accent transition-colors">
            {product.title}
          </p>
          <p className="mt-0.5 text-[11px] text-chess-muted leading-snug line-clamp-2">
            {product.description}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-chess-accent">
            {cta}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </div>
      <p className="mt-2 text-[8px] text-chess-muted/70 px-0.5">
        Affiliate · {product.merchant}
        {isAmazon ? " · As an Amazon Associate I earn from qualifying purchases" : ""}
      </p>
    </a>
  );
}
