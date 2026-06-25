import { computeMaterialDelta } from "./material";

/**
 * True when mover gave up meaningful material (sound sacrifice candidate).
 */
export function detectPieceSacrifice(
  fenBefore: string,
  fenAfter: string,
  engineLine?: string[]
): boolean {
  void engineLine;
  return computeMaterialDelta(fenBefore, fenAfter) <= -2;
}
