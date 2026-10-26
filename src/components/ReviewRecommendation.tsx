import { useMemo } from "react";
import type { ReviewSummary, AnalyzedMove, PhaseAccuracyStats } from "../types";
import { getProductsByTags, isAffiliateEnabled, type AffiliateProduct } from "../config/affiliateProducts";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { computePhaseAccuracies } from "../analysis/gamePhases";
import { hapticSoft } from "../utils/chessSounds";

interface ReviewRecommendationProps {
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  className?: string;
}

/**
 * Analyzes review findings to suggest relevant training resources
 */
function analyzeWeaknesses(
  summary: ReviewSummary,
  moves: AnalyzedMove[],
  phases: PhaseAccuracyStats
): { tags: string[]; primaryWeakness: string } {
  const tags: string[] = [];
  let primaryWeakness = "general improvement";

  // Count blunders and mistakes
  const totalBlunders = summary.white.blunder + summary.black.blunder;
  const totalMistakes = summary.white.mistake + summary.black.mistake;
  const totalInaccuracies = summary.white.inaccuracy + summary.black.inaccuracy;

  // Analyze phase performance
  const avgOpening = ((phases.opening.white ?? 0) + (phases.opening.black ?? 0)) / 2;
  const avgMiddlegame = ((phases.middlegame.white ?? 0) + (phases.middlegame.black ?? 0)) / 2;
  const avgEndgame = ((phases.endgame.white ?? 0) + (phases.endgame.black ?? 0)) / 2;

  // Find weakest phase
  const phaseScores = [
    { phase: 'opening', score: avgOpening, tags: ['opening', 'fundamentals'] },
    { phase: 'middlegame', score: avgMiddlegame, tags: ['tactics', 'strategy', 'planning'] },
    { phase: 'endgame', score: avgEndgame, tags: ['endgame', 'technique'] },
  ];
  
  const weakestPhase = phaseScores.reduce((min, curr) => 
    curr.score < min.score ? curr : min
  );

  // Opening phase weakness
  if (avgOpening < 70) {
    tags.push('opening', 'fundamentals', 'principles');
    primaryWeakness = "opening preparation";
  }

  // Many tactical errors
  if (totalBlunders >= 3 || totalMistakes >= 4) {
    tags.push('tactics', 'calculation', 'puzzles', 'training');
    if (primaryWeakness === "general improvement") {
      primaryWeakness = "tactical vision";
    }
  }

  // Endgame weaknesses
  if (avgEndgame < 70) {
    tags.push('endgame', 'technique', 'patterns');
    if (primaryWeakness === "general improvement") {
      primaryWeakness = "endgame technique";
    }
  }

  // Middlegame strategic errors
  if (avgMiddlegame < 70 && totalInaccuracies >= 4) {
    tags.push('strategy', 'planning', 'thinking');
  }

  // If overall performance is weak, add general improvement
  if (summary.accuracy.white < 60 || summary.accuracy.black < 60) {
    tags.push('gm', 'lessons', 'training');
  }

  // If no specific weakness found, suggest based on weakest phase
  if (tags.length === 0) {
    tags.push(...weakestPhase.tags);
    primaryWeakness = `${weakestPhase.phase} play`;
  }

  return { tags, primaryWeakness };
}

export function ReviewRecommendation({ summary, moves, className = "" }: ReviewRecommendationProps) {
  const phases = useMemo(() => computePhaseAccuracies(moves), [moves]);
  
  const { products, primaryWeakness } = useMemo(() => {
    if (!isAffiliateEnabled()) {
      return { products: [], primaryWeakness: "" };
    }

    const analysis = analyzeWeaknesses(summary, moves, phases);
    const recommendations = getProductsByTags(analysis.tags, 2);
    
    return {
      products: recommendations,
      primaryWeakness: analysis.primaryWeakness,
    };
  }, [summary, moves, phases]);

  if (!isAffiliateEnabled() || products.length === 0) {
    return null;
  }

  const trackClick = (productId: string) => {
    // Simple analytics tracking - can be extended with actual analytics
    try {
      if (window.localStorage) {
        const clicks = JSON.parse(localStorage.getItem('affiliate_clicks') || '{}');
        clicks[productId] = (clicks[productId] || 0) + 1;
        localStorage.setItem('affiliate_clicks', JSON.stringify(clicks));
      }
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="rounded-xl border border-chess-accent/20 bg-gradient-to-br from-chess-accent/[0.04] to-transparent px-3 py-3">
        <div className="flex items-start gap-2 mb-2">
          <span
            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-chess-accent/20 bg-chess-accent/10 text-chess-accent text-xs"
            aria-hidden
          >
            ✨
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-chess-accent/90">
              Improve your {primaryWeakness}
            </p>
            <p className="mt-0.5 text-[11px] text-chess-muted leading-snug">
              Based on this review, these resources might help
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onTrack={trackClick} />
          ))}
        </div>
      </div>

      <AffiliateDisclosure inline className="px-1" />
    </div>
  );
}

interface ProductCardProps {
  product: AffiliateProduct;
  onTrack: (id: string) => void;
}

function ProductCard({ product, onTrack }: ProductCardProps) {
  return (
    <a
      href={product.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => {
        hapticSoft();
        onTrack(product.id);
      }}
      className="group block rounded-lg border border-chess-hairline bg-chess-card/60 px-2.5 py-2 transition-all duration-200 ease-soft hover:border-chess-accent/30 hover:bg-chess-accent/[0.04]"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-chess-text truncate">
              {product.title}
            </span>
            <span className="flex-shrink-0 text-chess-muted/60 group-hover:text-chess-accent/70 transition-colors text-[10px]">
              ↗
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-chess-muted leading-snug line-clamp-2">
            {product.description}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[9px] font-medium text-chess-muted/80 uppercase tracking-wider">
              {product.partner}
            </span>
            {product.needsReferralId && (
              <span className="text-[8px] text-chess-muted/60 italic">
                (Placeholder link)
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
