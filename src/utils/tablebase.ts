/** Lichess endgame tablebase probe (≤7 pieces). */

export interface TablebaseMove {
  uci: string;
  san?: string;
  category: string;
  dtz: number | null;
  dtm: number | null;
}

export interface TablebaseResult {
  category: string;
  dtz: number | null;
  dtm: number | null;
  best?: TablebaseMove | null;
  checkmate?: boolean;
  stalemate?: boolean;
}

const TB_URL = "https://tablebase.lichess.ovh/standard";

/** Count pieces on a FEN board (A–Z / a–z only). */
export function pieceCountFromFen(fen: string): number {
  const board = fen.split(/\s+/)[0] ?? "";
  let n = 0;
  for (const ch of board) {
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) n++;
  }
  return n;
}

export function isTablebasePosition(fen: string): boolean {
  const n = pieceCountFromFen(fen);
  return n >= 2 && n <= 7;
}

function pickBestMove(
  moves: Array<{
    uci?: string;
    san?: string;
    category?: string;
    dtz?: number | null;
    dtm?: number | null;
  }>
): TablebaseMove | null {
  if (!moves.length) return null;
  const ranked = [...moves].sort((a, b) => {
    const cat = categoryRank(a.category) - categoryRank(b.category);
    if (cat !== 0) return cat;
    const da = Math.abs(a.dtz ?? 9999);
    const db = Math.abs(b.dtz ?? 9999);
    return da - db;
  });
  const m = ranked[0]!;
  if (!m.uci) return null;
  return {
    uci: m.uci,
    san: m.san,
    category: m.category ?? "unknown",
    dtz: m.dtz ?? null,
    dtm: m.dtm ?? null,
  };
}

function categoryRank(cat: string | undefined): number {
  switch (cat) {
    case "win":
      return 0;
    case "cursed-win":
      return 1;
    case "draw":
      return 2;
    case "blessed-loss":
      return 3;
    case "loss":
      return 4;
    default:
      return 5;
  }
}

export function formatTablebaseSummary(tb: TablebaseResult): string {
  if (tb.checkmate) return "Checkmate";
  if (tb.stalemate) return "Stalemate";
  const cat = tb.category;
  if (cat === "win") {
    if (tb.dtm != null) return `TB win · DTM ${Math.abs(tb.dtm)}`;
    if (tb.dtz != null) return `TB win · DTZ ${Math.abs(tb.dtz)}`;
    return "Tablebase win";
  }
  if (cat === "loss") {
    if (tb.dtm != null) return `TB loss · DTM ${Math.abs(tb.dtm)}`;
    if (tb.dtz != null) return `TB loss · DTZ ${Math.abs(tb.dtz)}`;
    return "Tablebase loss";
  }
  if (cat === "draw" || cat === "cursed-win" || cat === "blessed-loss") {
    return cat === "draw" ? "Tablebase draw" : `Tablebase ${cat}`;
  }
  return "Tablebase";
}

export async function probeTablebase(
  fen: string,
  signal?: AbortSignal
): Promise<TablebaseResult | null> {
  if (!isTablebasePosition(fen)) return null;
  const url = `${TB_URL}?fen=${encodeURIComponent(fen)}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    category?: string;
    dtz?: number | null;
    dtm?: number | null;
    checkmate?: boolean;
    stalemate?: boolean;
    moves?: Array<{
      uci?: string;
      san?: string;
      category?: string;
      dtz?: number | null;
      dtm?: number | null;
    }>;
  };
  return {
    category: data.category ?? "unknown",
    dtz: data.dtz ?? null,
    dtm: data.dtm ?? null,
    checkmate: !!data.checkmate,
    stalemate: !!data.stalemate,
    best: pickBestMove(data.moves ?? []),
  };
}
