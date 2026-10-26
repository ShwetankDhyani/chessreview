/**
 * Geo-aware Amazon affiliate URL generation
 * 
 * Detects visitor location and generates appropriate Amazon store URLs
 * with the correct tracking ID.
 * 
 * Default: amazon.com (US) - best for American/European visitors and global fallback
 * India: amazon.in - for Indian visitors only
 * 
 * Future stores (UK, DE, etc.) require separate Associates accounts.
 * Amazon OneLink could be integrated for automatic multi-store routing.
 */

export const AMAZON_TAGS = {
  US: import.meta.env.VITE_AMAZON_TAG_US || 'chessreview-20',
  IN: import.meta.env.VITE_AMAZON_TAG_IN || 'chessreview-21',
} as const;

export type AmazonStore = 'US' | 'IN';

interface AmazonStoreConfig {
  domain: string;
  tag: string;
}

const AMAZON_STORES: Record<AmazonStore, AmazonStoreConfig> = {
  US: { domain: 'amazon.com', tag: AMAZON_TAGS.US },
  IN: { domain: 'amazon.in', tag: AMAZON_TAGS.IN },
};

/**
 * Detect user's likely country based on browser signals
 * Lightweight detection without external API calls or third-party scripts
 */
export function detectUserCountry(): AmazonStore {
  // Check if we've already detected and cached the country
  if (typeof window === 'undefined') {
    return 'US'; // SSR fallback
  }

  try {
    // Check cached value
    const cached = sessionStorage.getItem('amazon_store');
    if (cached === 'US' || cached === 'IN') {
      return cached;
    }

    // Method 1: Check timezone (most reliable for India)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.startsWith('Asia/Kolkata') || 
        timezone.startsWith('Asia/Calcutta') ||
        timezone === 'Asia/Kolkata') {
      sessionStorage.setItem('amazon_store', 'IN');
      return 'IN';
    }

    // Method 2: Check navigator.language
    const lang = navigator.language.toLowerCase();
    if (lang === 'hi' || lang === 'hi-in' || lang.startsWith('hi-')) {
      sessionStorage.setItem('amazon_store', 'IN');
      return 'IN';
    }

    // Default to US for everyone else (Americas, Europe, etc.)
    sessionStorage.setItem('amazon_store', 'US');
    return 'US';
  } catch (e) {
    // Fallback if any detection fails
    return 'US';
  }
}

/**
 * Generate Amazon affiliate URL for a search query or product
 * 
 * @param query - Search terms or product identifier
 * @param store - Amazon store (detected automatically if not provided)
 * @returns Full Amazon URL with affiliate tag
 */
export function getAmazonUrl(query: string, store?: AmazonStore): string {
  const targetStore = store || detectUserCountry();
  const config = AMAZON_STORES[targetStore];
  
  // For search URLs
  if (!query.includes('/dp/')) {
    const searchQuery = encodeURIComponent(query);
    return `https://www.${config.domain}/s?k=${searchQuery}&tag=${config.tag}`;
  }
  
  // For direct product URLs (if ASIN is known)
  return `https://www.${config.domain}${query}?tag=${config.tag}`;
}

/**
 * Get the appropriate Amazon store config for the current visitor
 */
export function getAmazonStore(): AmazonStoreConfig {
  const store = detectUserCountry();
  return AMAZON_STORES[store];
}

/**
 * Generate localized search queries for different Amazon stores
 * Some products may have different titles/availability by region
 */
export function getLocalizedQuery(baseQuery: string, store: AmazonStore): string {
  // For now, use the same query for all stores
  // Could be extended to handle region-specific product names
  return baseQuery;
}
