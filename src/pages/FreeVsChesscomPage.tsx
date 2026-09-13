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
    question: "Does Chess.com limit free Game Review?",
    answer:
      "Chess.com’s automated Game Review is limited on free accounts (commonly described as one review per day), with fuller coaching reports behind paid membership. ChessReview does not meter reviews.",
  },
  {
    question: "Can I review the same Chess.com games here?",
    answer:
      "Yes. Paste a Chess.com game link or connect your public username to load recent games, then run a full review on ChessReview.",
  },
  {
    question: "Is ChessReview affiliated with Chess.com?",
    answer:
      "No. ChessReview is an independent free tool. Your games are reviewed in the browser for feedback — we are not a Chess.com product.",
  },
];

export default function FreeVsChesscomPage() {
  usePageSeo({
    title: "Free vs Chess.com Game Review — ChessReview",
    description:
      "Compare free unlimited ChessReview with Chess.com Game Review: daily limits, accounts, Stockfish analysis, and what club players get without a subscription.",
    path: "/free-vs-chesscom-game-review",
    jsonLd: [
      webPageJsonLd({
        path: "/free-vs-chesscom-game-review",
        name: "Free vs Chess.com Game Review",
        description:
          "How ChessReview’s free unlimited game review compares to Chess.com Game Review limits and memberships.",
      }),
      faqPageJsonLd(FAQ),
    ],
  });

  return (
    <MarketingPageLayout
      chromeTitle="vs Chess.com"
      eyebrow="Compare"
      title="Free vs Chess.com Game Review"
      lead="Chess.com’s Game Review is excellent — and often gated. ChessReview is built for the same post-game habit without a subscription wall."
    >
      <MarketingSection title="Side-by-side">
        <div className="overflow-x-auto rounded-2xl border border-chess-border/80">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-chess-panel/60 text-chess-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Topic</th>
                <th className="px-3 py-2 font-semibold">Chess.com Game Review</th>
                <th className="px-3 py-2 font-semibold">ChessReview</th>
              </tr>
            </thead>
            <tbody className="text-chess-subtext">
              {[
                ["Cost", "Membership for full review habits", "Free"],
                ["Daily limit", "Free tier is capped", "Unlimited"],
                ["Account", "Required on Chess.com", "Not required"],
                ["Import", "Your Chess.com games", "Chess.com, Lichess, or PGN"],
                ["Engine feel", "Polished coach report", "Stockfish lines + classifications"],
                ["Extra", "Platform ecosystem", "H2H form prep on ChessReview"],
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
          Membership details can change on Chess.com; this page reflects the
          common free-vs-paid split players run into when they want more than
          one polished review a day.
        </p>
      </MarketingSection>

      <MarketingSection title="When to use which">
        <p>
          Stay on Chess.com when you want their full product suite, lessons, and
          social graph. Use{" "}
          <Link to="/free-chess-game-review" className="font-semibold text-chess-accent hover:underline">
            ChessReview
          </Link>{" "}
          when you want another free unlimited pass at the same PGN — clear
          classifications, accuracy, and engine lines without waiting on a daily
          gate.
        </p>
      </MarketingSection>

      <MarketingFaq items={FAQ} />
    </MarketingPageLayout>
  );
}
