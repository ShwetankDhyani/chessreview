import { SiteChrome } from "../components/SiteChrome";
import { usePageSeo } from "../hooks/usePageSeo";

export default function PrivacyPage() {
  usePageSeo({
    title: "Privacy Policy — ChessReview",
    description:
      "Privacy policy for ChessReview: how free chess game reviews handle PGNs, share links, Chess.com/Lichess imports, and anonymous usage stats.",
    path: "/privacy",
  });

  return (
    <SiteChrome title="Privacy">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.12),transparent_65%)]"
          aria-hidden
        />

        <main className="relative max-w-2xl mx-auto px-4 py-7 sm:py-10 space-y-8">
          <header className="space-y-3 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chess-accent/90">
              Legal
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-chess-text">
              Privacy
            </h1>
            <p className="text-sm sm:text-[15px] text-chess-subtext leading-relaxed max-w-md">
              ChessReview is built for studying your games, not hoarding them.
              We do not require an account to analyze a game.
            </p>
            <div className="h-px w-16 bg-gradient-to-r from-chess-accent/70 to-transparent" />
          </header>

          <section className="rounded-2xl border border-chess-border/80 bg-chess-panel/40 px-4 py-4 space-y-2">
            <h2 className="text-sm font-semibold text-chess-text">What we store</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-chess-muted leading-relaxed">
              <li>Games you load stay in your browser unless you create a share link.</li>
              <li>Share links store a copy of that review on our server so others can view it.</li>
              <li>Anonymous stats (country, depth, duration) when a review completes — not your PGN.</li>
              <li>Linked Chess.com / Lichess usernames in your browser only.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-chess-border/80 bg-chess-panel/40 px-4 py-4 space-y-2">
            <h2 className="text-sm font-semibold text-chess-text">Third parties</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-chess-muted leading-relaxed">
              <li>Chess.com and Lichess public APIs when you import games.</li>
              <li>Our analysis engine server for Stockfish evaluations.</li>
              <li>Optional Google Gemini if configured for AI coach comments.</li>
              <li>Vercel for hosting and anonymous web analytics.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-chess-border/80 bg-chess-panel/40 px-4 py-4 space-y-2 pb-6">
            <h2 className="text-sm font-semibold text-chess-text">Contact</h2>
            <p className="text-sm text-chess-muted leading-relaxed">
              Questions? Use{" "}
              <strong className="text-chess-subtext font-medium">Contact</strong>{" "}
              or{" "}
              <strong className="text-chess-subtext font-medium">Support Us</strong>{" "}
              in the site footer.
            </p>
          </section>
        </main>
      </div>
    </SiteChrome>
  );
}
