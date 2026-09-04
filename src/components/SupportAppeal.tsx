import { useEffect, useState, type MouseEvent } from "react";
import { hapticSoft } from "../utils/chessSounds";
import { countCachedReviews } from "../utils/reviewCache";
import { safeGetItem, safeSetItem } from "../utils/safeStorage";
import { supportUrl } from "../utils/supportLinks";

const DISMISS_KEY = "cr_support_appeal_dismissed_at";

/**
 * Reviews someone must have finished before we ask for anything.
 *
 * Asking a first-time visitor to donate is both presumptuous and ineffective —
 * they have not seen what the site does yet, and on a fresh visit this would
 * stack under the welcome banner as a second thing to dismiss. Waiting until
 * the site has demonstrably helped keeps the copy honest.
 */
export const MIN_REVIEWS_BEFORE_APPEAL = 2;

/**
 * How long a dismissal lasts.
 *
 * Permanently hiding it loses everyone who meant "not right now", while showing
 * it again next visit is nagging. Two months is long enough that nobody feels
 * chased, and the appeal still reaches regulars eventually.
 */
export const SUPPORT_APPEAL_SNOOZE_MS = 60 * 24 * 60 * 60 * 1000;

/** Exported for tests: should the appeal be shown at all? */
export function shouldShowAppeal(opts: {
  dismissedAt: string | null;
  reviewCount: number;
  now?: number;
}): boolean {
  if (opts.reviewCount < MIN_REVIEWS_BEFORE_APPEAL) return false;
  return !isSnoozed(opts.dismissedAt, opts.now ?? Date.now());
}

/** Exported for tests: is the appeal currently snoozed? */
export function isSnoozed(
  dismissedAt: string | null,
  now: number = Date.now()
): boolean {
  if (!dismissedAt) return false;
  const at = Number(dismissedAt);
  if (!Number.isFinite(at) || at <= 0) return false;
  // A clock set forward then back could park a dismissal in the future;
  // treat that as snoozed rather than showing the card every load.
  if (at > now) return true;
  return now - at < SUPPORT_APPEAL_SNOOZE_MS;
}

interface SupportAppealProps {
  className?: string;
}

/**
 * A quiet, dismissible note asking for support.
 *
 * Deliberately understated: no urgency, no guilt, no modal, and one tap to make
 * it go away. It sits alongside the news teaser rather than interrupting play.
 */
export function SupportAppeal({ className = "" }: SupportAppealProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setVisible(
        shouldShowAppeal({
          dismissedAt: safeGetItem(DISMISS_KEY),
          reviewCount: countCachedReviews(),
        })
      );
    };
    refresh();
    // Appear as soon as the 2nd review finishes without requiring a reload.
    window.addEventListener("cr_review_logged", refresh);
    return () => window.removeEventListener("cr_review_logged", refresh);
  }, []);

  if (!visible) return null;

  const dismiss = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hapticSoft();
    safeSetItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <aside
      aria-label="Support ChessReview"
      className={`group/appeal relative overflow-hidden rounded-xl border border-chess-accent/25 bg-chess-accent/[0.055] px-3 py-2.5 shadow-elev-1 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-chess-accent/25 bg-chess-accent/12 text-chess-accent"
          aria-hidden
        >
          <svg
            width="15"
            height="15"
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

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-chess-accent/85">
            An appeal for help
          </p>
          <p className="mt-1 text-[12px] font-semibold leading-snug tracking-tight text-chess-text">
            ChessReview has been free for months
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-chess-muted">
            No ads, no sign-up, no paywall — and it runs out of pocket. If it has
            helped your chess, chipping in helps keep it free for the next player
            too. Entirely optional, and the site stays exactly as it is either
            way.
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <a
              href={supportUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticSoft()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-chess-accent px-2.5 py-1.5 text-[11px] font-semibold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-200 ease-soft hover:bg-chess-accent-hover active:scale-[0.97]"
            >
              Chip in
              <span aria-hidden>→</span>
            </a>
            <button
              type="button"
              onClick={dismiss}
              className="text-[11px] font-medium text-chess-muted transition-colors duration-200 ease-soft hover:text-chess-subtext"
            >
              Maybe later
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss support message"
          className="-mr-1 -mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-chess-muted/70 transition-all duration-200 ease-soft hover:bg-white/5 hover:text-chess-text active:scale-95"
        >
          ×
        </button>
      </div>
    </aside>
  );
}
