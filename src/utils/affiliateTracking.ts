import { track } from "@vercel/analytics";
import {
  getProductById,
  resolveProductUrl,
  type AffiliatePlacementName,
} from "../config/affiliateProducts";
import { detectUserCountry } from "./amazonGeo";

/** Resolve destination client-side (geo-aware Amazon or partner link). */
export function resolveOutboundUrl(productId: string): string | null {
  const product = getProductById(productId);
  if (!product) return null;
  return resolveProductUrl(product);
}

/**
 * Build the outbound affiliate URL.
 * Prefers direct geo-aware URL with affiliate tags so clicks are instant,
 * status bars show trusted Amazon destinations, and ad blockers cannot intercept.
 * Falls back to /go/:id if direct resolution is not possible.
 */
export function affiliateGoHref(
  productId: string,
  placement: AffiliatePlacementName | string
): string {
  const direct = resolveOutboundUrl(productId);
  if (direct) return direct;

  const store = detectUserCountry();
  const params = new URLSearchParams({
    placement: String(placement),
    store,
  });
  return `/go/${encodeURIComponent(productId)}?${params.toString()}`;
}

/** Fire a light analytics event (Vercel Analytics) + track in localStorage. */
export function trackAffiliateClick(
  productId: string,
  placement: AffiliatePlacementName | string,
  tags: string[] = []
): void {
  try {
    track("affiliate_click", {
      productId,
      placement: String(placement),
      tags: tags.slice(0, 6).join(","),
    });
  } catch {
    /* analytics optional */
  }

  try {
    const key = "cr_affiliate_clicks";
    const raw = localStorage.getItem(key);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[productId] = (map[productId] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
