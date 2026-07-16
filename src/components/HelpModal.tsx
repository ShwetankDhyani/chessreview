import { useEffect, useState } from "react";
import { hapticSoft } from "../utils/chessSounds";

export interface SupportLink {
  label: string;
  href: string;
}

const SUPPORT_EMAIL = "admin@chessreview.org";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
const DEFAULT_KOFI = "https://ko-fi.com/shwetank";

const DEFAULT_SUPPORT_LINKS: SupportLink[] = [
  {
    label: "Buy me a coffee",
    href: DEFAULT_KOFI,
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

function CoffeeMugIcon({ size = 40 }: { size?: number }) {
  return (
    <span className="support-coffee-icon" aria-hidden style={{ width: size * 1.1, height: size * 1.15 }}>
      <span className="support-coffee-steam">
        <span className="support-coffee-steam-wisp support-coffee-steam-wisp--a" />
        <span className="support-coffee-steam-wisp support-coffee-steam-wisp--b" />
        <span className="support-coffee-steam-wisp support-coffee-steam-wisp--c" />
      </span>
      <svg
        className="support-coffee-mug"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
      >
        <path
          d="M12 26h32v18c0 5.5-4.5 10-10 10H22c-5.5 0-10-4.5-10-10V26z"
          fill="currentColor"
          className="text-chess-accent"
        />
        <path
          d="M14 28h28v14c0 4.4-3.6 8-8 8H22c-4.4 0-8-3.6-8-8V28z"
          fill="#161512"
          opacity="0.28"
        />
        <path
          d="M44 30h6c4.4 0 8 3.6 8 8s-3.6 8-8 8h-6"
          stroke="currentColor"
          className="text-chess-accent"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <ellipse cx="28" cy="26" rx="16" ry="4" fill="#c5e09a" />
        <ellipse cx="28" cy="25.5" rx="12" ry="2.6" fill="#3d5a24" />
      </svg>
    </span>
  );
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
  const [tab, setTab] = useState<"contact" | "support">(initial);

  useEffect(() => {
    if (!open) return;
    setTab(initial);
  }, [open, initial]);

  if (!open) return null;

  const links = parseSupportLinks();
  const supportHref = links[0]?.href ?? DEFAULT_KOFI;
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
            <h2
              id="help-title"
              className="support-coffee-prank-title text-base font-bold text-chess-accent"
            >
              …For meee!
            </h2>
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
                href={SUPPORT_MAILTO}
                className="group inline-flex w-full items-center gap-2.5 rounded-lg border border-chess-border/50 bg-chess-bg/30 px-3.5 py-2.5 text-sm text-chess-subtext transition-colors hover:border-chess-border hover:bg-chess-bg/45"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-chess-surface/60 text-chess-muted" aria-hidden>
                  ✉️
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  Email - {SUPPORT_EMAIL}
                </span>
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
          <div className="support-coffee-reveal space-y-4 text-sm text-chess-subtext leading-relaxed">
            <p className="text-chess-text">
              Hey, I&apos;m Shwetank. I think I did a pretty good job with this website, and I hope
              you agree :)
            </p>
            <p>
              I keep ChessReview running out of my own pocket purely for the love of chess and this
              community. If you forgive me for the prank—and found the site helpful—don&apos;t be shy
              about sending some actual coffee love my way!
            </p>

            <a
              href={supportHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticSoft()}
              className="support-coffee-cta group"
            >
              <CoffeeMugIcon />
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[15px] font-bold tracking-tight text-chess-text group-hover:text-white transition-colors">
                  Buy me a coffee
                </span>
                <span className="mt-0.5 block text-[11px] font-medium text-chess-muted group-hover:text-chess-subtext transition-colors">
                  Support on Ko-fi
                </span>
              </span>
              <span
                className="flex-shrink-0 text-base font-semibold text-chess-accent opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                aria-hidden
              >
                →
              </span>
            </a>

            <a
              href={SUPPORT_MAILTO}
              className="block text-center text-[11px] text-chess-muted hover:text-chess-subtext transition-colors"
            >
              Or email — {SUPPORT_EMAIL}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
