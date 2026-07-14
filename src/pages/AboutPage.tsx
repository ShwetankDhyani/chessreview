import { usePageSeo } from "../hooks/usePageSeo";

const CHESSCOM_USERNAME = "ShwetankDhyani";
const CHESSCOM_CHALLENGE = `https://www.chess.com/play/online/new?isInvited=1&opponent=${CHESSCOM_USERNAME}`;

export default function AboutPage() {
  usePageSeo({
    title: "Play — ChessReview",
    description: "Challenge Shwetank on Chess.com.",
    path: "/about",
  });

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text">
      <header className="border-b border-chess-border bg-chess-panel/80">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a
            href="/"
            className="text-sm font-bold text-chess-accent hover:underline"
          >
            ← ChessReview
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-16 flex justify-center">
        <a
          href={CHESSCOM_CHALLENGE}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3 rounded-xl border border-chess-border bg-chess-panel/60 px-6 py-4 text-chess-text hover:border-chess-accent/40 hover:bg-chess-accent/[0.08] transition-colors"
        >
          <span className="text-lg font-bold tracking-wide">Play Me!</span>
          <span className="flex items-center gap-1 text-chess-accent" aria-hidden>
            <SwordIcon className="group-hover:translate-x-0.5 transition-transform" />
            <SwordIcon mirrored className="group-hover:-translate-x-0.5 transition-transform" />
          </span>
        </a>
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
