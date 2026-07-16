import type { MoveClassification } from "../types";

export interface ClassificationMeta {
  label: string;
  color: string;
  bgColor: string;
  glyph: string;
  symbol: string;
}

/**
 * Core palette for today’s classifier: Best / Good / Book /
 * Inaccuracy / Mistake / Blunder. Legacy keys (brilliant, great,
 * excellent, miss) remain for older shared reviews only.
 */
export const CLASSIFICATION_META: Record<
  NonNullable<MoveClassification>,
  ClassificationMeta
> = {
  brilliant: {
    label: "Brilliant",
    color: "#00c8b4",
    bgColor: "bg-move-brilliant",
    glyph: "!!",
    symbol: "!!",
  },
  great: {
    label: "Great Move",
    color: "#4c94e8",
    bgColor: "bg-move-great",
    glyph: "!",
    symbol: "!",
  },
  best: {
    label: "Best Move",
    // Bright lime — top-tier positive
    color: "#9ed635",
    bgColor: "bg-move-best",
    glyph: "",
    symbol: "★",
  },
  excellent: {
    label: "Excellent",
    // Emerald — clearly greener / cooler than Best lime
    color: "#2fbf71",
    bgColor: "bg-move-excellent",
    glyph: "",
    symbol: "✓",
  },
  good: {
    label: "Good",
    // Muted olive — distinct from Best lime; icon is a checkmark
    color: "#8aa24b",
    bgColor: "bg-move-good",
    glyph: "",
    symbol: "✓",
  },
  book: {
    label: "Book",
    color: "#c4a484",
    bgColor: "bg-move-book",
    glyph: "book",
    symbol: "book",
  },
  inaccuracy: {
    label: "Inaccuracy",
    // Deep amber — stays visible on yellow last-move squares
    color: "#d4920a",
    bgColor: "bg-move-inaccuracy",
    glyph: "!?",
    symbol: "!?",
  },
  miss: {
    label: "Miss",
    color: "#e26eaa",
    bgColor: "bg-move-miss",
    glyph: "Ø",
    symbol: "Ø",
  },
  mistake: {
    label: "Mistake",
    color: "#f08a2a",
    bgColor: "bg-move-mistake",
    glyph: "?",
    symbol: "?",
  },
  blunder: {
    label: "Blunder",
    color: "#e83545",
    bgColor: "bg-move-blunder",
    glyph: "??",
    symbol: "??",
  },
};

export function getMeta(
  c: MoveClassification
): ClassificationMeta | undefined {
  if (!c) return undefined;
  return CLASSIFICATION_META[c];
}
