import { Link } from "react-router-dom";
import { usePageSeo } from "../hooks/usePageSeo";
import {
  MarketingFaq,
  MarketingLinkList,
  MarketingPageLayout,
  MarketingSection,
} from "../components/MarketingPageLayout";
import { faqPageJsonLd, webPageJsonLd } from "../utils/marketingSeo";

const FAQ = [
  {
    question: "Is ChessReview a free unlimited chess game review?",
    answer:
      "Yes. Review as many Chess.com, Lichess, or PGN games as you want. There is no daily cap and no paid tier.",
  },
  {
    question: "Do I need an account?",
    answer:
      "No. Paste a game link or PGN and start immediately. Linking a username is optional and only helps load recent games.",
  },
  {
    question: "What engine does ChessReview use?",
    answer:
      "Stockfish runs in your browser for move evaluations, accuracy, and engine lines — without uploading your PGN to a paywalled coach report.",
  },
];

export default function FreeChessGameReviewPage() {
  usePageSeo({
    title: "Free Unlimited Chess Game Review — ChessReview",
    description:
      "Free unlimited chess game review for Chess.com and Lichess. Move classifications, accuracy, eval graph, and Stockfish lines — no account, no daily limit.",
    path: "/free-chess-game-review",
    jsonLd: [
      webPageJsonLd({
        path: "/free-chess-game-review",
        name: "Free Unlimited Chess Game Review",
        description:
          "Free unlimited chess game review with Stockfish — Chess.com, Lichess, or PGN. No account required.",
      }),
      faqPageJsonLd(FAQ),
    ],
  });

  return (
    <MarketingPageLayout
      chromeTitle="Free review"
      eyebrow="Free chess game review"
      title="Free, unlimited chess game review"
      lead="Import a Chess.com or Lichess game — or paste a PGN — and get move ratings, accuracy, and Stockfish lines with no account and no daily limit."
    >
      <MarketingSection title="What you get">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Readable move classifications from best play to blunders</li>
          <li>Accuracy scores and an evaluation graph you can scrub</li>
          <li>Stockfish engine lines in your browser</li>
          <li>Optional Chess.com / Lichess username to pull recent games</li>
          <li>
            Head-to-head prep when you want form before a rematch — see{" "}
            <Link to="/h2h" className="font-semibold text-chess-accent hover:underline">
              H2H
            </Link>
          </li>
        </ul>
      </MarketingSection>

      <MarketingSection title="How it works">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open ChessReview and paste a game URL or PGN.</li>
          <li>Or connect a Chess.com / Lichess username and pick a recent game.</li>
          <li>Read the review: turning points, accuracy, and engine suggestions.</li>
        </ol>
      </MarketingSection>

      <MarketingSection title="Compare &amp; learn">
        <MarketingLinkList
          items={[
            {
              to: "/free-vs-chesscom-game-review",
              label: "Free vs Chess.com Game Review",
              blurb: "Limits, cost, and what you still get without Diamond.",
            },
            {
              to: "/chessreview-vs-chessda",
              label: "ChessReview vs Chessda",
              blurb: "Two free browser reviewers — how they differ.",
            },
            {
              to: "/learn",
              label: "Learn hub",
              blurb: "How to read a review, classifications, and accuracy.",
            },
          ]}
        />
      </MarketingSection>

      <MarketingFaq items={FAQ} />
    </MarketingPageLayout>
  );
}
