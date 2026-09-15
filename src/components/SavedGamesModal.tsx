import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hapticSoft, hapticTap, notifyWarning } from "../utils/chessSounds";
import type { SavedReviewListItem } from "../utils/savedReviews";

interface SavedGamesModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  items: SavedReviewListItem[];
  /** Load failure — shown instead of a false empty state. */
  error?: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry?: () => void;
}

export function SavedGamesModal({
  open,
  onClose,
  loading,
  items,
  error = null,
  onOpen,
  onDelete,
  onRetry,
}: SavedGamesModalProps) {
  // Ignore backdrop taps briefly after open so the same mobile tap that
  // opened this modal (from under the profile sheet) can't immediately close it.
  const [backdropArmed, setBackdropArmed] = useState(false);
  const armTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setBackdropArmed(false);
      if (armTimerRef.current != null) {
        window.clearTimeout(armTimerRef.current);
        armTimerRef.current = null;
      }
      return;
    }
    setBackdropArmed(false);
    armTimerRef.current = window.setTimeout(() => {
      setBackdropArmed(true);
      armTimerRef.current = null;
    }, 350);
    return () => {
      if (armTimerRef.current != null) {
        window.clearTimeout(armTimerRef.current);
        armTimerRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-games-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="Close"
        disabled={!backdropArmed}
        onClick={() => {
          if (!backdropArmed) return;
          hapticSoft();
          onClose();
        }}
      />
      <div className="glass-sheet relative z-[1] w-[min(92vw,28rem)] max-h-[min(80dvh,32rem)] rounded-2xl border border-chess-hairline-strong bg-chess-panel shadow-elev-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-chess-border bg-chess-bg/40">
          <h2 id="saved-games-title" className="text-sm font-semibold text-chess-text">
            Saved games
          </h2>
          <button
            type="button"
            onClick={() => {
              hapticSoft();
              onClose();
            }}
            className="h-7 w-7 rounded-md text-chess-muted hover:text-chess-text hover:bg-chess-hover"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-xs text-chess-subtext text-center py-8">Loading saved games…</p>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-8 px-3 text-center">
              <p className="text-xs text-chess-subtext">{error}</p>
              {onRetry ? (
                <button
                  type="button"
                  onClick={() => {
                    hapticTap();
                    onRetry();
                  }}
                  className="rounded-lg border border-chess-hairline bg-chess-surface px-3 py-1.5 text-[12px] font-semibold text-chess-text hover:bg-chess-hover"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-chess-subtext text-center py-8">
              No saved games yet. Complete a review, then tap the save icon under the board.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-chess-border/50 bg-black/20 px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap();
                      onOpen(item.id);
                    }}
                    className="w-full text-left"
                  >
                    <div className="truncate text-[13px] font-medium text-chess-text">
                      {item.whiteName} vs {item.blackName}
                    </div>
                    <div className="text-[11px] text-chess-subtext mt-0.5">
                      {item.movesCount} moves · {new Date(item.savedAt).toLocaleDateString()}
                    </div>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        notifyWarning();
                        onDelete(item.id);
                      }}
                      className="rounded-md px-2 py-1 text-[11px] font-semibold text-red-300/90 hover:bg-red-500/15 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
