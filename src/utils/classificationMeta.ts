import type { MoveClassification } from "../types";

export interface ClassificationMeta {
  label: string;
  color: string;
  bgColor: string;
  glyph: string;
  symbol: string;
}

// Colors matched to Chess.com Game Review post-game summary (circle badges)
export const CLASSIFICATION_META: Record<
  NonNullable<MoveClassification>,
  ClassificationMeta
> = {
  brilliant: {
    label: "Brilliant",
    color: "#1baca6",
    bgColor: "bg-move-brilliant",
    glyph: "!!",
    symbol: "!!",
  },
  great: {
    label: "Great Move",
    color: "#4a7eb8",
    bgColor: "bg-move-great",
    glyph: "!",
    symbol: "!",
  },
  best: {
    label: "Best Move",
    color: "#96bc4b",
    bgColor: "bg-move-best",
    glyph: "",
    symbol: "★",
  },
  excellent: {
    label: "Excellent",
    color: "#5c9e47",
    bgColor: "bg-move-excellent",
    glyph: "",
    symbol: "✓",
  },
  good: {
    label: "Good",
    color: "#8ead56",
    bgColor: "bg-move-good",
    glyph: "",
    symbol: "👍",
  },
  book: {
    label: "Book",
    color: "#b58863",
    bgColor: "bg-move-book",
    glyph: "",
    symbol: "📖",
  },
  inaccuracy: {
    label: "Inaccuracy",
    color: "#f0c050",
    bgColor: "bg-move-inaccuracy",
    glyph: "!?",
    symbol: "!?",
  },
  mistake: {
    label: "Mistake",
    color: "#e69045",
    bgColor: "bg-move-mistake",
    glyph: "?",
    symbol: "?",
  },
  miss: {
    label: "Miss",
    color: "#c45c26",
    bgColor: "bg-move-miss",
    glyph: "✗",
    symbol: "✗",
  },
  blunder: {
    label: "Blunder",
    color: "#e84855",
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
