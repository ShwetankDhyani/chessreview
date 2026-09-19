import { usePageSeo } from "../hooks/usePageSeo";
import {
  MarketingLinkList,
  MarketingPageLayout,
  MarketingSection,
} from "../components/MarketingPageLayout";
import { webPageJsonLd } from "../utils/marketingSeo";

export default function LearnHubPage() {
  usePageSeo({
    title: "Learn Chess Game Review & 3D Board — ChessReview Guides",
    description:
      "Guides on reading chess game reviews, realistic 3D over-the-board review, move classifications, and accuracy scores.",
    path: "/learn",
    jsonLd: webPageJsonLd({
      path: "/learn",
      name: "Learn Chess Game Review & 3D Board",
      description:
        "Guides for reading chess game reviews — realistic 3D board, classifications, and accuracy.",
    }),
  });

  return (
    <MarketingPageLayout
      chromeTitle="Learn"
      eyebrow="Learn"
      title="Learn how to read a game review"
      lead="Guides for club players — how to read evaluations, what move classifications mean, and how to use the realistic 3D over-the-board review."
    >
      <MarketingSection title="Guides">
        <MarketingLinkList
          items={[
            {
              to: "/learn/3d-otb-board",
              label: "3D & over-the-board review",
              blurb: "Luxury Staunton pieces, woodcraft, and 3D perspectives explained.",
            },
            {
              to: "/learn/how-to-read-a-game-review",
              label: "How to read a game review",
              blurb: "A simple pass order after you finish a game.",
            },
            {
              to: "/learn/move-classifications",
              label: "Move classifications explained",
              blurb: "Best, brilliant, inaccuracy, mistake, blunder — in plain language.",
            },
            {
              to: "/learn/accuracy-and-rating",
              label: "Accuracy & estimated rating",
              blurb: "What the percentage is trying to say (and what it is not).",
            },
          ]}
        />
      </MarketingSection>

      <MarketingSection title="Tools">
        <MarketingLinkList
          items={[
            {
              to: "/otb",
              label: "3D Over-the-board view",
              blurb: "Experience realistic luxury Staunton wood pieces and 3D review.",
            },
            {
              to: "/h2h",
              label: "H2H — head-to-head form prep",
              blurb: "Scout an opponent’s last 100 games before a rematch.",
            },
          ]}
        />
      </MarketingSection>
    </MarketingPageLayout>
  );
}
