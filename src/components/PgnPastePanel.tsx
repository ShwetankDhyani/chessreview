import React, { useRef, useState } from "react";
import { hapticTap, hapticTapStrong } from "../utils/chessSounds";
import { parseGameText } from "../utils/pgnParse";

interface PgnPastePanelProps {
  onLoad: (pgn: string) => void;
  onLinkProfile?: () => void;
  className?: string;
  /** Smaller field for use below account promo on Games tab */
  compact?: boolean;
}

export function PgnPastePanel({
  onLoad,
  onLinkProfile,
  className = "",
  compact = false,
}: PgnPastePanelProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLoad = () => {
    hapticTapStrong();
    const result = parseGameText(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onLoad(result.pgn);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    hapticTap();
    try {
      const raw = await file.text();
      setText(raw);
      const result = parseGameText(raw);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      hapticTapStrong();
      onLoad(result.pgn);
    } catch {
      setError("Invalid file");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const pasteClip = async () => {
    hapticTap();
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) {
        setText(clip);
        setError(null);
        hapticTapStrong();
      }
    } catch {
      setError("Paste manually");
    }
  };

  return (
    <div
      className={`flex flex-col min-h-0 gap-2.5 ${compact ? "" : "flex-1 gap-3"} ${className}`}
    >
      {compact && (
        <p className="text-[10px] uppercase tracking-wider text-chess-muted/70 text-center">
          or paste PGN
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Paste PGN"
        className={`w-full bg-chess-bg/60 border border-chess-border/70 rounded-xl font-mono text-chess-text placeholder:text-chess-muted/50 focus:outline-none focus:border-move-best/60 focus:ring-1 focus:ring-move-best/20 resize-none transition-all ${
          compact
            ? "min-h-[96px] max-h-[128px] p-3 text-xs"
            : "flex-1 min-h-[200px] p-4 text-sm"
        }`}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />

      {error && (
        <p className="text-[11px] text-move-blunder text-center -mt-1">{error}</p>
      )}

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleLoad}
          disabled={!text.trim()}
          className="flex-1 bg-move-best hover:bg-green-600 disabled:opacity-30 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          Review
        </button>
        <button
          type="button"
          onClick={() => void pasteClip()}
          aria-label="Paste from clipboard"
          className="h-10 w-10 flex-shrink-0 rounded-xl border border-chess-border/80 text-chess-muted hover:text-chess-text hover:border-chess-muted transition-colors"
        >
          <span className="text-base leading-none" aria-hidden>
            ⧉
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            hapticTap();
            fileRef.current?.click();
          }}
          aria-label="Open PGN file"
          className="h-10 w-10 flex-shrink-0 rounded-xl border border-chess-border/80 text-chess-muted hover:text-chess-text hover:border-chess-muted transition-colors"
        >
          <span className="text-base leading-none" aria-hidden>
            ↑
          </span>
        </button>
      </div>

      {onLinkProfile && !compact && (
        <button
          type="button"
          onClick={() => {
            hapticTap();
            onLinkProfile();
          }}
          className="text-[11px] text-chess-muted/90 hover:text-move-best transition-colors text-center py-0.5"
        >
          or link Chess.com / Lichess profile
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pgn,.txt,text/plain"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
