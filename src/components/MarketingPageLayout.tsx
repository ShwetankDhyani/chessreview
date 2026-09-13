import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { SiteChrome } from "./SiteChrome";

/** Shared chrome for SEO/marketing pages — does not touch the analysis app. */
export function MarketingPageLayout({
  chromeTitle,
  eyebrow,
  title,
  lead,
  children,
}: {
  chromeTitle: string;
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <SiteChrome title={chromeTitle}>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64
            bg-[radial-gradient(ellipse_at_top,rgba(150,188,75,0.12),transparent_65%)]"
          aria-hidden
        />
        <main className="relative mx-auto max-w-2xl space-y-8 px-4 py-7 sm:py-10">
          <header className="space-y-3 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chess-accent/90">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-chess-text sm:text-[2.35rem]">
              {title}
            </h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-chess-subtext">
              {lead}
            </p>
            <div className="h-px w-16 bg-gradient-to-r from-chess-accent/70 to-transparent" />
            <p className="cr-trust-row pt-1">
              <span>Free &amp; unlimited</span>
              <span className="text-chess-border-strong/70" aria-hidden>
                ·
              </span>
              <span>No account</span>
              <span className="text-chess-border-strong/70" aria-hidden>
                ·
              </span>
              <span>Stockfish in your browser</span>
              <span className="text-chess-border-strong/70" aria-hidden>
                ·
              </span>
              <span>Private PGN</span>
            </p>
          </header>
          {children}
          <section className="cr-panel px-4 py-4">
            <p className="text-sm font-semibold text-chess-text">
              Review a game — or scout the rematch
            </p>
            <p className="mt-1 text-sm leading-relaxed text-chess-muted">
              Free Stockfish review after the game. H2H form prep before the next one.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/" className="cr-btn-primary">
                Start a free game review
              </Link>
              <Link to="/h2h" className="cr-btn-secondary">
                Open H2H
              </Link>
            </div>
          </section>
        </main>
      </div>
    </SiteChrome>
  );
}

export function MarketingSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 text-sm leading-relaxed text-chess-subtext sm:text-[15px]">
      <h2 className="text-base font-semibold text-chess-text">{title}</h2>
      {children}
    </section>
  );
}

export function MarketingFaq({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <section className="space-y-4 pb-2" aria-labelledby="marketing-faq">
      <h2 id="marketing-faq" className="text-base font-semibold text-chess-text">
        Common questions
      </h2>
      <dl className="space-y-4">
        {items.map((item) => (
          <div
            key={item.question}
            className="cr-panel px-4 py-3.5"
          >
            <dt className="text-sm font-semibold text-chess-text">
              {item.question}
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-chess-muted">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function MarketingLinkList({
  items,
}: {
  items: Array<{ to: string; label: string; blurb: string }>;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            className="cr-panel block px-4 py-3 transition-colors hover:border-chess-accent/40"
          >
            <span className="text-sm font-semibold text-chess-accent">
              {item.label}
            </span>
            <span className="mt-0.5 block text-sm text-chess-muted">
              {item.blurb}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
