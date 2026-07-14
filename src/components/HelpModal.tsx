export interface SupportLink {
  label: string;
  href: string;
}

const DEFAULT_SUPPORT_LINKS: SupportLink[] = [
  {
    label: "Support via PayPal",
    href: "https://paypal.me/shwetankdhyani",
  },
];

const CHESSCOM_USERNAME = "ShwetankDhyani";
const CHESSCOM_MESSAGE = `https://www.chess.com/messages/compose?to=${CHESSCOM_USERNAME}`;

function parseSupportLinks(): SupportLink[] {
  const raw = import.meta.env.VITE_SUPPORT_LINKS as string | undefined;
  if (!raw?.trim()) return DEFAULT_SUPPORT_LINKS;
  try {
    const parsed = JSON.parse(raw) as SupportLink[];
    const links = Array.isArray(parsed)
      ? parsed.filter((l) => l?.label && l?.href)
      : [];
    return links.length > 0 ? links : DEFAULT_SUPPORT_LINKS;
  } catch {
    return DEFAULT_SUPPORT_LINKS;
  }
}

export function HelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const links = parseSupportLinks();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-chess-border bg-chess-panel shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="help-title" className="text-base font-bold text-chess-text">
            Support Us
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex-shrink-0 rounded-lg text-chess-muted hover:text-chess-text hover:bg-chess-hover"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm text-chess-subtext leading-relaxed">
          <p>
            ChessReview began as a hobby project — built for the joy of studying
            games and sharing that with other players who love chess.
          </p>
          <p>
            Keeping analysis fast and the site online comes with real costs:
            servers, tunnels, and compute for deep engine reviews. None of that
            diminishes the fun of building this; it is simply part of running it
            well.
          </p>
          <p>
            If this tool has helped your chess, a small donation or practical
            help (for example access to server capacity) genuinely makes a
            difference in how much we can offer and how reliably it runs.
          </p>
          <p className="text-chess-muted text-xs">
            There is no paywall — support is entirely optional. Thank you for
            being here.
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-chess-border/80">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-1.5">
            Questions & suggestions
          </p>
          <p className="text-xs text-chess-muted mb-3 leading-relaxed">
            Reach us by email or a Chess.com message — we read every note.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="mailto:admin@chessreview.org"
              className="group inline-flex w-full items-center gap-2.5 rounded-lg border border-chess-border/70 bg-chess-bg/40 px-3.5 py-2.5 text-sm text-chess-subtext transition-colors hover:border-chess-accent/35 hover:bg-chess-accent/[0.06] hover:text-chess-accent"
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-chess-surface/80 text-chess-muted transition-colors group-hover:text-chess-accent"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16v12H4z" />
                  <path d="M4 7l8 6 8-6" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                admin@chessreview.org
              </span>
            </a>
            <a
              href={CHESSCOM_MESSAGE}
              className="group inline-flex w-full items-center gap-2.5 rounded-lg border border-chess-border/70 bg-chess-bg/40 px-3.5 py-2.5 text-sm text-chess-subtext transition-colors hover:border-chess-accent/35 hover:bg-chess-accent/[0.06] hover:text-chess-accent"
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-chess-surface/80 text-chess-muted transition-colors group-hover:text-chess-accent"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                Message on Chess.com
              </span>
            </a>
          </div>
        </div>

        {links.length > 0 && (
          <div className="mt-5 pt-4 border-t border-chess-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-chess-muted mb-2">
              Support options
            </p>
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center rounded-lg border border-chess-border bg-chess-surface py-2.5 text-sm font-medium text-chess-accent hover:bg-chess-hover hover:border-chess-accent/40 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
