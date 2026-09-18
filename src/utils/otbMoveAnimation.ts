import { type Move } from "chess.js";
import {
  findOnePlyMove,
  matchHighlightMove,
  samePosition,
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

/** Default glide when the parent board reports 0ms (false-negative animate gate). */
export const OTB_DEFAULT_GLIDE_MS = 560;

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

function pack(
  direction: OtbAnimDirection,
  move: Move
): OtbResolvedMove {
  return {
    direction,
    move,
    captureSquare: captureSquareFor(move),
    rook: castlingRook(move.color, move.flags),
  };
}

/**
 * Resolve a one-ply board step into a concrete chess.js move + extras.
 * Returns null when the FEN pair cannot be animated safely.
 *
 * Prefers `highlight` when it matches; otherwise scans legal moves so
 * underpromotions / stale UCI / clock-drift FENs still glide.
 */
export function resolveOtbMoveAnim(
  prevFen: string,
  targetFen: string,
  highlight: { from: string; to: string } | null
): OtbResolvedMove | null {
  if (samePosition(prevFen, targetFen)) return null;

  if (highlight) {
    const forward = matchHighlightMove(prevFen, targetFen, highlight);
    if (forward) return pack("forward", forward);

    const undo = matchHighlightMove(targetFen, prevFen, highlight);
    if (undo) return pack("undo", undo);
  }

  const forwardScan = findOnePlyMove(prevFen, targetFen);
  if (forwardScan) return pack("forward", forwardScan);

  const undoScan = findOnePlyMove(targetFen, prevFen);
  if (undoScan) return pack("undo", undoScan);

  return null;
}

/**
 * Prefer parent duration when > 0; otherwise use the 3D default so false
 * negatives from the 2D animate gate don't snap one-ply moves.
 */
export function otbGlideDurationMs(animationDuration: number): number {
  if (animationDuration > 0) return Math.max(animationDuration, OTB_DEFAULT_GLIDE_MS);
  return OTB_DEFAULT_GLIDE_MS;
}
