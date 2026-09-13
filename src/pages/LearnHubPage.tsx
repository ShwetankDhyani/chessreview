import { usePageSeo } from "../hooks/usePageSeo";
import {
  MarketingLinkList,
  MarketingPageLayout,
  MarketingSection,
} from "../components/MarketingPageLayout";
import { webPageJsonLd } from "../utils/marketingSeo";

export default function LearnHubPage() {
  usePageSeo({
    title: "Learn Chess Game Review — ChessReview Guides",
    description:
      "Short guides on reading a chess game review: move classifications, accuracy, estimated rating, and how free review tools compare.",
    path: "/learn",
    jsonLd: webPageJsonLd({
      path: "/learn",
      name: "Learn Chess Game Review",
      description:
        "Guides for reading chess game reviews — classifications, accuracy, and free vs Chess.com.",
    }),
  });

  return (
    <MarketingPageLayout
      chromeTitle="Learn"
      eyebrow="Learn"
      title="Learn how to read a game review"
      lead="Short guides for club players — what the labels mean, how accuracy works, and how free reviewers compare to Chess.com."
    >
      <MarketingSection title="Guides">
        <MarketingLinkList
          items={[
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

      <MarketingSection title="Compare">
        <MarketingLinkList
          items={[
            {
              to: "/free-chess-game-review",
              label: "Free unlimited chess game review",
              blurb: "What ChessReview offers with no account wall.",
            },
            {
              to: "/free-vs-chesscom-game-review",
              label: "Free vs Chess.com Game Review",
              blurb: "Limits, membership, and when to use each.",
            },
            {
              to: "/chessreview-vs-chessda",
              label: "ChessReview vs Chessda",
              blurb: "Two free browser reviewers compared.",
            },
          ]}
        />
      </MarketingSection>
    </MarketingPageLayout>
  );
}
