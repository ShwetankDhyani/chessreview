import { getProductById, type AffiliateProduct } from "./affiliateProducts";

export interface ChessQuoteRecommendation {
  id: string;
  quote: string;
  author: string;
  authorRole: string;
  callout: string;
  productId: string;
  tags: string[];
  /** Editorial reflection tying the quote to improvement and product value */
  reflection: string;
}

export const CHESS_QUOTES: ChessQuoteRecommendation[] = [
  {
    id: "lasker-candidate-moves",
    quote: "When you see a good move, look for a better one.",
    author: "Emanuel Lasker",
    authorRole: "2nd World Chess Champion (1894–1921)",
    callout: "Think like a grandmaster on every single turn",
    productId: "book-logical-chess",
    tags: ["strategy", "planning", "tactics", "beginner", "intermediate", "book"],
    reflection:
      "Lasker held the world title for 27 consecutive years by questioning every immediate impulse. Irving Chernev's 'Logical Chess' breaks down 33 classic master battles move by move, instilling the master's candidate-move mindset into your own games.",
  },
  {
    id: "fischer-tactics-flow",
    quote: "Tactics flow from a superior position.",
    author: "Bobby Fischer",
    authorRole: "11th World Chess Champion (1972–1975)",
    callout: "Build positions where tactics strike automatically",
    productId: "book-reassess-your-chess",
    tags: ["strategy", "planning", "middlegame", "imbalances", "intermediate", "book"],
    reflection:
      "Fischer's dazzling combinations were never accidents — they were the inevitable payoff of harmonious piece placement. Jeremy Silman's celebrated masterpiece teaches you to read positional imbalances so tactical opportunities create themselves.",
  },
  {
    id: "capablanca-endgames-first",
    quote: "In order to improve your game, you must study the endgame before everything else.",
    author: "José Raúl Capablanca",
    authorRole: "3rd World Chess Champion (1921–1927)",
    callout: "Convert winning positions into clinical victories",
    productId: "book-silman-endgame",
    tags: ["endgame", "technique", "conversion", "all", "book"],
    reflection:
      "The Cuban genius rarely lost because his endgame technique was pure precision. Silman's Complete Endgame Course organizes endings strictly by rating band, ensuring you study only what you need for your exact rating level.",
  },
  {
    id: "bronstein-clock-opponent",
    quote: "The clock is an opponent as dangerous as the player opposite you.",
    author: "David Bronstein",
    authorRole: "Grandmaster & World Championship Finalist",
    callout: "Master your nervous system under time pressure",
    productId: "dgt-clock",
    tags: ["clock", "equipment", "time-pressure", "tournament", "otb", "all"],
    reflection:
      "Time scrambles decide more games than brilliant opening theory. Practicing with the official FIDE tournament digital clock trains you to play with poise when the seconds tick down.",
  },
  {
    id: "pascal-gymnasium-mind",
    quote: "Chess is the gymnasium of the mind.",
    author: "Blaise Pascal",
    authorRole: "Mathematician & Philosopher",
    callout: "Develop true over-the-board spatial vision",
    productId: "tournament-board",
    tags: ["board", "equipment", "pieces", "tournament", "otb", "all"],
    reflection:
      "Flat screen pixels cannot replace the tactile 3D spatial awareness of physical Staunton pieces. Reviewing your games on a tournament vinyl board anchors opening lines and geometric patterns into long-term visual memory.",
  },
  {
    id: "tartakower-blunder-blindspot",
    quote: "A blunder is when you forget that your opponent also has moves.",
    author: "Savielly Tartakower",
    authorRole: "Grandmaster & Renowned Wit",
    callout: "Eliminate game-losing tactical blind spots",
    productId: "book-woodpecker",
    tags: ["tactics", "blunders", "calculation", "puzzles", "intermediate", "book"],
    reflection:
      "Most club games are won not by brilliant combinations, but by the player who blunders second. The Woodpecker Method uses spaced-repetition tactical cycles to hardwire danger recognition so opponent threats jump out instantly.",
  },
  {
    id: "spielmann-three-phases",
    quote: "Play the opening like a book, the middlegame like a magician, the endgame like a machine.",
    author: "Rudolf Spielmann",
    authorRole: "Grandmaster ('The Last Romantic')",
    callout: "Build a rock-solid opening foundation",
    productId: "book-logical-chess",
    tags: ["opening", "fundamentals", "principles", "strategy", "beginner", "book"],
    reflection:
      "Before you can create magic in the middlegame, your pieces must occupy their natural posts. Chernev teaches the timeless opening principles that ensure your king is safe and your pieces are ready for battle.",
  },
  {
    id: "kasparov-wooden-dreams",
    quote: "The chess pieces are not mere wooden blocks; they are ideas, concepts, and dreams.",
    author: "Garry Kasparov",
    authorRole: "13th World Chess Champion (1985–2000)",
    callout: "Experience the acoustic warmth of real wood",
    productId: "wooden-chess-set",
    tags: ["board", "equipment", "wooden", "otb", "all"],
    reflection:
      "From the crisp acoustic clack of a knight landing on a central outpost to the heft of a weighted king, handcrafted wooden pieces elevate post-game analysis into a deeply sensory, focused ritual.",
  },
];

/**
 * Get a matching quote recommendation based on game weakness tags.
 * Falls back to day-of-month rotation among top picks.
 */
export function getQuoteForTags(
  tags: string[],
  seedOffset = 0
): { quote: ChessQuoteRecommendation; product: AffiliateProduct } | null {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));

  // Score quotes by tag overlap
  const scored = CHESS_QUOTES.map((q) => {
    const score = q.tags.reduce(
      (acc, t) => acc + (tagSet.has(t.toLowerCase()) ? 2 : 0),
      0
    );
    return { q, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const candidates = scored.length > 0 ? scored.map((x) => x.q) : CHESS_QUOTES;

  const day = new Date().getDate();
  const idx = Math.abs(day + seedOffset) % candidates.length;
  const quote = candidates[idx] ?? candidates[0];

  const product = getProductById(quote.productId);
  if (!product) return null;

  return { quote, product };
}

/**
 * Get the next quote in rotation for interactive cycling.
 */
export function getQuoteByIndex(
  index: number
): { quote: ChessQuoteRecommendation; product: AffiliateProduct } | null {
  const quote = CHESS_QUOTES[Math.abs(index) % CHESS_QUOTES.length];
  const product = getProductById(quote.productId);
  if (!product) return null;
  return { quote, product };
}
