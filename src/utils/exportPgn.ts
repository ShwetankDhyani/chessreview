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

/** Copy PGN text to the clipboard. Returns false if the browser blocked it. */
export async function copyPgnToClipboard(pgn: string): Promise<boolean> {
  const text = pgn.trim();
  if (!text) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
