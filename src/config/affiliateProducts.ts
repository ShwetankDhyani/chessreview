/**
 * Central affiliate product configuration
 * 
 * All affiliate products are defined here so referral links can be easily
 * updated by the site owner.
 * 
 * CURRENT STATUS:
 * - ✅ Amazon US & India: Active (US: chessreview-20, India: chessreview-21)
 *   Store selection is automatic based on visitor location
 * - ⏳ Chessable: Pending approval (account created, awaiting affiliate access)
 * - ⏳ ChessMood: Application submitted, pending response
 * - ⏳ Chess.com: Not yet applied
 * 
 * AMAZON NOTES:
 * - Default store: amazon.com (US) - best for American/European visitors
 * - India visitors: amazon.in automatically
 * - UK/EU stores (.co.uk, .de, .fr, .es, .it) need separate Associates accounts
 * - Amazon OneLink could be added later for automatic multi-store routing
 * 
 * TO UPDATE REMAINING LINKS:
 * 1. Wait for affiliate program approvals
 * 2. Replace placeholder URLs with your actual affiliate/referral links
 * 3. Remove needsReferralId flags for approved products
 */

import { getAmazonUrl } from '../utils/amazonGeo';

export interface AffiliateProduct {
  id: string;
  title: string;
  description: string;
  url: string | ((store?: string) => string);
  category: 'opening' | 'tactics' | 'endgame' | 'strategy' | 'general' | 'equipment';
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  partner: string;
  tags: string[];
  /** Marks products that still need the owner's referral link */
  needsReferralId?: boolean;
}

export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  // Opening resources
  {
    id: 'chessable-opening-fundamentals',
    title: 'Opening Fundamentals',
    description: 'Master opening principles with spaced repetition training on Chessable',
    url: 'https://www.chessable.com/opening-fundamentals/course/21302/',
    category: 'opening',
    level: 'beginner',
    partner: 'Chessable',
    tags: ['opening', 'fundamentals', 'principles'],
    needsReferralId: true,
  },
  {
    id: 'chessable-london-system',
    title: 'The London System',
    description: 'A solid, reliable opening system for White that\'s easy to learn',
    url: 'https://www.chessable.com/the-london-system/course/10276/',
    category: 'opening',
    level: 'intermediate',
    partner: 'Chessable',
    tags: ['opening', 'london', 'system', 'white'],
    needsReferralId: true,
  },
  {
    id: 'chessmood-openings',
    title: 'ChessMood Opening Academy',
    description: 'Complete opening repertoire courses taught by GMs',
    url: 'https://chessmood.com/',
    category: 'opening',
    level: 'all',
    partner: 'ChessMood',
    tags: ['opening', 'repertoire', 'gm'],
    needsReferralId: true,
  },

  // Tactics training
  {
    id: 'chesscom-membership',
    title: 'Chess.com Premium',
    description: 'Unlimited tactics puzzles, lessons, and game analysis',
    url: 'https://www.chess.com/membership',
    category: 'tactics',
    level: 'all',
    partner: 'Chess.com',
    tags: ['tactics', 'puzzles', 'training', 'lessons'],
    needsReferralId: true,
  },
  {
    id: 'chessable-woodpecker-method',
    title: 'The Woodpecker Method',
    description: 'Proven tactics training system to dramatically improve calculation',
    url: 'https://www.chessable.com/the-woodpecker-method/course/23916/',
    category: 'tactics',
    level: 'intermediate',
    partner: 'Chessable',
    tags: ['tactics', 'calculation', 'training'],
    needsReferralId: true,
  },

  // Endgame resources
  {
    id: 'chessable-100-endgames',
    title: '100 Endgames You Must Know',
    description: 'Essential endgame patterns every player should master',
    url: 'https://www.chessable.com/100-endgames-you-must-know/course/17609/',
    category: 'endgame',
    level: 'all',
    partner: 'Chessable',
    tags: ['endgame', 'patterns', 'must-know'],
    needsReferralId: true,
  },

  // Strategy & general improvement
  {
    id: 'chessmood-strategy',
    title: 'ChessMood Strategy Courses',
    description: 'Learn strategic thinking and planning from grandmasters',
    url: 'https://chessmood.com/',
    category: 'strategy',
    level: 'intermediate',
    partner: 'ChessMood',
    tags: ['strategy', 'planning', 'gm'],
    needsReferralId: true,
  },
  {
    id: 'chessable-thinking-techniques',
    title: 'Chess Thinking Techniques',
    description: 'Improve your thought process and decision-making',
    url: 'https://www.chessable.com/',
    category: 'strategy',
    level: 'intermediate',
    partner: 'Chessable',
    tags: ['strategy', 'thinking', 'technique'],
    needsReferralId: true,
  },

  // Books (Amazon Associates - geo-aware US/India)
  {
    id: 'book-logical-chess',
    title: 'Logical Chess: Move by Move',
    description: 'Classic instructional book explaining every move of 33 master games',
    url: () => getAmazonUrl('logical chess move by move'),
    category: 'general',
    level: 'beginner',
    partner: 'Amazon',
    tags: ['book', 'beginner', 'games', 'annotated'],
  },
  {
    id: 'book-reassess-your-chess',
    title: 'How to Reassess Your Chess',
    description: 'Modern classic on understanding imbalances and creating plans',
    url: () => getAmazonUrl('how to reassess your chess'),
    category: 'strategy',
    level: 'intermediate',
    partner: 'Amazon',
    tags: ['book', 'strategy', 'imbalances', 'planning'],
  },

  // Equipment (Amazon Associates - geo-aware US/India)
  {
    id: 'dgt-clock',
    title: 'DGT Digital Chess Clock',
    description: 'Professional tournament clock with multiple time controls',
    url: () => getAmazonUrl('dgt chess clock'),
    category: 'equipment',
    level: 'all',
    partner: 'Amazon',
    tags: ['equipment', 'clock', 'tournament'],
  },
  {
    id: 'tournament-board',
    title: 'Tournament Chess Set',
    description: 'Standard Staunton pieces and vinyl board for serious practice',
    url: () => getAmazonUrl('tournament chess set'),
    category: 'equipment',
    level: 'all',
    partner: 'Amazon',
    tags: ['equipment', 'board', 'pieces', 'tournament'],
  },
];

