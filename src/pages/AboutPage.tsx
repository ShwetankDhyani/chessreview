import { Link } from "react-router-dom";
import { SiteChrome } from "../components/SiteChrome";
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
    <SiteChrome title="About">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.12),transparent_65%)]"
          aria-hidden
        />

        <main className="relative max-w-2xl mx-auto px-4 py-7 sm:py-10 space-y-8">
          <header className="space-y-3 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chess-accent/90">
              About
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-chess-text">
              ChessReview
            </h1>
            <p className="text-sm sm:text-[15px] text-chess-subtext leading-relaxed max-w-md">
              Free online chess game analysis for people who play for the love
              of the game — club nights, weekend tournaments, and returning
              adults who want clear feedback after a match.
            </p>
            <div className="h-px w-16 bg-gradient-to-r from-chess-accent/70 to-transparent" />
          </header>

          <section className="space-y-3 text-sm sm:text-[15px] text-chess-subtext leading-relaxed">
            <h2 className="text-base font-semibold text-chess-text">What it does</h2>
            <p>
              Paste a Chess.com or Lichess link, or a PGN, and ChessReview
              reviews the game with readable move classifications, accuracy
              scores, an evaluation graph, and Stockfish engine lines. There is
              no account wall and no paid tier.
            </p>
            <p>
              Built for amateur and club players who want a plain-language look
              at where a game turned — without a subscription wall.
            </p>
            <p>
              <Link
                to="/"
                className="text-chess-accent font-semibold hover:underline"
              >
                Start a free game review
              </Link>
              {" · "}
              <Link to="/blog" className="text-chess-accent hover:underline">
                Read the blog
              </Link>
            </p>
          </section>

          <section className="space-y-4" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-base font-semibold text-chess-text"
            >
              Common questions
            </h2>
            <dl className="space-y-4">
              {HOME_FAQ.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-chess-border/80 bg-chess-panel/40 px-4 py-3.5"
                >
                  <dt className="text-sm font-semibold text-chess-text">
                    {item.question}
                  </dt>
                  <dd className="mt-1.5 text-sm text-chess-muted leading-relaxed">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="pt-1 pb-4" aria-labelledby="play-heading">
            <h2 id="play-heading" className="sr-only">
              Challenge the creator
            </h2>
            <a
              href={CHESSCOM_CHALLENGE}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 rounded-2xl border border-chess-border/80 bg-chess-panel/50 px-5 py-3.5 text-chess-text hover:border-chess-accent/40 hover:bg-chess-accent/[0.08] transition-colors"
            >
              <span className="text-base font-bold tracking-wide">Play Me!</span>
              <span
                className="flex items-center gap-1 text-chess-accent"
                aria-hidden
              >
                <SwordIcon className="group-hover:translate-x-0.5 transition-transform" />
                <SwordIcon
                  mirrored
                  className="group-hover:-translate-x-0.5 transition-transform"
                />
              </span>
            </a>
            <p className="text-xs text-chess-muted mt-3">
              Optional Chess.com challenge against {CHESSCOM_USERNAME} —
              separate from reviewing your own games.
            </p>
          </section>
        </main>
      </div>
    </SiteChrome>
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
