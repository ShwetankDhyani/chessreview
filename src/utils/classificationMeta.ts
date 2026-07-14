import type { MoveClassification } from "../types";

export interface ClassificationMeta {
  label: string;
  color: string;
  bgColor: string;
  glyph: string;
  symbol: string;
}

/**
 * Glanceable report-card palette on dark UI.
 * Spread across hue (not a green cluster) so Best / Excellent / Good
 * and Inaccuracy / Mistake / Blunder separate at a distance.
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
    // Olive sage — quiet positive, not another neon green
    color: "#b4a45c",
    bgColor: "bg-move-good",
    glyph: "",
    symbol: "👍",
  },
  book: {
    label: "Book",
    color: "#c4a484",
    bgColor: "bg-move-book",
    glyph: "🕮",
    symbol: "🕮",
  },
  inaccuracy: {
    label: "Inaccuracy",
    color: "#f0d24b",
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
    color: "#f24552",
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
