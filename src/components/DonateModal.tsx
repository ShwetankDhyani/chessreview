const DONATE_URL = import.meta.env.VITE_DONATE_URL as string | undefined;

export function DonateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const url = typeof DONATE_URL === "string" && DONATE_URL.trim() ? DONATE_URL.trim() : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-chess-border bg-chess-panel shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 id="donate-title" className="text-sm font-bold">
            Support ChessReview
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-chess-muted hover:bg-chess-hover"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-chess-muted leading-relaxed">
          ChessReview is free to use. A donation helps keep the servers and analysis
          running for everyone.
        </p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full text-center rounded-lg bg-chess-accent py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Donate
          </a>
        ) : (
          <p className="mt-4 text-[10px] text-chess-muted text-center">
            Donation link coming soon.
          </p>
        )}
      </div>
    </div>
  );
}
