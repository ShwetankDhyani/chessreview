import { Link } from "react-router-dom";
import { usePageSeo } from "../hooks/usePageSeo";
import { HOME_FAQ, aboutJsonLd } from "../utils/seo";

const CHESSCOM_USERNAME = "ShwetankDhyani";
const CHESSCOM_CHALLENGE = `https://www.chess.com/play/online/new?isInvited=1&opponent=${CHESSCOM_USERNAME}`;

export default function AboutPage() {
  usePageSeo({
    title: "About ChessReview — Free Chess Analysis for Club Players",
    description:
      "ChessReview is a free online chess game review for amateurs and club players. Import Chess.com or Lichess games, read clear move ratings and accuracy, and use Stockfish — no subscription.",
    path: "/about",
    jsonLd: aboutJsonLd(),
  });

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text spa-panel-enter">
      <header className="border-b border-chess-border bg-chess-panel/80">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            to="/"
            className="text-sm font-bold text-chess-accent hover:underline"
          >
            ← ChessReview
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold mt-3 tracking-tight">
            About ChessReview
          </h1>
          <p className="text-base text-chess-subtext mt-2 leading-relaxed">
            Free online chess game analysis for people who play for the love of
            the game — club nights, weekend tournaments, and returning adults
            who want clear feedback after a match.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-20 space-y-10 text-base text-chess-subtext leading-relaxed">
        <section className="space-y-3" aria-labelledby="what-it-does">
          <h2 id="what-it-does" className="text-lg font-semibold text-chess-text">
            What it does
          </h2>
          <p>
            Paste a Chess.com or Lichess link, or a PGN, and ChessReview reviews
            the game with readable move classifications, accuracy scores, an
            evaluation graph, and Stockfish engine lines. There is no account
            wall and no paid tier.
          </p>
          <p>
            The site is aimed at amateur and club players in the Americas,
            Europe, and Australia — anyone who wants a plain-language look at
            where a game turned, without wading through a dense engine dump.
          </p>
          <p>
            <Link to="/" className="text-chess-accent font-semibold hover:underline">
              Start a free game review
            </Link>
            {" · "}
            <Link to="/blog" className="text-chess-accent hover:underline">
              Read the blog
            </Link>
          </p>
        </section>

        <section className="space-y-4" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-lg font-semibold text-chess-text">
            Common questions
          </h2>
          <dl className="space-y-4">
            {HOME_FAQ.map((item) => (
              <div key={item.question}>
                <dt className="font-semibold text-chess-text">{item.question}</dt>
                <dd className="mt-1 text-chess-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="pt-2" aria-labelledby="play-heading">
          <h2 id="play-heading" className="sr-only">
            Challenge the creator
          </h2>
          <a
            href={CHESSCOM_CHALLENGE}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-xl border border-chess-border bg-chess-panel/60 px-6 py-4 text-chess-text hover:border-chess-accent/40 hover:bg-chess-accent/[0.08] transition-colors"
          >
            <span className="text-lg font-bold tracking-wide">Play Me!</span>
            <span className="flex items-center gap-1 text-chess-accent" aria-hidden>
              <SwordIcon className="group-hover:translate-x-0.5 transition-transform" />
              <SwordIcon
                mirrored
                className="group-hover:-translate-x-0.5 transition-transform"
              />
            </span>
          </a>
          <p className="text-sm text-chess-muted mt-3">
            Optional Chess.com challenge against {CHESSCOM_USERNAME} — separate
            from reviewing your own games.
          </p>
        </section>
      </main>
    </div>
  );
}

function SwordIcon({
  mirrored = false,
  className = "",
}: {
  mirrored?: boolean;
  className?: string;
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${mirrored ? "scale-x-[-1]" : ""} ${className}`}
      aria-hidden
    >
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
    </svg>
  );
}
