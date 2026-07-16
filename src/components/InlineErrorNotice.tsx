import type { ReactNode } from "react";
import { hapticSelection, hapticSoft } from "../utils/chessSounds";

interface InlineErrorNoticeProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  children?: ReactNode;
  /** Soft = muted amber notice; error = red alert (default). */
  tone?: "error" | "soft";
}

export function InlineErrorNotice({
  message,
  onRetry,
  onDismiss,
  className = "",
  children,
  tone = "error",
}: InlineErrorNoticeProps) {
  const soft = tone === "soft";
  return (
    <div
      className={
        soft
          ? `rounded-xl border border-chess-border/70 bg-chess-panel/80 px-3 py-2 text-[11px] leading-snug text-chess-subtext ${className}`
          : `rounded-xl border border-red-900/50 bg-red-950/35 px-3 py-2 text-[11px] leading-snug text-red-100/90 ${className}`
      }
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span
          className={
            soft
              ? "mt-[4px] inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400/70"
              : "mt-[4px] inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-300/80"
          }
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{message}</p>
          {children ? <div className="mt-1 opacity-80">{children}</div> : null}
        </div>
        {(onRetry || onDismiss) && (
          <div className="flex flex-shrink-0 items-center gap-2.5">
            {onRetry ? (
              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  onRetry();
                }}
                className={
                  soft
                    ? "font-semibold text-chess-accent hover:text-chess-accent-hover"
                    : "font-semibold text-red-100 hover:text-white"
                }
              >
                Retry
              </button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                onClick={() => {
                  hapticSoft();
                  onDismiss();
                }}
                className={
                  soft
                    ? "font-medium text-chess-muted hover:text-chess-text"
                    : "font-medium text-red-300/90 hover:text-red-100"
                }
              >
                Dismiss
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
