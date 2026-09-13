import { useEffect, useState } from "react";
import { hapticSoft } from "../utils/chessSounds";
import {
  CHESSCOM_MESSAGE_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  supportUrl,
} from "../utils/supportLinks";
export type { SupportLink } from "../utils/supportLinks";

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

  const supportHref = supportUrl();
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
        onClick={() => {
          hapticSoft();
          onClose();
        }}
      />
      <div className="relative w-full sm:max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-chess-hairline-strong bg-chess-panel shadow-elev-4 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="help-title" className="text-base font-bold text-chess-text">
            {readOnlyContact || !showSupport ? "Contact" : "Donate"}
          </h2>
          <button
            type="button"
            onClick={() => {
              hapticSoft();
              onClose();
            }}
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
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-chess-surface/60 text-chess-muted"
                  aria-hidden
                >
                  ✉️
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  Email - {SUPPORT_EMAIL}
                </span>
              </a>
              <a
                href={CHESSCOM_MESSAGE_URL}
                className="group inline-flex w-full items-center gap-2.5 rounded-lg border border-chess-border/70 bg-chess-bg/40 px-3.5 py-2.5 text-sm text-chess-subtext transition-colors hover:border-chess-accent/35 hover:bg-chess-accent/[0.06] hover:text-chess-accent"
              >
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-chess-surface/80 text-chess-muted transition-colors group-hover:text-chess-accent"
                  aria-hidden
                >
                  ♟️
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  Message on Chess.com
                </span>
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-chess-subtext leading-relaxed">
            <p className="text-chess-text">
              ChessReview stays free — no ads, no paywall — and it runs out of
              pocket. If it has helped your chess, a donation helps keep it
              online for the next player too.
            </p>
            <p>
              Entirely optional. The site stays exactly as it is either way.
            </p>

            <a
              href={supportHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticSoft()}
              className="group inline-flex w-full items-center gap-3 rounded-xl border border-chess-accent/35 bg-chess-accent/10 px-3.5 py-3 transition-colors hover:border-chess-accent/55 hover:bg-chess-accent/16"
            >
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-chess-accent/30 bg-chess-accent/15 text-chess-accent"
                aria-hidden
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[15px] font-bold tracking-tight text-chess-text">
                  Donate
                </span>
                <span className="mt-0.5 block text-[11px] font-medium text-chess-muted">
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
