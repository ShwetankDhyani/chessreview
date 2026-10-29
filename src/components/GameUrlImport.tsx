import React, { useState } from "react";
import { fetchPgnFromGameUrl } from "../utils/gameUrlImport";
import { hapticTapStrong, notifyError, notifySuccess } from "../utils/chessSounds";
import { InlineErrorNotice } from "./InlineErrorNotice";
import {
  normalizeImportError,
  trackAppError,
  type AppError,
} from "../utils/appError";

interface GameUrlImportProps {
  onImported: (pgn: string) => void;
  compact?: boolean;
}

export function GameUrlImport({ onImported, compact = false }: GameUrlImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const handleImport = async () => {
    if (!url.trim() || loading) return;
    hapticTapStrong();
    setLoading(true);
    setError(null);
    try {
      const { pgn } = await fetchPgnFromGameUrl(url.trim());
      onImported(pgn);
      setUrl("");
      setError(null);
      notifySuccess();
    } catch (e) {
      const normalized = normalizeImportError(e);
      setError(normalized);
      notifyError();
      trackAppError({
        code: normalized.code,
        message: normalized.message,
        context: { source: "game-url-import" },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? "" : "mobile-surface-section"}`}>
      <div className="game-url-row flex items-stretch gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleImport();
          }}
          placeholder="Paste game URL"
          aria-label="Paste game URL"
          aria-invalid={Boolean(error)}
          className="mobile-field flex-1 min-w-0"
          spellCheck={false}
          autoCapitalize="off"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={loading || !url.trim()}
          className="cr-btn-secondary shrink-0 px-3 text-xs disabled:opacity-40"
        >
          {loading ? "Opening…" : "Open"}
        </button>
      </div>
      {error && (
        <InlineErrorNotice
          message={error.message}
          onRetry={error.retryable ? () => void handleImport() : undefined}
          onDismiss={() => setError(null)}
        />
      )}
      {!compact && !error && (
        <p className="text-[10px] text-chess-muted/80 leading-snug">
          chess.com and lichess.org only
        </p>
      )}
    </div>
  );
}
