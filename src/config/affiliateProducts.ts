/**
 * Central affiliate catalog — single source of truth.
 *
 * Replace every URL marked TODO_REPLACE_AFFILIATE_LINK with your real
 * referral link once the program approves you.
 *
 * Amazon (geo-aware via amazonGeo.ts):
 * - US  amazon.com   `chessreview-20`
 * - IN  amazon.in    `chessreview-21`
 * - EU  .de/.co.uk/.fr/.it/.es (and NL/PL/SE earnings) `chessreview04-21`
 *
 * Amazon product links use `/dp/{ASIN}?tag=…`. Verify each ASIN is listed
 * on DE/UK/FR/IT/ES (equipment ASINs especially often differ by marketplace).
 *
 * Chessable / ChessMood / Chess.com: pending — keep needsReferralId until ready.
 */

import { getAmazonDpUrl } from "../utils/amazonGeo";

/**
 * US-catalog ASINs used for /dp/ links across stores.
 * Confirm availability on amazon.de / .co.uk / .fr / .it / .es before relying
 * on EU commissions for each SKU (especially clocks and sets).
 */
export const AMAZON_PRODUCT_ASINS: Record<string, string> = {
  "book-logical-chess": "0713484640",
  "book-reassess-your-chess": "1890085138",
  "book-silman-endgame": "1890085146",
  "book-bobby-fischer": "0553263153",
  "book-woodpecker": "9056918081",
  "dgt-clock": "B00J48M9TC",
  "tournament-board": "B0009A4E7O",
  "wooden-chess-set": "B01N5UOYC6",
  "book-100-endgames": "9056912445",
  "book-fco": "1906454132",
  "book-fischer-60-games": "190638830X",
  "book-tal-games": "1857442024",
  "book-polgar-5334": "1579125549",
  "book-seven-deadly-sins": "1901983366",
  "magnetic-travel-set": "B06XXGPNML",
  "silicone-tournament-set": "B0BLT76G3S",
};

export type AffiliateCategory =
  | "book"
  | "course"
  | "board"
  | "clock"
  | "software"
  | "training";

export type AffiliateLevel = "beginner" | "intermediate" | "advanced" | "all";

export interface AffiliateProduct {
  id: string;
  title: string;
  /** Author or maker */
  author?: string;
  /** Rating label e.g. 4.9 ★ (3,500+ on Amazon) */
  rating?: string;
  /** One-line benefit-led description */
  description: string;
  /** Optional image URL (reserve space / lazy-load in UI) */
  image?: string;
  merchant: string;
  /**
   * Destination URL, or a function for geo-aware Amazon links.
   * Strings may still contain TODO_REPLACE_AFFILIATE_LINK until you swap them.
   */
  url: string | (() => string);
  /** Server-safe fallback used by /api/go (prefer amazon.com tagged search) */
  fallbackUrl: string;
  category: AffiliateCategory;
  level: AffiliateLevel;
  tags: string[];
  priceHint?: string;
  badge?: string;
  /** True until the owner pastes a real referral URL */
  needsReferralId?: boolean;
  ctaLabel?: string;
  /** Best-for label on the resources page */
  bestFor?: string;
}

/** Per-placement kill switches — flip without touching UI code. */
export const AFFILIATE_PLACEMENTS = {
  resultsContextual: true,
  resultsSidebar: true,
  homeStrip: true,
  footerRow: true,
  resourcesPage: true,
  blogInline: true,
  whileYouWait: true,
  emptyState: true,
  welcomeBanner: true,
  stickySidebar: true,
  aboutFeatured: true,
} as const;

export type AffiliatePlacementName = keyof typeof AFFILIATE_PLACEMENTS;

const AMAZON_US_TAG =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_AMAZON_TAG_US as string | undefined)) ||
  "chessreview-20";

