import { useMemo, useState, useEffect } from "react";
import { AFFILIATE_PRODUCTS, isAffiliateEnabled, type AffiliateProduct } from "../config/affiliateProducts";
import { hapticSoft } from "../utils/chessSounds";

interface FeaturedResourceProps {
  className?: string;
  context?: 'sidebar' | 'inline' | 'footer';
}

/**
 * Featured resource card - shows a single, carefully selected product
 * Appears in various contexts throughout the site
 * Changes periodically to avoid repetition
 */
export function FeaturedResource({ className = "", context = 'inline' }: FeaturedResourceProps) {
  const [dismissed, setDismissed] = useState(false);

  const product = useMemo(() => {
    if (!isAffiliateEnabled()) return null;

    // Get products that are ready for production
    const liveProducts = AFFILIATE_PRODUCTS.filter(p => 
      !import.meta.env.DEV ? !p.needsReferralId : true
    );

    if (liveProducts.length === 0) return null;

    // Rotate featured product based on day of month (changes daily)
    const dayOfMonth = new Date().getDate();
    const index = dayOfMonth % liveProducts.length;
    return liveProducts[index];
  }, []);

  useEffect(() => {
    // Check if user dismissed this product today
    const dismissKey = `featured_resource_dismissed_${product?.id}`;
    const dismissedDate = localStorage.getItem(dismissKey);
    const today = new Date().toDateString();
    
    if (dismissedDate === today) {
      setDismissed(true);
    }
  }, [product]);

  if (!product || dismissed) return null;

  const trackClick = () => {
    try {
      const clicks = JSON.parse(localStorage.getItem('affiliate_clicks') || '{}');
      clicks[product.id] = (clicks[product.id] || 0) + 1;
      localStorage.setItem('affiliate_clicks', JSON.stringify(clicks));
    } catch {
      // Ignore
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hapticSoft();
    const dismissKey = `featured_resource_dismissed_${product.id}`;
    localStorage.setItem(dismissKey, new Date().toDateString());
    setDismissed(true);
  };

  const productUrl = typeof product.url === 'function' ? product.url() : product.url;

  if (context === 'sidebar') {
    return (
      <aside className={`rounded-xl border border-chess-hairline bg-gradient-to-br from-chess-accent/[0.03] to-transparent p-3 shadow-elev-1 ${className}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-chess-accent/90">
              Recommended
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 text-chess-muted/60 hover:text-chess-text transition-colors text-xs"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        <a
          href={productUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          onClick={() => { hapticSoft(); trackClick(); }}
          className="block group"
        >
          <h3 className="text-xs font-bold text-chess-text mb-1 group-hover:text-chess-accent transition-colors">
            {product.title}
          </h3>
          <p className="text-[10px] text-chess-muted leading-snug mb-2">
            {product.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium text-chess-accent/80 uppercase tracking-wider">
              {product.partner}
            </span>
            <span className="text-[10px] text-chess-muted group-hover:text-chess-accent transition-colors">
              View →
            </span>
          </div>
        </a>

        <p className="text-[8px] text-chess-muted/70 mt-2 leading-snug">
          Affiliate link · Helps keep the site free
        </p>
      </aside>
    );
  }

  // Inline context (for About page, etc.)
  return (
    <div className={`rounded-xl border border-chess-hairline bg-chess-card/40 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg border border-chess-accent/20 bg-chess-accent/10 text-chess-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-chess-accent/90">
              Featured Resource
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 text-chess-muted/60 hover:text-chess-text transition-colors text-sm"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>

          <a
            href={productUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => { hapticSoft(); trackClick(); }}
            className="group block"
          >
            <h3 className="text-sm font-bold text-chess-text mb-1 group-hover:text-chess-accent transition-colors">
              {product.title}
            </h3>
            <p className="text-xs text-chess-muted leading-relaxed mb-2">
              {product.description}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-chess-accent/10 text-chess-accent">
                {product.partner}
              </span>
              <span className="text-[10px] text-chess-muted group-hover:text-chess-accent transition-colors">
                Learn more →
              </span>
            </div>
          </a>

          <p className="text-[9px] text-chess-muted/70 mt-2">
            Affiliate link · Supports free chess analysis
          </p>
        </div>
      </div>
    </div>
  );
}
