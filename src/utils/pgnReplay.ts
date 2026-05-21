import { Chess } from "chess.js";

export interface ReplayFrame {
  fenBefore: string;
  fenAfter: string;
  from: string;
  to: string;
  san: string;
}

export function buildPgnReplayFrames(pgn: string): ReplayFrame[] {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });
    const frames: ReplayFrame[] = [];
    const tmp = new Chess();
    for (const m of history) {
      const fenBefore = tmp.fen();
      tmp.move(m.san);
      frames.push({
        fenBefore,
        fenAfter: tmp.fen(),
        from: m.from,
        to: m.to,
        san: m.san,
      });
    }
    return frames;
  } catch {
    return [];
  }
}

/** Map analysis progress (0…total) to a replay ply index. */
export function progressToReplayPly(
  done: number,
  total: number,
  frameCount: number
): number {
  if (frameCount <= 0 || total <= 0) return -1;
  const ratio = Math.min(1, Math.max(0, done / total));
  return Math.min(frameCount - 1, Math.floor(ratio * frameCount));
}
