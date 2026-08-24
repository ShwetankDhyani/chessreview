import { safeRemoveItem } from "../utils/safeStorage";

interface AppCrashScreenProps {
  error: Error;
  onRetry: () => void;
}

/** Caches that are safe to drop: all of them can be rebuilt from the network. */
const REBUILDABLE_KEYS = [
  "cr_games",
  "cr_games_meta",
  "cr_stats",
  "cr_review_cache_v1",
  "cr_timing_samples",
];

/**
 * Last-resort screen when the whole tree fails to render.
 *
 * A corrupt cached value can crash every render, so reloading alone would loop.
 * The recovery action therefore clears rebuildable caches, leaving saved
 * profiles intact.
 */
export function AppCrashScreen({ error, onRetry }: AppCrashScreenProps) {
  const clearCachesAndReload = () => {
    for (const key of REBUILDABLE_KEYS) safeRemoveItem(key);
    window.location.reload();
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-chess-bg px-5 py-10 font-sans text-chess-text">
      <div className="w-full max-w-md rounded-2xl border border-chess-hairline-strong bg-chess-panel/90 p-6 shadow-elev-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-chess-accent/35 bg-chess-accent/15 text-chess-accent"
            aria-hidden
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 8v5" />
              <path d="M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              ChessReview hit an unexpected error
            </h1>
            <p className="mt-0.5 text-[12px] text-chess-muted">
              Your saved profiles and games are safe.
            </p>
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-chess-subtext">
          Try again first. If the page keeps failing, clearing the cached game
          data usually fixes it — that only removes downloaded games, which are
          re-fetched automatically.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-chess-accent px-3.5 py-2 text-xs font-semibold text-white shadow-elev-1 transition-all duration-200 ease-soft hover:bg-chess-accent-hover active:scale-[0.97]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-chess-hairline px-3.5 py-2 text-xs font-semibold text-chess-subtext transition-all duration-200 ease-soft hover:bg-chess-hover active:scale-[0.97]"
          >
            Reload page
          </button>
          <button
            type="button"
            onClick={clearCachesAndReload}
            className="rounded-lg border border-chess-hairline px-3.5 py-2 text-xs font-semibold text-chess-muted transition-all duration-200 ease-soft hover:bg-chess-hover hover:text-chess-text active:scale-[0.97]"
          >
            Clear cached games &amp; reload
          </button>
        </div>

        {error?.message && (
          <p className="mt-4 break-words rounded-lg border border-chess-hairline bg-chess-bg/50 px-3 py-2 font-mono text-[10px] leading-relaxed text-chess-muted">
            {error.message.slice(0, 300)}
          </p>
        )}
      </div>
    </div>
  );
}
