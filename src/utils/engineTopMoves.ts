import { Chess } from "chess.js";
import { analyzePositionMultiPv } from "../analysis/stockfishClient";
import type { MultiPvLine } from "../analysis/types";
import { formatSignedMate, formatSignedPawnsFromCp } from "./evalDisplay";

export interface EngineTopMove {
  rank: number;
  san: string;
  uci: string;
  evalLabel: string;
  isPlayed: boolean;
}

const cache = new Map<string, EngineTopMove[]>();

export function normalizeMoveUci(uci: string): string {
  return uci.replace(/[^a-h0-9]/gi, "").slice(0, 4).toLowerCase();
}

export function uciToSan(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4] as "q" | "r" | "b" | "n" | undefined;
    const m = chess.move({ from, to, promotion });
    return m?.san ?? null;
  } catch {
    return null;
  }
}

function evalLabelForMover(line: MultiPvLine, mover: "w" | "b"): string {
  if (line.mate !== undefined) {
    const m = mover === "w" ? line.mate : -line.mate;
    return formatSignedMate(m);
  }
  const cp = line.cp ?? 0;
  const forMover = mover === "w" ? cp : -cp;
  return formatSignedPawnsFromCp(forMover);
}

/** Build ranked top moves from MultiPV lines (max 3). */
export function topMovesFromAnalysis(
  fen: string,
  lines: MultiPvLine[],
  playedUci: string,
  mover: "w" | "b"
): EngineTopMove[] {
  const played = normalizeMoveUci(playedUci);
  const result: EngineTopMove[] = [];

  for (let i = 0; i < lines.length && result.length < 3; i++) {
    const line = lines[i];
    const uci = (line.bestMove ?? line.pv[0] ?? "").toLowerCase();
    if (!uci || uci.length < 4) continue;
    const san = uciToSan(fen, uci);
    if (!san) continue;
    result.push({
      rank: result.length + 1,
      san,
      uci,
      evalLabel: evalLabelForMover(line, mover),
      isPlayed: normalizeMoveUci(uci) === played,
    });
  }

  return result;
}

export function playedInTopThree(moves: EngineTopMove[]): boolean {
  return moves.some((m) => m.isPlayed);
}

export async function fetchEngineTopMoves(
  fen: string,
  playedUci: string,
  mover: "w" | "b",
  options?: { depth?: number; force?: boolean }
): Promise<EngineTopMove[]> {
  const cacheKey = `${fen}|${playedUci}`;
  if (!options?.force && cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const depth = options?.depth ?? 14;
  const analysis = await analyzePositionMultiPv(fen, {
    depth,
    multiPv: 3,
    timeoutMs: 15_000,
  });

  const moves = topMovesFromAnalysis(fen, analysis.lines, playedUci, mover);
  if (moves.length > 0) cache.set(cacheKey, moves);
  return moves;
}
