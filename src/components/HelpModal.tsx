import { hapticSoft } from "../utils/chessSounds";
import { useState } from "react";
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
  initial = "contact",
}: {
  open: boolean;
  onClose: () => void;
  initial?: "contact" | "support";
}) {
  if (!open) return null;

  const links = parseSupportLinks();
  const [tab, setTab] = useState<"contact" | "support">(initial);
  const showSupport = tab === "support";
  const readOnlyContact = initial === "contact";

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
        onClick={() => { hapticSoft(); onClose(); }}
      />
      <div className="relative w-full sm:max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-chess-border bg-chess-panel shadow-2xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          {readOnlyContact ? (
            <h2 id="help-title" className="text-base font-bold text-chess-text">Contact</h2>
          ) : (
            <h2 id="help-title" className="text-base font-bold text-chess-text">Support Us</h2>
          )}
          <button
            type="button"
            onClick={() => { hapticSoft(); onClose(); }}
            className="h-8 w-8 flex-shrink-0 rounded-lg text-chess-muted hover:text-chess-text hover:bg-chess-hover"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {readOnlyContact || !showSupport ? (
          <div className="space-y-3 text-sm text-chess-subtext leading-relaxed">
            <p>Say hello or share feedback — we read every note.</p>
            <div className="flex flex-col gap-2 mt-2">
              <a
                href="mailto:admin@chessreview.org"
                className="group inline-flex w-full items-center gap-2.5 rounded-lg border border-chess-border/70 bg-chess-bg/40 px-3.5 py-2.5 text-sm text-chess-subtext transition-colors hover:border-chess-accent/35 hover:bg-chess-accent/[0.06] hover:text-chess-accent"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-chess-surface/80 text-chess-muted transition-colors group-hover:text-chess-accent" aria-hidden>
                  ✉️
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">Email: admin@chessreview.org</span>
              </a>
              <a
                href={CHESSCOM_MESSAGE}
                className="group inline-flex w-full items-center gap-2.5 rounded-lg border border-chess-border/70 bg-chess-bg/40 px-3.5 py-2.5 text-sm text-chess-subtext transition-colors hover:border-chess-accent/35 hover:bg-chess-accent/[0.06] hover:text-chess-accent"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-chess-surface/80 text-chess-muted transition-colors group-hover:text-chess-accent" aria-hidden>
                  ♟️
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">Message on Chess.com</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-chess-subtext leading-relaxed">
            <p>
              I host ChessReview on a personal server to keep it free and accessible for everyone.
              As the community grows, so do the computation costs. If you find the platform helpful,
              please consider chipping in! Whether it&apos;s a small donation or sharing server space,
              your support goes a long way in keeping us fast and reliable.
            </p>
          </div>
        )}

        {showSupport && (
          <div className="mt-4">
            <div className="flex flex-col gap-2">
              {links.slice(0, 1).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center rounded-lg border border-chess-border bg-chess-surface py-2.5 text-sm font-medium text-chess-accent hover:bg-chess-hover hover:border-chess-accent/40 transition-colors"
                >
                  PayPal
                </a>
              ))}
              <a
                href={CHESSCOM_MESSAGE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center rounded-lg border border-chess-border bg-chess-surface py-2.5 text-sm font-medium text-chess-subtext hover:bg-chess-hover hover:border-chess-accent/30 transition-colors"
              >
                Get in touch
              </a>
            </div>
          </div>
        )}

        {/* End */}
      </div>
    </div>
  );
}
