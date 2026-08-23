import { hapticSoft, hapticTap, notifyWarning } from "../utils/chessSounds";
import type { SavedReviewListItem } from "../utils/savedReviews";

interface SavedGamesModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  items: SavedReviewListItem[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SavedGamesModal({
  open,
  onClose,
  loading,
  items,
  onOpen,
  onDelete,
}: SavedGamesModalProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/60"
        onClick={() => {
          hapticSoft();
          onClose();
        }}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,28rem)] max-h-[min(80dvh,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-chess-hairline-strong bg-chess-panel shadow-elev-4 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-games-title"
      >
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
            <p className="text-xs text-chess-muted text-center py-8">Loading saved games…</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-chess-muted text-center py-8">
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
                    <div className="text-[11px] text-chess-muted mt-0.5">
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
                      className="text-[11px] text-chess-muted hover:text-red-300"
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
    </>
  );
}
