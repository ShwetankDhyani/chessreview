import { Link } from "react-router-dom";
import { usePageSeo } from "../hooks/usePageSeo";
import {
  MarketingFaq,
  MarketingPageLayout,
  MarketingSection,
} from "../components/MarketingPageLayout";
import { faqPageJsonLd, webPageJsonLd } from "../utils/marketingSeo";

const FAQ = [
  {
    question: "Are ChessReview and Chessda the same kind of tool?",
    answer:
      "Both sit in the free browser-based game-review category with Stockfish-style analysis and no account wall. ChessReview also includes head-to-head form prep (H2H) and a club-player coaching voice around the review.",
  },
  {
    question: "Why choose ChessReview?",
    answer:
      "Use ChessReview when you want H2H opponent prep plus readable post-game reviews in one place — free, unlimited, and no account required.",
  },
];

export default function ChessReviewVsChessdaPage() {
  usePageSeo({
    title: "ChessReview vs Chessda — Free Chess Game Review Compared",
    description:
      "Honest comparison of ChessReview and Chessda: free unlimited browser reviews, Stockfish analysis, imports, privacy, and head-to-head prep.",
    path: "/chessreview-vs-chessda",
    jsonLd: [
      webPageJsonLd({
        path: "/chessreview-vs-chessda",
        name: "ChessReview vs Chessda",
        description:
          "Compare two free unlimited chess game review tools — ChessReview and Chessda.",
      }),
      faqPageJsonLd(FAQ),
    ],
  });

  return (
    <MarketingPageLayout
      chromeTitle="vs Chessda"
      eyebrow="Compare"
      title="ChessReview vs Chessda"
      lead="Two free, no-account chess game reviewers. Here is a straight comparison so you can pick what fits your study habit."
    >
      <MarketingSection title="Quick comparison">
        <div className="overflow-x-auto rounded-2xl border border-chess-border/80">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-chess-panel/60 text-chess-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Topic</th>
                <th className="px-3 py-2 font-semibold">ChessReview</th>
                <th className="px-3 py-2 font-semibold">Chessda</th>
              </tr>
            </thead>
            <tbody className="text-chess-subtext">
              {[
                ["Price", "Free", "Free"],
                ["Account", "Optional", "Not required"],
                ["Import", "Chess.com, Lichess, PGN / URL", "Chess.com, Lichess, PGN"],
                ["Review core", "Classifications, accuracy, eval graph, lines", "Classifications, accuracy, eval graph, coach notes"],
                ["Engine story", "Stockfish in the browser", "Stockfish in the browser (they advertise SF18)"],
                ["Unique angle", "H2H form prep + club-player coaching UI", "Username-first SaaS-style shell"],
                ["Privacy pitch", "Review in-browser; share links optional", "Local analysis emphasized"],
              ].map(([topic, left, right]) => (
                <tr key={topic} className="border-t border-chess-border/60">
                  <td className="px-3 py-2 font-medium text-chess-text">{topic}</td>
                  <td className="px-3 py-2">{left}</td>
                  <td className="px-3 py-2">{right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-chess-muted">
          Chessda is an independent product; features can change. This page is
          maintained so players can compare free review options without hype.
        </p>
      </MarketingSection>

      <MarketingSection title="Where ChessReview leans in">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <Link to="/h2h" className="font-semibold text-chess-accent hover:underline">
              H2H
            </Link>{" "}
            — recent-form prep before you face someone again
          </li>
          <li>Review UI aimed at club and amateur players, not only engine dumps</li>
          <li>
            Same{" "}
            <Link to="/free-chess-game-review" className="font-semibold text-chess-accent hover:underline">
              free unlimited review
            </Link>{" "}
            habit without leaving ChessReview
          </li>
        </ul>
      </MarketingSection>

      <MarketingFaq items={FAQ} />
    </MarketingPageLayout>
  );
}
