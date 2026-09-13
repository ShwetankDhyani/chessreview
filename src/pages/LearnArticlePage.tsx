import { Link, Navigate, useParams } from "react-router-dom";
import { usePageSeo } from "../hooks/usePageSeo";
import {
  MarketingPageLayout,
  MarketingSection,
} from "../components/MarketingPageLayout";
import { webPageJsonLd } from "../utils/marketingSeo";

type Article = {
  path: string;
  chromeTitle: string;
  eyebrow: string;
  title: string;
  description: string;
  lead: string;
  sections: Array<{ title: string; body: string[] }>;
};

const ARTICLES: Record<string, Article> = {
  "how-to-read-a-game-review": {
    path: "/learn/how-to-read-a-game-review",
    chromeTitle: "Read a review",
    eyebrow: "Learn",
    title: "How to read a chess game review",
    description:
      "A practical order for reading a free chess game review: critical moments first, then accuracy, then engine lines — for club players.",
    lead: "A good review is a study plan, not a guilt trip. Use this pass order after any Chess.com, Lichess, or PGN game.",
    sections: [
      {
        title: "1. Find the swing moments",
        body: [
          "Start with the evaluation graph or the biggest classification drops. Those are usually where the result was decided — not every quiet developing move.",
          "Ask: which decision flipped the assessment? Was it tactics, a plan, or time pressure?",
        ],
      },
      {
        title: "2. Read the labels in context",
        body: [
          "A “mistake” in a won position hurts less than a blunder in equality. Classifications measure engine loss; your learning goal is the idea you missed.",
          "Open the engine line only after you have your own guess — then compare.",
        ],
      },
      {
        title: "3. Glance at accuracy last",
        body: [
          "Accuracy is a summary, not a moral score. Use it to compare similar time controls over weeks, not to rank your worth after one blitz game.",
        ],
      },
      {
        title: "4. Take one takeaway",
        body: [
          "Leave with a single sentence (“I keep missing … after …”). That beats saving twenty engine arrows you will never reopen.",
          "When you rematch the same opponent, pair this habit with H2H form prep.",
        ],
      },
    ],
  },
  "move-classifications": {
    path: "/learn/move-classifications",
    chromeTitle: "Classifications",
    eyebrow: "Learn",
    title: "Move classifications explained",
    description:
      "Plain-language guide to chess game review labels: best, brilliant, excellent, inaccuracy, mistake, miss, and blunder.",
    lead: "Review tools grade moves by how much winning chance (or engine evaluation) you gave up. Here is the vocabulary without the jargon fog.",
    sections: [
      {
        title: "Best / excellent / good",
        body: [
          "These are moves the engine is happy with — or close enough that the assessment barely moved. Great for confirming your plan was sound.",
        ],
      },
      {
        title: "Brilliant and only-moves",
        body: [
          "Often reserved for hard-to-find shots, sacrifices, or forced saves. Treat them as highlights to replay, not as a requirement every game.",
        ],
      },
      {
        title: "Inaccuracy, mistake, blunder",
        body: [
          "Increasing amounts of value lost versus the engine’s preference. Inaccuracies are soft; mistakes are clear; blunders usually change the expected result.",
          "A “miss” style label (wording varies by tool) often means there was a strong idea available that was not played.",
        ],
      },
      {
        title: "How ChessReview uses them",
        body: [
          "ChessReview shows readable classifications beside the board so you can scrub the game and focus on turning points — then open Stockfish lines when you want the concrete refutation.",
        ],
      },
    ],
  },
  "accuracy-and-rating": {
    path: "/learn/accuracy-and-rating",
    chromeTitle: "Accuracy",
    eyebrow: "Learn",
    title: "Accuracy and estimated rating",
    description:
      "What chess game review accuracy percentages and estimated ratings mean — and how club players should use them.",
    lead: "Accuracy compresses a whole game into one number. Useful as a trend; dangerous as a verdict.",
    sections: [
      {
        title: "What accuracy tries to measure",
        body: [
          "Roughly: how often your moves stayed close to the engine’s preferred choices, weighted so big errors hurt more than tiny slips.",
          "Different sites use different formulas. Compare yourself on the same tool over time.",
        ],
      },
      {
        title: "Estimated rating",
        body: [
          "Some reviewers infer a performance-style rating from move quality. It is a model output, not an official Elo, and it can swing wildly in short time controls.",
        ],
      },
      {
        title: "Healthy use for club players",
        body: [
          "Track similar time controls (e.g. only 10+0) across a week.",
          "Ignore single-game shame spirals after one mouse slip.",
          "Pair the number with two concrete moments you will train — that is the review’s job.",
        ],
      },
    ],
  },
};

export default function LearnArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? ARTICLES[slug] : undefined;

  usePageSeo(
    article
      ? {
          title: `${article.title} — ChessReview`,
          description: article.description,
          path: article.path,
          jsonLd: webPageJsonLd({
            path: article.path,
            name: article.title,
            description: article.description,
          }),
        }
      : {
          title: "Guide not found — ChessReview",
          description: "That learn guide does not exist.",
          path: "/learn",
          noindex: true,
        }
  );

  if (!article) {
    return <Navigate to="/learn" replace />;
  }

  return (
    <MarketingPageLayout
      chromeTitle={article.chromeTitle}
      eyebrow={article.eyebrow}
      title={article.title}
      lead={article.lead}
    >
      {article.sections.map((section) => (
        <MarketingSection key={section.title} title={section.title}>
          {section.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </MarketingSection>
      ))}
      <p className="text-sm text-chess-muted">
        <Link to="/learn" className="font-semibold text-chess-accent hover:underline">
          ← All guides
        </Link>
        {" · "}
        <Link to="/free-chess-game-review" className="font-semibold text-chess-accent hover:underline">
          Free unlimited review
        </Link>
      </p>
    </MarketingPageLayout>
  );
}
