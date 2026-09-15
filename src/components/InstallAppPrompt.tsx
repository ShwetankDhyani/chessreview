import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { hapticSoft, hapticTap } from "../utils/chessSounds";
import { safeGetItem, safeSetItem } from "../utils/safeStorage";

const DISMISS_KEY = "cr_install_prompt_dismissed_at";
/** Snooze install nags — long enough to not annoy, short enough to re-offer. */
export const INSTALL_PROMPT_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(mq || iosStandalone);
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/i.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(ua);
  return iOS && webkit && (notOther || /Safari/i.test(ua));
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches || navigator.maxTouchPoints > 0;
}

export function isInstallSnoozed(
  dismissedAt: string | null,
  now: number = Date.now()
): boolean {
  if (!dismissedAt) return false;
  const at = Number(dismissedAt);
  if (!Number.isFinite(at) || at <= 0) return false;
  if (at > now) return true;
  return now - at < INSTALL_PROMPT_SNOOZE_MS;
}

export function shouldShowInstallPrompt(opts: {
  dismissedAt: string | null;
  standalone: boolean;
  canInstall: boolean;
  ios: boolean;
  mobile: boolean;
  force?: boolean;
}): boolean {
  if (opts.force) return !opts.standalone;
  if (opts.standalone) return false;
  if (!opts.mobile) return false;
  if (isInstallSnoozed(opts.dismissedAt)) return false;
  return opts.canInstall || opts.ios;
}

interface InstallAppPromptProps {
  className?: string;
  /** When true, ignore snooze (e.g. opened from profile menu). */
  force?: boolean;
  onDismissed?: () => void;
}

/**
 * Quiet mobile install offer — Chrome/Edge use beforeinstallprompt;
 * iOS Safari gets Share → Add to Home Screen instructions.
 */
export function InstallAppPrompt({
  className = "",
  force = false,
  onDismissed,
}: InstallAppPromptProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [forced, setForced] = useState(force);

  const refreshVisibility = useCallback(
    (canInstall: boolean) => {
      setVisible(
        shouldShowInstallPrompt({
          dismissedAt: safeGetItem(DISMISS_KEY),
          standalone: isStandaloneDisplay(),
          canInstall,
          ios: isIosSafari(),
          mobile: isMobileViewport(),
          force: forced,
        })
      );
    },
    [forced]
  );

  useEffect(() => {
    setForced(force);
  }, [force]);

  useEffect(() => {
    const onOffer = () => {
      if (isStandaloneDisplay()) return;
      setForced(true);
      setIosHelp(isIosSafari());
      setVisible(true);
    };
    window.addEventListener("cr_offer_install", onOffer);
    return () => window.removeEventListener("cr_offer_install", onOffer);
  }, []);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setVisible(false);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      setDeferred(ev);
      refreshVisibility(true);
    };
    const onInstalled = () => {
      setDeferred(null);
      setVisible(false);
      setForced(false);
      safeSetItem(DISMISS_KEY, String(Date.now()));
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    refreshVisibility(Boolean(deferred));

    const onResize = () => refreshVisibility(Boolean(deferred));
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("resize", onResize);
    };
  }, [deferred, refreshVisibility]);

  if (!visible) return null;

  const dismiss = (e?: MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    hapticSoft();
    safeSetItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setIosHelp(false);
    setForced(false);
    onDismissed?.();
  };

  const handleInstall = async () => {
    hapticTap();
    if (deferred) {
      setInstalling(true);
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {
        /* user dismissed native sheet */
      } finally {
        setDeferred(null);
        setInstalling(false);
        setVisible(false);
        safeSetItem(DISMISS_KEY, String(Date.now()));
        onDismissed?.();
      }
      return;
    }
    if (isIosSafari()) {
      setIosHelp(true);
      return;
    }
  };

  return (
    <aside
      aria-label="Install ChessReview"
      className={`relative overflow-hidden rounded-xl border border-chess-accent/30 bg-chess-accent/[0.07] px-3 py-2.5 shadow-elev-1 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-chess-accent/30 bg-chess-accent/15 text-chess-accent"
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3a1 1 0 0 1 1 1v8.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L11 12.6V4a1 1 0 0 1 1-1zM5 18a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-chess-accent/90">
            Install app
          </p>
          <p className="mt-1 text-[13px] font-semibold leading-snug tracking-tight text-chess-text">
            Add ChessReview to your home screen
          </p>
          {iosHelp ? (
            <ol className="mt-2 space-y-1 text-[11px] leading-snug text-chess-subtext list-decimal pl-4">
              <li>
                Tap the <span className="font-semibold text-chess-text">Share</span> button in Safari
              </li>
              <li>
                Choose <span className="font-semibold text-chess-text">Add to Home Screen</span>
              </li>
              <li>
                Tap <span className="font-semibold text-chess-text">Add</span>
              </li>
            </ol>
          ) : (
            <p className="mt-1 text-[11px] leading-snug text-chess-subtext">
              Launch it like an app — faster access, full-screen play.
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {!iosHelp ? (
              <button
                type="button"
                onClick={() => void handleInstall()}
                disabled={installing}
                className="cr-btn-primary text-[11px] px-2.5 py-1.5 disabled:opacity-60"
              >
                {deferred ? (installing ? "Installing…" : "Install") : isIosSafari() ? "How to install" : "Install"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss()}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-chess-muted transition-colors hover:bg-white/5 hover:text-chess-text"
            >
              {iosHelp ? "Got it" : "Not now"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => dismiss(e)}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-chess-muted transition-colors hover:bg-white/5 hover:text-chess-text text-sm"
          aria-label="Dismiss install prompt"
        >
          ×
        </button>
      </div>
    </aside>
  );
}
