import React, { useRef, useState } from "react";
import { parseGameText } from "../utils/pgnParse";

interface PgnPastePanelProps {
  onLoad: (pgn: string) => void;
  className?: string;
  compact?: boolean;
}

export function PgnPastePanel({
  onLoad,
  className = "",
  compact = false,
}: PgnPastePanelProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLoad = () => {
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
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pgn") && !name.endsWith(".txt") && file.type !== "text/plain") {
      setError("Use a .pgn or .txt file with standard PGN text.");
      return;
    }
    try {
      const raw = await file.text();
      setText(raw);
      const result = parseGameText(raw);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      onLoad(result.pgn);
    } catch {
      setError("Could not read that file.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const pasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) {
        setText(clip);
        setError(null);
      }
    } catch {
      setError("Allow clipboard access, or paste into the box manually.");
    }
  };

  return (
    <div
      className={`flex flex-col min-h-0 ${compact ? "gap-2" : "gap-3 flex-1"} ${className}`}
    >
      <div className={compact ? "" : "flex-shrink-0"}>
        <h2
          className={`font-semibold text-chess-text ${
            compact ? "text-xs uppercase tracking-wider text-chess-muted" : "text-sm"
          }`}
        >
          {compact ? "Paste PGN" : "Load a game"}
        </h2>
        {!compact && (
          <p className="text-xs text-chess-muted mt-1 leading-relaxed">
            Paste standard <span className="text-chess-text font-medium">PGN</span> from
            Chess.com, Lichess, or a <span className="font-mono">.pgn</span> file. Full games
            only — not FEN positions or screenshots.
          </p>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        placeholder={
          compact
            ? "[Event …]\n1. e4 e5 2. Nf3 …"
            : "Paste PGN here…\n\n[Event \"Live Chess\"]\n[White \"You\"]\n[Black \"Opponent\"]\n…\n1. e4 e5 2. Nf3 …"
        }
        className={`w-full bg-chess-bg border border-chess-border rounded-lg font-mono text-chess-text placeholder-chess-muted focus:outline-none focus:border-move-best resize-none transition-colors ${
          compact
            ? "min-h-[88px] p-2 text-[11px]"
            : "flex-1 min-h-[140px] p-3 text-xs leading-relaxed"
        }`}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />

      {error && (
        <p className="text-xs text-move-blunder leading-relaxed flex-shrink-0">{error}</p>
      )}

      <div className={`flex flex-col gap-2 flex-shrink-0 ${compact ? "" : "sm:flex-row sm:flex-wrap"}`}>
        <button
          type="button"
          onClick={handleLoad}
          disabled={!text.trim()}
          className="w-full sm:flex-1 bg-move-best hover:bg-green-600 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          Load & review
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void pasteFromClipboard()}
            className="flex-1 border border-chess-border text-chess-text text-xs font-semibold py-2 rounded-lg hover:bg-chess-hover transition-colors"
          >
            Paste from clipboard
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 border border-chess-border text-chess-text text-xs font-semibold py-2 rounded-lg hover:bg-chess-hover transition-colors"
          >
            Open .pgn file
          </button>
        </div>
      </div>

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
