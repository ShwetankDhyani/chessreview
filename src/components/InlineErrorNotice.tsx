import type { ReactNode } from "react";

interface InlineErrorNoticeProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  children?: ReactNode;
}

export function InlineErrorNotice({
  message,
  onRetry,
  onDismiss,
  className = "",
  children,
}: InlineErrorNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-red-300/90" />
        <div className="min-w-0 flex-1">
          <p>{message}</p>
          {children ? <div className="mt-1.5">{children}</div> : null}
        </div>
        {(onRetry || onDismiss) && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="font-semibold text-red-100 hover:text-white"
              >
                Retry
              </button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="font-semibold text-red-300 hover:text-red-100"
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
