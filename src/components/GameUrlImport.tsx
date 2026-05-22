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
    <div
      className={`flex flex-col gap-2 ${compact ? "" : "rounded-xl border border-chess-border/80 bg-chess-bg/40 p-3"}`}
    >
      <div className="flex gap-2">
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
          className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-chess-bg/60 border border-chess-border/70 text-sm text-chess-text placeholder:text-chess-muted/50 focus:outline-none focus:border-chess-accent/50"
          spellCheck={false}
          autoCapitalize="off"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={loading || !url.trim()}
          className="h-10 px-3 rounded-xl bg-chess-accent hover:bg-chess-accent-hover disabled:opacity-40 text-white text-sm font-semibold transition-colors flex-shrink-0"
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
