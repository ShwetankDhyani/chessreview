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
  {
    id: "tal-dark-forest",
    quote: "You must take your opponent into a deep dark forest where 2+2=5, and the path out is only wide enough for one.",
    author: "Mikhail Tal",
    authorRole: "8th World Chess Champion ('The Magician of Riga')",
    callout: "Unleash romantic, fearless attacking combinations",
    productId: "book-tal-games",
    tags: ["attacking", "sacrifices", "tactics", "middlegame", "all", "book"],
    reflection:
      "Tal electrified the chess world by refusing to play passively. His witty, unforgettable game collection teaches you how to sacrifice fearlessly, complicate positions, and overwhelm your opponents with relentless initiative.",
  },
  {
    id: "fischer-war-board",
    quote: "Chess is war over the board. The object is to crush the opponent's mind.",
    author: "Bobby Fischer",
    authorRole: "11th World Chess Champion (1972–1975)",
    callout: "Study the most ruthless annotations in chess history",
    productId: "book-fischer-60-games",
    tags: ["annotated", "master-games", "fischer", "calculation", "intermediate", "book"],
    reflection:
      "Universally acclaimed as the greatest game collection ever published, Fischer annotates 60 of his most brutal encounters with total, unvarnished honesty—including three of his rare losses.",
  },
  {
    id: "de-la-villa-endgame-precision",
    quote: "Knowing the exact 100 theoretical endings saves hundreds of hours of aimless study.",
    author: "Jesús de la Villa",
    authorRole: "Grandmaster & Renowned Endgame Author",
    callout: "Lock down the 100 endings that decide real club games",
    productId: "book-100-endgames",
    tags: ["endgame", "technique", "conversion", "intermediate", "all", "book"],
    reflection:
      "Club players don't need obscure 7-piece tablebases—they need the precise, practical techniques that appear repeatedly in blitz and rapid. De la Villa gives you the exact rules to convert advantages cleanly.",
  },
  {
    id: "vandersterren-opening-ideas",
    quote: "Understand the ideas behind your moves, and the variations will take care of themselves.",
    author: "Paul van der Sterren",
    authorRole: "Grandmaster & World Championship Candidate",
    callout: "Master the strategy of every major opening in one volume",
    productId: "book-fco",
    tags: ["opening", "repertoire", "strategy", "fundamentals", "all", "book"],
    reflection:
      "Instead of memorizing long trees of theoretical engine variations you will forget in three days, FCO explains the strategic goals, pawn structures, and piece destinations for every opening played today.",
  },
  {
    id: "rowson-thinking-trap",
    quote: "Thinking is the enemy of playing good chess when it replaces looking at what is right in front of you.",
    author: "Jonathan Rowson",
    authorRole: "3-Time British Champion & Philosopher",
    callout: "Conquer tilt, time panic, and winning-position blunders",
    productId: "book-seven-deadly-sins",
    tags: ["psychology", "blunders", "time-pressure", "mindset", "intermediate", "book"],
    reflection:
      "Most agonizing losses happen not because we lack chess knowledge, but because of cognitive biases—perfectionism, materialism, or rushing when winning. Rowson's modern classic transforms your psychological mindset.",
  },
  {
    id: "polgar-pattern-power",
    quote: "A genius is not born; a genius is educated and trained through relentless pattern recognition.",
    author: "László Polgár",
    authorRole: "Famed Chess Educator & Grandmaster Father",
    callout: "Hardwire mating patterns with 5,334 tactical puzzles",
    productId: "book-polgar-5334",
    tags: ["tactics", "puzzles", "mate-in-1", "mate-in-2", "training", "book", "all"],
    reflection:
      "László Polgár trained three daughters into world champions and grandmasters using this exact legendary manual. 5,334 carefully progressive diagrams that drill tactical instincts straight into muscle memory.",
  },
  {
    id: "goethe-touchstone-pocket",
    quote: "Daring ideas are like chessmen moved forward; they may be beaten, but they may start a winning game.",
    author: "Johann Wolfgang von Goethe",
    authorRole: "Philosopher & Poet",
    callout: "Analyze anywhere with a magnetic pocket board",
    productId: "magnetic-travel-set",
    tags: ["board", "magnetic", "travel", "portable", "equipment", "otb", "all"],
    reflection:
      "Tactile piece movement deepens spatial memory far better than tapping on glass. A magnetic travel set keeps your pieces firmly planted during commutes, park games, and travel.",
  },
  {
    id: "blitz-silicone-warrior",
    quote: "A real blitz board drops flat in two seconds and never flinches under heavy hands.",
    author: "Tournament Club Lore",
    authorRole: "Club Tradition",
    callout: "Heavy 3x weighted Staunton on a no-crease silicone board",
    productId: "silicone-tournament-set",
    tags: ["board", "equipment", "pieces", "silicone", "tournament", "otb", "all"],
    reflection:
      "Forget creased, curling vinyl boards that slide across the table. Heavy triple-weighted Staunton pieces with a flexible silicone mat create the ultimate durable, spill-proof tournament battle station.",
  },
];

/**
 * Get a matching quote recommendation based on game weakness tags.
 * Falls back to day-of-month rotation among top picks.
 */
export function getQuoteForTags(
  tags: string[],
  seedOffset = 0
): { quote: ChessQuoteRecommendation; product: AffiliateProduct; index: number; total: number } | null {
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
  const len = candidates.length;
  const idx = ((((day + seedOffset) % len) + len) % len);
  const quote = candidates[idx] ?? candidates[0];

  const product = getProductById(quote.productId);
  if (!product) return null;

  return { quote, product, index: idx, total: len };
}

/**
 * Get the next quote in rotation for interactive cycling.
 */
export function getQuoteByIndex(
  index: number
): { quote: ChessQuoteRecommendation; product: AffiliateProduct; index: number; total: number } | null {
  const len = CHESS_QUOTES.length;
  const idx = (((index % len) + len) % len);
  const quote = CHESS_QUOTES[idx];
  const product = getProductById(quote.productId);
  if (!product) return null;
  return { quote, product, index: idx, total: len };
}
