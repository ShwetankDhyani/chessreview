import { usePageSeo } from "../hooks/usePageSeo";

export default function PrivacyPage() {
  usePageSeo({
    title: "Privacy Policy — ChessReview",
    description:
      "How ChessReview handles your data, share links, third-party services, and anonymous usage stats.",
    path: "/privacy",
  });

  return (
    <div className="min-h-screen bg-chess-bg text-chess-text">
      <header className="border-b border-chess-border bg-chess-panel/80">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <a href="/" className="text-sm font-bold text-chess-accent hover:underline">← ChessReview</a>
          <h1 className="text-lg font-bold mt-2">Privacy</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4 text-sm text-chess-subtext leading-relaxed">
        <p>
          ChessReview is built for studying your games, not hoarding them. We do not require an account to
          analyze a game.
        </p>
        <section className="space-y-2">
          <h2 className="text-chess-text font-semibold">What we store</h2>
          <ul className="list-disc pl-5 space-y-1 text-chess-muted">
            <li>Games you load stay in your browser unless you create a share link.</li>
            <li>Share links store a copy of that review on our server so others can view it.</li>
            <li>Anonymous stats (country, depth, duration) when a review completes — not your PGN.</li>
            <li>Linked Chess.com / Lichess usernames in your browser only.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-chess-text font-semibold">Third parties</h2>
          <ul className="list-disc pl-5 space-y-1 text-chess-muted">
            <li>Chess.com and Lichess public APIs when you import games.</li>
            <li>Our analysis engine server for Stockfish evaluations.</li>
            <li>Optional Google Gemini if configured for AI coach comments.</li>
            <li>Vercel for hosting and anonymous web analytics.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-chess-text font-semibold">Contact</h2>
          <p className="text-chess-muted">
            Questions? Use the Help link on the site footer.
          </p>
        </section>
      </main>
    </div>
  );
}
