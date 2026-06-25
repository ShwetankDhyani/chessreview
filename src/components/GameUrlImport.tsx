import React, { useState } from "react";
import { fetchPgnFromGameUrl } from "../utils/gameUrlImport";
import { hapticTapStrong } from "../utils/chessSounds";

interface GameUrlImportProps {
  onImported: (pgn: string) => void;
  compact?: boolean;
}

export function GameUrlImport({ onImported, compact = false }: GameUrlImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.trim()) return;
    hapticTapStrong();
    setLoading(true);
    setError(null);
    try {
      const { pgn } = await fetchPgnFromGameUrl(url.trim());
      onImported(pgn);
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? "" : "mobile-surface-section"}`}>
      <div className="flex gap-1.5">
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
          className="mobile-field flex-1 min-w-0"
          spellCheck={false}
          autoCapitalize="off"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={loading || !url.trim()}
          className="mobile-icon-btn w-auto px-3 text-chess-accent border-chess-accent/30 bg-chess-accent/10 hover:bg-chess-accent/20 disabled:opacity-40"
        >
          {loading ? "…" : "Go"}
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-move-blunder leading-snug" role="alert">
          {error}
        </p>
      )}
      {!compact && !error && (
        <p className="text-[10px] text-chess-muted/80 leading-snug">
          chess.com and lichess.org only
        </p>
      )}
    </div>
  );
}
