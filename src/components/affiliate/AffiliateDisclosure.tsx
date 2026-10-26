import { Link } from "react-router-dom";

interface AffiliateDisclosureProps {
  inline?: boolean;
  className?: string;
  /** Show Amazon Associates statement */
  amazon?: boolean;
}

const SHORT =
  "Some links on this site are affiliate links. If you buy through them, I may earn a commission at no extra cost to you. It helps keep ChessReview.org running.";

const AMAZON =
  "As an Amazon Associate I earn from qualifying purchases.";

export function AffiliateDisclosure({
  inline = false,
  className = "",
  amazon = true,
}: AffiliateDisclosureProps) {
  if (inline) {
    return (
      <p className={`text-[10px] text-chess-muted leading-relaxed ${className}`}>
        {SHORT}
        {amazon ? ` ${AMAZON}` : ""}{" "}
        <Link
          to="/affiliate-disclosure"
          className="text-chess-accent/80 hover:text-chess-accent underline-offset-2 hover:underline"
        >
          Full disclosure
        </Link>
      </p>
    );
  }

  return (
    <aside
      className={`rounded-lg border border-chess-hairline bg-chess-surface/40 px-3 py-2 ${className}`}
      aria-label="Affiliate disclosure"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1">
        Affiliate disclosure
      </p>
      <p className="text-[11px] text-chess-subtext leading-relaxed">
        {SHORT}
        {amazon ? ` ${AMAZON}` : ""} We only recommend products we believe help
        players improve.{" "}
        <Link
          to="/affiliate-disclosure"
          className="text-chess-accent hover:underline"
        >
          Read the full disclosure
        </Link>
        .
      </p>
    </aside>
  );
}

export function AffiliateDisclosureContent() {
  return (
    <div className="space-y-4 text-sm text-chess-subtext leading-relaxed">
      <h2 className="text-lg font-bold text-chess-text">Affiliate disclosure</h2>
      <p>
        ChessReview.org participates in affiliate and referral programs to help
        cover hosting and keep the site free — no ads wall, no paywall.
      </p>
      <p>
        <strong className="text-chess-text">What that means:</strong> when you
        click certain links to courses, books, equipment, or training platforms
        and make a purchase, we may earn a small commission. You pay the same
        price either way.
      </p>
      <p>
        <strong className="text-chess-text">Amazon:</strong> {AMAZON} Links
        default to amazon.com (US tag). Visitors in India are routed to
        amazon.in. Visitors in Europe are routed to amazon.de, amazon.co.uk,
        amazon.fr, amazon.it, or amazon.es (EU Associates tag) based on browser
        timezone and language — with other EU regions falling back to amazon.de.
      </p>
      <p>
        <strong className="text-chess-text">Our promise:</strong> recommendations
        are chosen for usefulness, not commission rate. No fake urgency, fake
        scarcity, or fake reviews.
      </p>
      <p>
        Outbound affiliate links use{" "}
        <code className="text-xs bg-chess-surface px-1 py-0.5 rounded">
          rel=&quot;sponsored nofollow noopener noreferrer&quot;
        </code>
        .
      </p>
      <p className="text-xs text-chess-muted">
        Questions: admin@chessreview.org
      </p>
    </div>
  );
}
