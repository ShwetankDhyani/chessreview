export interface OpeningEcoEntry {
  eco: string;
  name: string;
  moves: string[];
}

export interface OpeningEcoMatch {
  eco: string;
  name: string;
  plyCount: number;
}

let cached: OpeningEcoEntry[] | null = null;
let loading: Promise<OpeningEcoEntry[]> | null = null;

/** Lazy-load ~3.8k ECO lines (lichess-org/chess-openings). */
export async function loadOpeningEco(): Promise<OpeningEcoEntry[]> {
  if (cached) return cached;
  if (!loading) {
    loading = import("../assets/opening-eco.json").then((mod) => {
      cached = mod.default as OpeningEcoEntry[];
      return cached;
    });
  }
  return loading;
}

/** Longest SAN-prefix match against the ECO database. */
export function matchOpeningEco(
  sans: string[],
  entries: OpeningEcoEntry[]
): OpeningEcoMatch | null {
  if (!sans.length || !entries.length) return null;

  let best: OpeningEcoEntry | null = null;
  for (const entry of entries) {
    if (entry.moves.length > sans.length) continue;
    let matches = true;
    for (let i = 0; i < entry.moves.length; i++) {
      if (entry.moves[i] !== sans[i]) {
        matches = false;
        break;
      }
    }
    if (matches && (!best || entry.moves.length > best.moves.length)) {
      best = entry;
    }
  }

  if (!best) return null;
  return { eco: best.eco, name: best.name, plyCount: best.moves.length };
}

export function formatOpeningEcoLabel(match: OpeningEcoMatch): string {
  return `${match.eco} · ${match.name}`;
}
