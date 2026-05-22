import type { AnalyzedMove } from "../types";

export const KEY_MOMENT_CLASSIFICATIONS = [
  "brilliant",
  "great",
  "mistake",
  "blunder",
] as const;

export type KeyMomentClassification = (typeof KEY_MOMENT_CLASSIFICATIONS)[number];

const KEY_SET = new Set<string>(KEY_MOMENT_CLASSIFICATIONS);

export function isKeyMomentClassification(
  c: string | null | undefined
): c is KeyMomentClassification {
  return !!c && KEY_SET.has(c);
}

export function listKeyMomentIndices(moves: AnalyzedMove[]): number[] {
  return moves
    .map((m, i) => ({ i, c: m.classification }))
    .filter(({ c }) => isKeyMomentClassification(c))
    .map(({ i }) => i);
}

export interface KeyMomentNavState {
  prev: number | undefined;
  next: number | undefined;
  /** 1-based index when the board is on a key moment; null otherwise */
  position: number | null;
  total: number;
}

export function keyMomentNavState(
  indices: number[],
  currentIdx: number
): KeyMomentNavState {
  if (!indices.length) {
    return { prev: undefined, next: undefined, position: null, total: 0 };
  }
  const prev = [...indices].reverse().find((i) => i < currentIdx);
  const next = indices.find((i) => i > currentIdx);
  const onIdx = indices.indexOf(currentIdx);
  return {
    prev,
    next,
    position: onIdx >= 0 ? onIdx + 1 : null,
    total: indices.length,
  };
}
