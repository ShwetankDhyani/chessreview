import type { WdlTriple } from "./wdl";

export interface ParsedInfoLine {
  depth: number;
  multipv: number;
  scoreType: "cp" | "mate" | null;
  scoreValue: number | null;
  wdl: WdlTriple | null;
  pv: string[];
  move: string | null;
}

/**
 * Parse a Stockfish `info` line with score (and optional WDL).
 * Returns null if the line has no usable score.
 */
export function parseInfoLine(line: string): ParsedInfoLine | null {
  if (!line.startsWith("info ")) return null;

  const depthMatch = line.match(/\bdepth (\d+)/);
  if (!depthMatch) return null;

  const mpvMatch = line.match(/\bmultipv (\d+)/);
  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  const wdlMatch = line.match(/\bwdl (\d+) (\d+) (\d+)/);
  const pvMatch = line.match(/\bpv (.+)$/);

  let scoreType: "cp" | "mate" | null = null;
  let scoreValue: number | null = null;
  if (cpMatch) {
    scoreType = "cp";
    scoreValue = parseInt(cpMatch[1], 10);
  } else if (mateMatch) {
    scoreType = "mate";
    scoreValue = parseInt(mateMatch[1], 10);
  } else {
    return null;
  }

  const pv = pvMatch ? pvMatch[1].trim().split(/\s+/).slice(0, 12) : [];

  return {
    depth: parseInt(depthMatch[1], 10),
    multipv: mpvMatch ? parseInt(mpvMatch[1], 10) : 1,
    scoreType,
    scoreValue,
    wdl: wdlMatch
      ? {
          w: parseInt(wdlMatch[1], 10),
          d: parseInt(wdlMatch[2], 10),
          l: parseInt(wdlMatch[3], 10),
        }
      : null,
    pv,
    move: pv[0] ?? null,
  };
}

/** Keep the deepest result per MultiPV slot. */
export function aggregateMultiPV(
  infoLines: string[],
  targetDepth?: number
): ParsedInfoLine[] {
  const lines = new Map<number, ParsedInfoLine>();
  const minDepth = targetDepth !== undefined ? targetDepth - 2 : 0;

  for (const raw of infoLines) {
    const parsed = parseInfoLine(raw);
    if (!parsed || parsed.depth < minDepth) continue;
    const prev = lines.get(parsed.multipv);
    if (!prev || parsed.depth >= prev.depth) {
      lines.set(parsed.multipv, parsed);
    }
  }

  return [...lines.values()].sort((a, b) => a.multipv - b.multipv);
}