function amazonFallback(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_US_TAG}`;
}

export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  {
    id: "book-logical-chess",
    title: "Logical Chess: Move by Move",
    author: "Irving Chernev",
    rating: "4.7 ★ (3,100+ on Amazon)",
    description: "Every move of 33 master games explained in plain language.",
    image: "/images/products/logical-chess.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-logical-chess"]!),
    fallbackUrl: amazonFallback("logical chess move by move"),
    category: "book",
    level: "beginner",
    tags: ["book", "beginner", "opening", "strategy", "annotated"],
    badge: "Editor's pick",
    ctaLabel: "View on Amazon",
    bestFor: "Club players who want annotated master games",
  },
  {
    id: "book-reassess-your-chess",
    title: "How to Reassess Your Chess",
    author: "Jeremy Silman",
    rating: "4.8 ★ (2,800+ on Amazon)",
    description: "Learn imbalances so you can build real middlegame plans.",
    image: "/images/products/reassess-your-chess.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-reassess-your-chess"]!),
    fallbackUrl: amazonFallback("how to reassess your chess"),
    category: "book",
    level: "intermediate",
    tags: ["book", "strategy", "planning", "imbalances", "intermediate"],
    ctaLabel: "View on Amazon",
    bestFor: "Players stuck around 1200–1800",
  },
  {
    id: "book-silman-endgame",
    title: "Silman's Complete Endgame Course",
    author: "Jeremy Silman",
    rating: "4.9 ★ (3,500+ on Amazon)",
    description: "Endgames ranked by rating so you study what you need next.",
    image: "/images/products/silman-endgame.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-silman-endgame"]!),
    fallbackUrl: amazonFallback("silman complete endgame course"),
    category: "book",
    level: "all",
    tags: ["book", "endgame", "technique", "beginner", "intermediate"],
    ctaLabel: "View on Amazon",
    bestFor: "Anyone leaking points in the ending",
  },
  {
    id: "dgt-clock",
    title: "DGT Digital Chess Clock",
    author: "FIDE Official",
    rating: "4.8 ★ (1,200+ on Amazon)",
    description: "Reliable tournament clock with common time controls built in.",
    image: "/images/products/dgt-clock.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["dgt-clock"]!),
    fallbackUrl: amazonFallback("dgt chess clock"),
    category: "clock",
    level: "all",
    tags: ["clock", "equipment", "time-pressure", "tournament", "otb"],
    ctaLabel: "View on Amazon",
    bestFor: "OTB play and blitz time management practice",
  },
  {
    id: "tournament-board",
    title: "Tournament Chess Set",
    author: "Regulation 20\" Board",
    rating: "4.8 ★ (5,400+ on Amazon)",
    description: "Staunton pieces and vinyl board for serious practice.",
    image: "/images/products/tournament-board.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["tournament-board"]!),
    fallbackUrl: amazonFallback("tournament chess set"),
    category: "board",
    level: "all",
    tags: ["board", "equipment", "pieces", "tournament", "otb"],
    ctaLabel: "View on Amazon",
    bestFor: "Home practice that matches club conditions",
  },
  {
    id: "wooden-chess-set",
    title: "Handcrafted Wooden Chess Set",
    author: "Staunton Weighted",
    rating: "4.7 ★ (1,600+ on Amazon)",
    description: "Weighted Staunton pieces with folding board for tactile analysis.",
    image: "/images/products/wooden-chess-set.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["wooden-chess-set"]!),
    fallbackUrl: amazonFallback("staunton wooden chess set weighted"),
    category: "board",
    level: "all",
    tags: ["board", "equipment", "pieces", "wooden", "otb"],
    ctaLabel: "View on Amazon",
    bestFor: "Players who love the acoustic snap and feel of real wood",
  },
  {
    id: "book-woodpecker",
    title: "The Woodpecker Method",
    author: "Axel Smith & Hans Tikkanen",
    rating: "4.7 ★ (850+ on Amazon)",
    description: "Rapid tactical cycles to hardwire pattern recognition.",
    image: "/images/products/woodpecker-method.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-woodpecker"]!),
    fallbackUrl: amazonFallback("the woodpecker method chess"),
    category: "book",
    level: "intermediate",
    tags: ["tactics", "blunders", "calculation", "puzzles", "book"],
    ctaLabel: "View on Amazon",
    bestFor: "Players looking to eliminate tactical blindspots",
  },
  {
    id: "book-bobby-fischer",
    title: "Bobby Fischer Teaches Chess",
    author: "Bobby Fischer",
    rating: "4.7 ★ (4,200+ on Amazon)",
    description: "Fast-paced programmed guide to mating attacks and combinations.",
    image: "/images/products/bobby-fischer.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-bobby-fischer"]!),
    fallbackUrl: amazonFallback("bobby fischer teaches chess"),
    category: "book",
    level: "beginner",
    tags: ["tactics", "beginner", "checkmate", "fundamentals", "book"],
    ctaLabel: "View on Amazon",
    bestFor: "Beginners building rapid checkmate recognition",
  },
  {
    id: "book-100-endgames",
    title: "100 Endgames You Must Know",
    author: "Jesús de la Villa",
    rating: "4.8 ★ (2,100+ on Amazon)",
    description: "Master the 100 practical endings that decide 95% of club games—no dry theory.",
    image: "/images/products/100-endgames.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-100-endgames"]!),
    fallbackUrl: amazonFallback("100 endgames you must know jesus de la villa"),
    category: "book",
    level: "all",
    tags: ["endgame", "technique", "practical", "intermediate", "book", "conversion"],
    badge: "Bestseller",
    ctaLabel: "View on Amazon",
    bestFor: "Players throwing away +3 advantages in the endgame",
  },
  {
    id: "book-fco",
    title: "Fundamental Chess Openings (FCO)",
    author: "Paul van der Sterren",
    rating: "4.7 ★ (1,400+ on Amazon)",
    description: "The definitive 1-volume opening bible explaining ideas and plans, not memorized trees.",
    image: "/images/products/fco.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-fco"]!),
    fallbackUrl: amazonFallback("fundamental chess openings paul van der sterren"),
    category: "book",
    level: "all",
    tags: ["opening", "repertoire", "strategy", "fundamentals", "book"],
    badge: "Opening Bible",
    ctaLabel: "View on Amazon",
    bestFor: "Players tired of getting surprised on move 4",
  },
  {
    id: "book-fischer-60-games",
    title: "My 60 Memorable Games",
    author: "Bobby Fischer",
    rating: "4.8 ★ (3,900+ on Amazon)",
    description: "Fischer's brutally honest annotations of his greatest battles. The greatest game collection ever written.",
    image: "/images/products/fischer-60-games.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-fischer-60-games"]!),
    fallbackUrl: amazonFallback("my 60 memorable games bobby fischer"),
    category: "book",
    level: "intermediate",
    tags: ["annotated", "master-games", "fischer", "calculation", "classic", "book"],
    badge: "All-Time Classic",
    ctaLabel: "View on Amazon",
    bestFor: "Anyone who wants to see how a World Champion actually calculates",
  },
  {
    id: "book-tal-games",
    title: "The Life and Games of Mikhail Tal",
    author: "Mikhail Tal",
    rating: "4.9 ★ (2,600+ on Amazon)",
    description: "The Magician of Riga's witty, romantic masterpiece on fearlessness and speculative piece sacrifices.",
    image: "/images/products/tal-games.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-tal-games"]!),
    fallbackUrl: amazonFallback("the life and games of mikhail tal"),
    category: "book",
    level: "all",
    tags: ["attacking", "sacrifices", "tactics", "master-games", "biography", "book"],
    badge: "Romantic Chess",
    ctaLabel: "View on Amazon",
    bestFor: "Timid players who want to attack without fear",
  },
  {
    id: "book-polgar-5334",
    title: "Chess: 5334 Problems, Combinations & Games",
    author: "László Polgár",
    rating: "4.8 ★ (4,800+ on Amazon)",
    description: "The massive 1,100-page training brick used to raise world-class grandmasters. Pure tactile pattern recognition.",
    image: "/images/products/polgar-5334.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-polgar-5334"]!),
    fallbackUrl: amazonFallback("chess 5334 problems laszlo polgar"),
    category: "book",
    level: "all",
    tags: ["tactics", "puzzles", "mate-in-1", "mate-in-2", "training", "book"],
    badge: "Tactics Monster",
    ctaLabel: "View on Amazon",
    bestFor: "Offline puzzle practice at your desk or coffee table",
  },
  {
    id: "book-seven-deadly-sins",
    title: "The Seven Deadly Chess Sins",
    author: "GM Jonathan Rowson",
    rating: "4.7 ★ (650+ on Amazon)",
    description: "Diagnose psychological tilt, time-trouble paralysis, and why you blunder when completely winning.",
    image: "/images/products/seven-deadly-sins.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["book-seven-deadly-sins"]!),
    fallbackUrl: amazonFallback("the seven deadly chess sins jonathan rowson"),
    category: "book",
    level: "intermediate",
    tags: ["psychology", "blunders", "time-pressure", "mindset", "intermediate", "book"],
    badge: "Psychology",
    ctaLabel: "View on Amazon",
    bestFor: "Players losing games to tilt and panic rather than chess knowledge",
  },
  {
    id: "magnetic-travel-set",
    title: "Magnetic Folding Pocket Chess Set",
    author: "QuadPro Travel Edition",
    rating: "4.6 ★ (6,200+ on Amazon)",
    description: "Pocket-sized magnetic board that locks pieces in place on trains, flights, and cafes.",
    image: "/images/products/magnetic-travel-set.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["magnetic-travel-set"]!),
    fallbackUrl: amazonFallback("quadpro magnetic travel chess set"),
    category: "board",
    level: "all",
    tags: ["board", "magnetic", "travel", "portable", "equipment", "otb"],
    badge: "Travel Essential",
    ctaLabel: "View on Amazon",
    bestFor: "Tactile analysis on the go without losing pieces",
  },
  {
    id: "silicone-tournament-set",
    title: "Triple-Weighted Silicone Tournament Set",
    author: "Heavy Staunton Club Gear",
    rating: "4.8 ★ (1,800+ on Amazon)",
    description: "No creases, no curling corners, and heavy 3x weighted pieces that never topple in blitz scrambles.",
    image: "/images/products/silicone-tournament-set.jpg",
    merchant: "Amazon",
    url: () => getAmazonDpUrl(AMAZON_PRODUCT_ASINS["silicone-tournament-set"]!),
    fallbackUrl: amazonFallback("triple weighted silicone chess set tournament"),
    category: "board",
    level: "all",
    tags: ["board", "equipment", "pieces", "silicone", "tournament", "otb"],
    badge: "Club Favorite",
    ctaLabel: "View on Amazon",
    bestFor: "Fast blitz and outdoor park play where normal vinyl boards get ruined",
  },
  {
    id: "chessable-opening-fundamentals",
    title: "Opening Fundamentals",
    description: "Spaced-repetition drills for sound opening principles.",
    merchant: "Chessable",
    url: "TODO_REPLACE_AFFILIATE_LINK:https://www.chessable.com/opening-fundamentals/course/21302/",
    fallbackUrl: "https://www.chessable.com/opening-fundamentals/course/21302/",
    category: "course",
    level: "beginner",
    tags: ["opening", "fundamentals", "principles", "beginner", "course"],
    needsReferralId: true,
    ctaLabel: "See the course",
    bestFor: "Beginners still winging the first 10 moves",
  },
  {
    id: "chessable-london-system",
    title: "The London System",
    description: "A solid White repertoire you can play without heavy theory.",
    merchant: "Chessable",
    url: "TODO_REPLACE_AFFILIATE_LINK:https://www.chessable.com/the-london-system/course/10276/",
    fallbackUrl: "https://www.chessable.com/the-london-system/course/10276/",
    category: "course",
    level: "intermediate",
    tags: ["opening", "london", "system", "white", "course"],
    needsReferralId: true,
    ctaLabel: "See the course",
    bestFor: "Players who want one reliable White system",
  },
  {
    id: "chessable-woodpecker",
    title: "The Woodpecker Method",
    description: "Cycle tactics until pattern recognition sticks under pressure.",
    merchant: "Chessable",
    url: "TODO_REPLACE_AFFILIATE_LINK:https://www.chessable.com/the-woodpecker-method/course/23916/",
    fallbackUrl: "https://www.chessable.com/the-woodpecker-method/course/23916/",
    category: "training",
    level: "intermediate",
    tags: ["tactics", "blunders", "calculation", "training", "puzzles"],
    needsReferralId: true,
    ctaLabel: "See the course",
    bestFor: "Players who keep missing tactics in games",
  },
  {
    id: "chessable-100-endgames",
    title: "100 Endgames You Must Know",
    description: "The endgame patterns that decide club-level games.",
    merchant: "Chessable",
    url: "TODO_REPLACE_AFFILIATE_LINK:https://www.chessable.com/100-endgames-you-must-know/course/17609/",
    fallbackUrl: "https://www.chessable.com/100-endgames-you-must-know/course/17609/",
    category: "course",
    level: "all",
    tags: ["endgame", "patterns", "technique", "course"],
    needsReferralId: true,
    ctaLabel: "See the course",
    bestFor: "Players who throw away winning endings",
  },
  {
    id: "chessmood-openings",
    title: "ChessMood Opening Academy",
    description: "GM-built repertoires with video explanations that stick.",
    merchant: "ChessMood",
    url: "TODO_REPLACE_AFFILIATE_LINK:https://chessmood.com/",
    fallbackUrl: "https://chessmood.com/",
    category: "course",
    level: "all",
    tags: ["opening", "repertoire", "gm", "course", "video"],
    needsReferralId: true,
    ctaLabel: "See the course",
    bestFor: "Players who learn better from video than books",
  },
  {
    id: "chessmood-strategy",
    title: "ChessMood Strategy Courses",
    description: "Practical planning lessons from grandmasters.",
    merchant: "ChessMood",
    url: "TODO_REPLACE_AFFILIATE_LINK:https://chessmood.com/",
    fallbackUrl: "https://chessmood.com/",
    category: "course",
    level: "intermediate",
    tags: ["strategy", "planning", "gm", "course", "middlegame"],
    needsReferralId: true,
    ctaLabel: "See the course",
    bestFor: "Players who know tactics but lack plans",
  },
  {
    id: "chesscom-membership",
    title: "Chess.com Premium",
    description: "Unlimited puzzles, lessons, and deeper game analysis.",
    merchant: "Chess.com",
    url: "TODO_REPLACE_AFFILIATE_LINK:https://www.chess.com/membership",
    fallbackUrl: "https://www.chess.com/membership",
    category: "software",
    level: "all",
    tags: ["tactics", "puzzles", "training", "lessons", "blunders", "software"],
    needsReferralId: true,
    ctaLabel: "See membership",
    bestFor: "Daily puzzle grinders who want one hub",
  },
];

export function isAffiliateEnabled(): boolean {
  const envValue = import.meta.env.VITE_ENABLE_AFFILIATES;
  if (envValue === "false" || envValue === "0") return false;
  return true;
}

export function isPlacementEnabled(name: AffiliatePlacementName): boolean {
  if (!isAffiliateEnabled()) return false;
  return Boolean(AFFILIATE_PLACEMENTS[name]);
}

/** Products safe to show visitors (live links only outside DEV). */
export function getLiveProducts(): AffiliateProduct[] {
  if (import.meta.env.DEV) return AFFILIATE_PRODUCTS;
  return AFFILIATE_PRODUCTS.filter((p) => !p.needsReferralId);
}

export function getProductById(id: string): AffiliateProduct | undefined {
  return AFFILIATE_PRODUCTS.find((p) => p.id === id);
}

export function resolveProductUrl(product: AffiliateProduct): string {
  const raw = typeof product.url === "function" ? product.url() : product.url;
  if (raw.startsWith("TODO_REPLACE_AFFILIATE_LINK:")) {
    return raw.slice("TODO_REPLACE_AFFILIATE_LINK:".length);
  }
  return raw;
}

export function getEditorsPicks(limit = 3): AffiliateProduct[] {
  const live = getLiveProducts();
  const picked = live.filter((p) => p.badge);
  const pool = picked.length > 0 ? picked : live;
  return pool.slice(0, limit);
}

/**
 * Score products by tag overlap; fall back to editor's picks.
 * Soft rotation via day-of-month so the same pitch is not sticky all week.
 */
export function getProductsByTags(tags: string[], limit = 3): AffiliateProduct[] {
  const live = getLiveProducts();
  if (live.length === 0) return [];

  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const scored = live
    .map((p) => ({
      p,
      score: p.tags.reduce((n, t) => n + (tagSet.has(t.toLowerCase()) ? 1 : 0), 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  let matches = scored.map((x) => x.p);
  if (matches.length === 0) {
    matches = getEditorsPicks(limit * 2);
  }

  const day = new Date().getDate();
  if (matches.length > 1) {
    const rot = day % matches.length;
    matches = [...matches.slice(rot), ...matches.slice(0, rot)];
  }

  return matches.slice(0, limit);
}

export function getProductsByCategory(
  category: AffiliateCategory,
  limit?: number
): AffiliateProduct[] {
  const matches = getLiveProducts().filter((p) => p.category === category);
  return limit ? matches.slice(0, limit) : matches;
}

export const CATEGORY_LABELS: Record<AffiliateCategory, string> = {
  book: "Books",
  course: "Courses",
  board: "Boards & sets",
  clock: "Clocks",
  software: "Software",
  training: "Training",
};
