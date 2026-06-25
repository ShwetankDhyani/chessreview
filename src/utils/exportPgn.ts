/** Sanitize player names for a download filename. */
export function buildPgnFilename(white: string, black: string): string {
  const safe = (name: string) =>
    name
      .trim()
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 32) || "player";
  return `${safe(white)}_vs_${safe(black)}.pgn`;
}

/** Trigger a browser download of the loaded PGN. */
export function downloadPgn(pgn: string, filename = "game.pgn"): void {
  const text = pgn.trim();
  if (!text) return;

  const blob = new Blob([`${text}\n`], {
    type: "application/vnd.chess-pgn;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
