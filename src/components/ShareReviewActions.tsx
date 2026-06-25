import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildReviewShareText,
  canUseNativeShare,
  copyShareText,
  instagramShareUrl,
  shareViaNativeSheet,
  telegramShareUrl,
  whatsAppShareUrl,
} from "../utils/socialShare";
import { InlineErrorNotice } from "./InlineErrorNotice";
import { trackAppError } from "../utils/appError";

interface ShareReviewActionsProps {
  url: string;
  whiteName: string;
  blackName: string;
  whiteAccuracy?: number;
  blackAccuracy?: number;
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${className}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function ShareReviewActions({
  url,
  whiteName,
  blackName,
  whiteAccuracy,
  blackAccuracy,
}: ShareReviewActionsProps) {
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const nativeShare = canUseNativeShare();

  const shareText = useMemo(
    () =>
      buildReviewShareText({
        whiteName,
        blackName,
        whiteAccuracy,
        blackAccuracy,
      }),
    [whiteName, blackName, whiteAccuracy, blackAccuracy]
  );

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setActionError(null);
    } catch {
      setActionError("Could not copy link. You can still select and copy it manually.");
      trackAppError({
        code: "SHARE_COPY_FAILED",
        message: "Clipboard copy failed.",
        context: { source: "share-actions" },
      });
    }
  }, [url]);

  const openShare = useCallback((href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

  const handleInstagram = useCallback(async () => {
    try {
      await copyShareText(url, shareText);
      setActionError(null);
      openShare(instagramShareUrl());
    } catch {
      setActionError("Could not prepare Instagram share. Try copy link instead.");
      trackAppError({
        code: "SHARE_INSTAGRAM_FAILED",
        message: "Instagram share prep failed.",
        context: { source: "share-actions" },
      });
    }
  }, [url, shareText, openShare]);

  const handleNativeShare = useCallback(async () => {
    try {
      await shareViaNativeSheet(url, shareText);
      setActionError(null);
    } catch {
      setActionError("Sharing was cancelled or unavailable on this device.");
      trackAppError({
        code: "SHARE_NATIVE_FAILED",
        message: "Native share unavailable or cancelled.",
        context: { source: "share-actions" },
      });
    }
  }, [url, shareText]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <input
          readOnly
          value={url}
          className="flex-1 min-w-0 text-[10px] rounded-md border border-chess-border bg-chess-bg px-2 py-1.5 text-chess-muted"
          onFocus={(e) => e.target.select()}
          aria-label="Share link"
        />
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={`text-[10px] h-8 px-2.5 rounded-md font-semibold transition-colors duration-200 flex-shrink-0 ${
            copied
              ? "bg-[#6daa6d] text-white"
              : "bg-chess-accent text-chess-bg"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <IconButton
          label="Share on WhatsApp"
          onClick={() => openShare(whatsAppShareUrl(url, shareText))}
          className="border-[#25D366]/30 text-[#7ddea0] hover:bg-[#25D366]/15"
        >
          <WhatsAppIcon />
        </IconButton>
        <IconButton
          label="Share on Telegram"
          onClick={() => openShare(telegramShareUrl(url, shareText))}
          className="border-[#2AABEE]/30 text-[#7ecbf5] hover:bg-[#2AABEE]/15"
        >
          <TelegramIcon />
        </IconButton>
        <IconButton
          label="Copy for Instagram"
          onClick={() => void handleInstagram()}
          className="border-pink-400/25 text-pink-200/90 hover:bg-pink-500/10"
        >
          <InstagramIcon />
        </IconButton>
        {nativeShare ? (
          <IconButton
            label="More share options"
            onClick={() => void handleNativeShare()}
            className="border-chess-border text-chess-muted hover:bg-chess-hover"
          >
            <ShareIcon />
          </IconButton>
        ) : null}
      </div>
      {actionError && (
        <InlineErrorNotice
          message={actionError}
          onDismiss={() => setActionError(null)}
        />
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.11.55 4.09 1.514 5.805L0 24l6.408-1.68A11.96 11.96 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.91 0-3.72-.52-5.29-1.43l-.38-.22-3.8 1 1.02-3.7-.25-.38A9.82 9.82 0 0 1 2.18 12C2.18 6.57 6.57 2.18 12 2.18S21.82 6.57 21.82 12 17.43 21.82 12 21.82z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v14" />
    </svg>
  );
}
