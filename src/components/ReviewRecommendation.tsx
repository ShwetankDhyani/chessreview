import type { AnalyzedMove, ReviewSummary } from "../types";
import { ContextualRecommendations } from "./affiliate/ContextualRecommendations";
import { AffiliateCard } from "./affiliate/AffiliateCard";
import {
  getEditorsPicks,
  isPlacementEnabled,
} from "../config/affiliateProducts";
import { tagsFromReview } from "../utils/reviewAffiliateTags";
import { useMemo } from "react";

interface ReviewRecommendationProps {
  summary: ReviewSummary;
  moves: AnalyzedMove[];
  className?: string;
}

/**
 * Post-review "Improve what this game showed" + optional compact sidebar pick.
 */
export function ReviewRecommendation({
  summary,
  moves,
  className = "",
}: ReviewRecommendationProps) {
  const { tags, primaryWeakness } = useMemo(
    () => tagsFromReview(summary, moves),
    [summary, moves]
  );

  const sidebarPick = useMemo(() => {
    if (!isPlacementEnabled("resultsSidebar")) return null;
    const picks = getEditorsPicks(4);
    if (picks.length === 0) return null;
    const day = new Date().getDate();
    return picks[day % picks.length] ?? null;
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      <ContextualRecommendations
        placementFlag="resultsContextual"
        placement="results-contextual"
        tags={tags}
        limit={3}
        title={`Improve ${primaryWeakness}`}
        subtitle="Picked from what this game showed"
        variant="inline"
        showDisclosure
      />

      {sidebarPick ? (
        <div className="hidden lg:block">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-chess-muted mb-1">
            Also worth a look
          </p>
          <AffiliateCard
            product={sidebarPick}
            placement="results-sidebar"
            variant="compact"
            contextTags={tags}
          />
        </div>
      ) : null}
    </div>
  );
}
