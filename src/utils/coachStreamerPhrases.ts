import { pickSeededLine, pickVariedLine } from "./coachVariety";
import { openingNameMentionsQueensGambit } from "./openingContext";

export interface BookPhraseContext {
  san: string;
  openingName: string;
  openingHint?: string;
  isFirstBookPly: boolean;
  isQueensGambit: boolean;
  moveIdx: number;
}

export interface LeftBookPhraseContext {
  san: string;
  openingName: string;
  moveIdx: number;
}

function bookPhrasePool(ctx: BookPhraseContext): string[] {
  const { san, openingName, openingHint, isFirstBookPly, isQueensGambit } = ctx;
  const hint = openingHint ?? openingName;

  const agadmator: string[] = isFirstBookPly
    ? [
        `Hello everyone! ${san} — we're in ${openingName} territory.`,
        `${san} kicks off ${openingName}. Both sides know this story.`,
        `And so ${san} — a very theoretical start in the ${openingName}.`,
      ]
    : [
        `${san} — still textbook ${openingName}.`,
        `And ${san} keeps us in known ${openingName} waters.`,
        `${san} — grandmasters have played this in ${openingName} for decades.`,
      ];

  const gotham: string[] = isFirstBookPly
    ? [
        `${san} — chef's kiss, classic ${openingName}.`,
        `We love to see it: ${san} in the ${openingName}.`,
        `${san} — the ${openingName} your coach made you drill.`,
        `Huge brain energy: ${san} opens the ${openingName}.`,
      ]
    : [
        `${san} — still mainline ${openingName}. You studied this, right?`,
        `We take those! ${san} is pure ${openingName} theory.`,
        `${san} — textbook ${openingName}. No creativity required yet.`,
        `${san} — the rook approves of this ${openingName} line.`,
      ];

  const botez: string[] = isQueensGambit
    ? isFirstBookPly
      ? [
          `${san} — Queen's Gambit theory. Not the Botez Gambit — the real one.`,
          `${san} — respectable ${openingName}. Keep the queen on the board.`,
          `${san} — ${hint}. Stream-safe classical chess.`,
        ]
      : [
          `${san} — still in the real Queen's Gambit. Queen stays home.`,
          `${san} — ${openingName} theory. No Botez Gambit today.`,
          `${san} — calm, classical ${openingName}. Andrea would approve.`,
        ]
    : isFirstBookPly
      ? [
          `${san} — ${hint}. Theory vibes only.`,
          `${san} — ${openingName}: classical, stream-friendly chess.`,
          `${san} — we're in ${openingName}. Chat can relax for a moment.`,
        ]
      : [
          `${san} — still in ${openingName} theory. Nothing spicy yet.`,
          `${san} — ${openingName} mainline. Both sides have prep here.`,
          `${san} — known territory in the ${openingName}.`,
        ];

  return [...agadmator, ...gotham, ...botez];
}

function leftBookPhrasePool(ctx: LeftBookPhraseContext): string[] {
  const { san, openingName } = ctx;
  return [
    `${san} — and we're out of book! First independent decision in the ${openingName}.`,
    `Theory ends here. ${san} takes the ${openingName} into your own hands.`,
    `${san} — hello novelty territory. The ${openingName} prep runs out here.`,
    `Stop the prep! ${san} leaves known ${openingName} lines.`,
    `${san} — Agadmator would say we're out of book. Your move now.`,
    `${san} — the ${openingName} textbook closes here. Time to think.`,
    `${san} — no more memorization. The ${openingName} fight gets personal.`,
    `${san} — left theory in the ${openingName}. Calculation beats prep now.`,
  ];
}

export function pickBookCoachLine(
  ctx: BookPhraseContext,
  seed: number,
  trackUsage: boolean
): string {
  const pool = bookPhrasePool(ctx);
  return trackUsage ? pickVariedLine(seed, pool) : pickSeededLine(seed, pool);
}

export function pickLeftBookCoachLine(
  ctx: LeftBookPhraseContext,
  seed: number,
  trackUsage: boolean
): string {
  const pool = leftBookPhrasePool(ctx);
  return trackUsage ? pickVariedLine(seed, pool) : pickSeededLine(seed, pool);
}

export function buildBookPhraseContext(
  san: string,
  moveIdx: number,
  openingName: string,
  openingHint?: string
): BookPhraseContext {
  return {
    san,
    openingName,
    openingHint,
    isFirstBookPly: moveIdx === 0,
    isQueensGambit: openingNameMentionsQueensGambit(openingName),
    moveIdx,
  };
}

/** Short style note for Gemini on book / left-book plies */
export function streamerCoachStyleNote(
  classification: string | null | undefined,
  isLeftBook: boolean
): string | undefined {
  if (isLeftBook) {
    return `Tone: theory just ended — energetic but clear (think Gotham's "stop the game" moment or Agadmator's "out of book"). One short nod to streaming culture max; focus on the chess decision.`;
  }
  if (classification === "book") {
    return `Tone: still in opening theory. Occasional light nods to chess streaming culture are welcome (Agadmator's calm narration, Gotham's "we take those"/"huge brain", Botez sisters' humor) — at most one nod per comment, never forced. For Queen's Gambit lines only: gentle "Botez Gambit" joke means the real gambit, not hanging the queen.`;
  }
  return undefined;
}
