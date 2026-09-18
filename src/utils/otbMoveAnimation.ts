import { Chess, type Move, type Square } from "chess.js";
import {
  canAnimateOneStep,
  canAnimateUndoStep,
  normalizeFen,
} from "./boardPosition";

export type OtbAnimDirection = "forward" | "undo";

export type OtbResolvedMove = {
  direction: OtbAnimDirection;
  move: Move;
  /** Square of a captured piece to remove (normal or en passant). */
  captureSquare: string | null;
  /** Rook glide for castling, if any. */
  rook: { from: string; to: string } | null;
};

/** Ease — soft accelerate then settle (Harry-Potter glide). */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Arc height in board units — knights hop higher, sliding pieces skim. */
export function glideHop(piece: string, isKnightLike = false): number {
  if (piece === "n" || isKnightLike) return 0.95;
  if (piece === "p") return 0.28;
  if (piece === "k") return 0.22;
  if (piece === "r") return 0.32;
  return 0.42;
}

function castlingRook(
  color: "w" | "b",
  flags: string
): { from: string; to: string } | null {
  if (flags.includes("k")) {
    return color === "w"
      ? { from: "h1", to: "f1" }
      : { from: "h8", to: "f8" };
  }
  if (flags.includes("q")) {
    return color === "w"
      ? { from: "a1", to: "d1" }
      : { from: "a8", to: "d8" };
  }
  return null;
}

function captureSquareFor(move: Move): string | null {
  if (!move.captured) return null;
  if (move.flags.includes("e")) {
    // En passant: victim sits on the file of `to`, rank of `from`.
    return `${move.to[0]}${move.from[1]}`;
  }
  return move.to;
}

/**
 * Resolve a one-ply board step into a concrete chess.js move + extras.
 * Returns null when the FEN pair cannot be animated safely.
 */
export function resolveOtbMoveAnim(
  prevFen: string,
  targetFen: string,
  highlight: { from: string; to: string }
): OtbResolvedMove | null {
  const from = highlight.from as Square;
  const to = highlight.to as Square;

  if (canAnimateOneStep(prevFen, targetFen, highlight)) {
    try {
      const c = new Chess(normalizeFen(prevFen));
      const move = c.move({ from, to, promotion: "q" });
      if (!move) return null;
      return {
        direction: "forward",
        move,
        captureSquare: captureSquareFor(move),
        rook: castlingRook(move.color, move.flags),
      };
    } catch {
      return null;
    }
  }

  if (canAnimateUndoStep(prevFen, targetFen, highlight)) {
    try {
      const c = new Chess(normalizeFen(targetFen));
      const move = c.move({ from, to, promotion: "q" });
      if (!move) return null;
      return {
        direction: "undo",
        move,
        captureSquare: captureSquareFor(move),
        rook: castlingRook(move.color, move.flags),
      };
    } catch {
      return null;
    }
  }

  return null;
}

/** Prefer a slightly longer glide than the 2D board for the 3D table feel. */
export function otbGlideDurationMs(animationDuration: number): number {
  if (animationDuration <= 0) return 0;
  return Math.max(animationDuration, 560);
}