/**
 * Gets products matching specific criteria
 * In production, only returns products with real affiliate links
 */
export function getProductsByTags(tags: string[], limit = 3): AffiliateProduct[] {
  let matches = AFFILIATE_PRODUCTS.filter(product =>
    tags.some(tag => product.tags.includes(tag))
  );
  
  // In production, filter out placeholder links
  if (!import.meta.env.DEV) {
    matches = matches.filter(product => !product.needsReferralId);
  }
  
  // Shuffle to avoid always showing the same products
  const shuffled = [...matches].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

/**
 * Gets products by category
 * In production, only returns products with real affiliate links
 */
export function getProductsByCategory(category: AffiliateProduct['category'], limit?: number): AffiliateProduct[] {
  let matches = AFFILIATE_PRODUCTS.filter(product => product.category === category);
  
  // In production, filter out placeholder links
  if (!import.meta.env.DEV) {
    matches = matches.filter(product => !product.needsReferralId);
  }
  
  if (limit) {
    return matches.slice(0, limit);
  }
  return matches;
}

/**
 * Gets products by level
 * In production, only returns products with real affiliate links
 */
export function getProductsByLevel(level: AffiliateProduct['level'], limit?: number): AffiliateProduct[] {
  let matches = AFFILIATE_PRODUCTS.filter(
    product => product.level === level || product.level === 'all'
  );
  
  // In production, filter out placeholder links
  if (!import.meta.env.DEV) {
    matches = matches.filter(product => !product.needsReferralId);
  }
  
  if (limit) {
    return matches.slice(0, limit);
  }
  return matches;
}

/**
 * Check if affiliate features are enabled
 * Can be controlled via environment variable
 */
export function isAffiliateEnabled(): boolean {
  const envValue = import.meta.env.VITE_ENABLE_AFFILIATES;
  if (envValue === 'false' || envValue === '0') {
    return false;
  }
  return true;
}
