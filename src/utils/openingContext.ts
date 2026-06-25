import type { AnalyzedMove } from "../types";

export interface OpeningEntry {
  moves: string[];
  name: string;
  ideas: string;
  threats?: string;
}

export const OPENINGS_DB: OpeningEntry[] = [
  { moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","a6"],
    name: "Sicilian Najdorf", ideas: "Black's ...a6 prepares ...e5 and prevents Bb5. One of the sharpest openings in chess.", threats: "White may launch the English Attack with Be3, f3, Qd2, and g4." },
  { moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3"],
    name: "Sicilian Open, Classical", ideas: "Both sides develop naturally before committing to a plan.", threats: "Black must decide between ...a6 (Najdorf), ...Nc6 (Classical), or ...e6 (Scheveningen)." },
  { moves: ["e4","c5","Nf3","d6","d4","cxd4","Nxd4"],
    name: "Sicilian Open", ideas: "White opens the center immediately, leading to sharp, tactical play.", threats: "Black's isolated d-pawn can become a target, but gains the semi-open c-file." },
  { moves: ["e4","c5","Nf3","Nc6","d4"],
    name: "Sicilian Open, Classical", ideas: "Natural development from both sides.", threats: "After cxd4, the position becomes very concrete — know your lines." },
  { moves: ["e4","c5","Nc3"], name: "Sicilian Closed", ideas: "White avoids the Open Sicilian and plays a quieter, strategic game.", threats: "White often plays f4 and aims for a kingside attack." },
  { moves: ["e4","c5","Nf3"], name: "Sicilian Defense", ideas: "Black fights for center control asymmetrically — avoiding symmetry for counterplay.", threats: "White's main decision: Open Sicilian (d4) or Anti-Sicilian systems." },
  { moves: ["e4","c5"], name: "Sicilian Defense", ideas: "The most popular response to 1.e4. Black creates an unbalanced game from move one.", threats: "Both sides must be well-prepared — the Sicilian has the deepest theory in chess." },
  { moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Be7"],
    name: "Ruy López, Closed", ideas: "The mainline — Black develops solidly and prepares ...b5, ...d6.", threats: "White will build center pressure with d4 and Re1. Black must time ...d5 carefully." },
  { moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4"],
    name: "Ruy López, Morphy Defense", ideas: "White retreats the bishop to maintain pressure on c6 and e5.", threats: "Black should play ...Nf6 and ...Be7 before ...b5 to avoid tactical tricks." },
  { moves: ["e4","e5","Nf3","Nc6","Bb5","a6"],
    name: "Ruy López, Morphy Defense", ideas: "...a6 forces White to decide the bishop's future. The most popular line.", threats: "Bxc6 (Exchange Variation) gives White a long-term structural advantage." },
  { moves: ["e4","e5","Nf3","Nc6","Bb5"],
    name: "Ruy López", ideas: "White pressures the e5 defender indirectly. Deep, strategic chess.", threats: "The Berlin Defense (...Nf6) leads to endgames. ...a6 is the classical answer." },
  { moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5","c3"],
    name: "Italian, Giuoco Piano", ideas: "White prepares d4 to build a strong pawn center.", threats: "After d4, the center opens — whoever is better developed will benefit." },
  { moves: ["e4","e5","Nf3","Nc6","Bc4","Nf6"],
    name: "Italian, Two Knights Defense", ideas: "Black develops aggressively, challenging e4 immediately.", threats: "The Fried Liver Attack (Ng5) is dangerous if Black plays ...d5 carelessly." },
  { moves: ["e4","e5","Nf3","Nc6","Bc4"],
    name: "Italian Game", ideas: "White aims the bishop at f7, the weakest square in Black's camp.", threats: "Sharp tactical lines like the Evans Gambit (b4) and Fried Liver lurk here." },
  { moves: ["e4","e6","d4","d5","Nc3","Nf6"], name: "French, Classical", ideas: "Black develops the knight and pressures e4.", threats: "White can play e5, locking the center and launching a kingside attack." },
  { moves: ["e4","e6","d4","d5","Nd2"], name: "French, Tarrasch", ideas: "White avoids the pin on Nc3 and keeps a flexible structure.", threats: "Black should challenge the center with ...c5 before White consolidates." },
  { moves: ["e4","e6","d4","d5","e5"], name: "French, Advance", ideas: "White gains space but the center becomes rigid.", threats: "Black attacks the d4-e5 chain with ...c5 and ...f6. Don't let White's space crush you." },
  { moves: ["e4","e6","d4","d5"], name: "French Defense", ideas: "Black establishes a solid central presence with ...d5.", threats: "The c8-bishop can become trapped. Plan ...b6 and ...Ba6, or ...Bd7-e8-g6." },
  { moves: ["e4","e6"], name: "French Defense", ideas: "Solid and strategic. Black builds a strong pawn structure.", threats: "The light-squared bishop on c8 is French's eternal problem — plan its development early." },
  { moves: ["e4","c6","d4","d5","Nc3","dxe4","Nxe4"], name: "Caro-Kann, Classical", ideas: "Black exchanges in the center and develops freely.", threats: "After ...Bf5 or ...Nd7, White must decide on a setup. The endgames favor Black." },
  { moves: ["e4","c6","d4","d5","e5"], name: "Caro-Kann, Advance", ideas: "White grabs space, similar to the French Advance.", threats: "Black must undermine the chain with ...c5 and ...e6. Don't be passive." },
  { moves: ["e4","c6","d4","d5"], name: "Caro-Kann Defense", ideas: "Black prepares ...d5 with pawn support, avoiding the French bishop problem.", threats: "White's main tries: 3.Nc3 (Classical), 3.e5 (Advance), 3.exd5 (Exchange)." },
  { moves: ["e4","c6"], name: "Caro-Kann Defense", ideas: "Solid and reliable. ...c6 prepares ...d5 with structural soundness.", threats: "Favored by players who enjoy endgames — Black's structure is often superior." },
  { moves: ["d4","d5","c4","e6","Nc3","Nf6","Bg5"], name: "Queen's Gambit Declined, Orthodox", ideas: "White pins the knight and pressures d5.", threats: "Black must be careful about ...Nbd7 vs ...Be7 — wrong order allows tactical shots." },
  { moves: ["d4","d5","c4","e6","Nc3"], name: "Queen's Gambit Declined", ideas: "A pillar of classical chess. Black holds the center solidly.", threats: "White will press on d5 and try to create a minority attack on the queenside." },
  { moves: ["d4","d5","c4","dxc4"], name: "Queen's Gambit Accepted", ideas: "Black takes the pawn and aims to hold it or develop freely.", threats: "White gets a strong center with e4. Black must not waste time defending c4." },
  { moves: ["d4","d5","c4","e6"], name: "Queen's Gambit Declined", ideas: "Black defends d5 solidly. Safe, respectable, deep theory.", threats: "Can become passive if Black doesn't find active counterplay with ...c5 or ...e5." },
  { moves: ["d4","d5","c4"], name: "Queen's Gambit", ideas: "White challenges the d5 pawn. A gambit in name — taking c4 is risky for Black.", threats: "If Black takes, White gets a big center. If Black declines, a strategic battle follows." },
  { moves: ["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6"], name: "King's Indian Defense", ideas: "Black allows White a big center, planning to strike with ...e5 or ...c5.", threats: "White's space advantage can be crushing if Black doesn't act fast. Time is critical." },
  { moves: ["d4","Nf6","c4","g6"], name: "King's Indian Setup", ideas: "Black fianchettoes, aiming for a flexible, fighting position.", threats: "White can go Classical (Nf3, Be2), Sämisch (f3), or Four Pawns Attack (f4)." },
  { moves: ["e4","e5","Nf3","Nc6"], name: "Open Game", ideas: "Classical development. Both sides fight for the center directly.", threats: "White chooses the opening character: Bb5 (Ruy López), Bc4 (Italian), d4 (Scotch)." },
  { moves: ["e4","e5","Nf3"], name: "King's Pawn, Open Game", ideas: "White develops and attacks e5 in one move.", threats: "Black's most common replies: ...Nc6 (classical), ...Nf6 (Petrov), ...d6 (Philidor)." },
  { moves: ["e4","e5"], name: "Open Game", ideas: "The most direct fight for the center. Classical and principled.", threats: "Both sides must develop quickly — falling behind in development is punished fast." },
  { moves: ["d4","d5"], name: "Closed Game", ideas: "Both sides anchor the center with d-pawns. Strategic, positional chess.", threats: "The character depends on White's next move: c4 (Queen's Gambit) or Nf3 (quieter)." },
  { moves: ["d4","Nf6","c4"], name: "Indian Defense", ideas: "Black fights for the center with pieces before pawns — a hypermodern approach.", threats: "White must decide their setup; Black's flexibility is both strength and challenge." },
  { moves: ["e4"], name: "King's Pawn Opening", ideas: "Direct, classical center control. Opens lines for the bishop and queen.", threats: "Black has many replies: ...e5 (classical), ...c5 (Sicilian), ...e6 (French), ...c6 (Caro-Kann)." },
  { moves: ["d4"], name: "Queen's Pawn Opening", ideas: "Solid center control. Leads to closed, strategic games.", threats: "Less immediately tactical than 1.e4, but the strategic depth runs just as deep." },
  { moves: ["c4"], name: "English Opening", ideas: "Hypermodern — controls d5 from the flank without committing the center.", threats: "Can transpose into many openings. Flexibility is the key feature." },
  { moves: ["Nf3"], name: "Réti Opening", ideas: "Develops before committing. Maximum flexibility for White.", threats: "Often transposes into d4 openings. Black should be ready for anything." },
];

export interface OpeningChapter {
  openingName: string;
  ideas?: string;
  startIdx: number;
  endIdx: number;
  leftBookIdx: number | null;
  bookPlyCount: number;
  throughLabel: string;
}

export function detectOpeningProgressive(
  moves: AnalyzedMove[],
  upToIdx: number
): OpeningEntry | null {
  const sans = moves.slice(0, upToIdx + 1).map((m) => m.san);
  let bestMatch: OpeningEntry | null = null;
  let bestLen = 0;
  for (const entry of OPENINGS_DB) {
    if (entry.moves.length > sans.length) continue;
    const matches = entry.moves.every((m, i) => m === sans[i]);
    if (matches && entry.moves.length > bestLen) {
      bestMatch = entry;
      bestLen = entry.moves.length;
    }
  }
  return bestMatch;
}

export function computeOpeningChapter(moves: AnalyzedMove[]): OpeningChapter | null {
  if (!moves.length) return null;

  let endIdx = -1;
  for (let i = 0; i < moves.length; i++) {
    if (moves[i].classification === "book" || moves[i].inOpeningBook) {
      endIdx = i;
    } else {
      break;
    }
  }
  if (endIdx < 0) return null;

  const opening = detectOpeningProgressive(moves, endIdx);
  const last = moves[endIdx];
  const throughLabel =
    last.color === "w"
      ? `${last.moveNumber}. ${last.san}`
      : `${last.moveNumber}...${last.san}`;

  return {
    openingName: opening?.name ?? "Known theory",
    ideas: opening?.ideas,
    startIdx: 0,
    endIdx,
    leftBookIdx: endIdx + 1 < moves.length ? endIdx + 1 : null,
    bookPlyCount: endIdx + 1,
    throughLabel,
  };
}

export function openingHintForMove(
  moveIdx: number,
  moves?: AnalyzedMove[]
): string | undefined {
  if (!moves || moveIdx < 0) return undefined;
  const opening = detectOpeningProgressive(moves, moveIdx);
  if (!opening) return undefined;
  const prev = moveIdx > 0 ? detectOpeningProgressive(moves, moveIdx - 1) : null;
  if (!prev || prev.name !== opening.name) {
    return `${opening.name}: ${opening.ideas}`;
  }
  return opening.name;
}

export function isLeftBookMove(moveIdx: number, moves: AnalyzedMove[]): boolean {
  const chapter = computeOpeningChapter(moves);
  return chapter?.leftBookIdx === moveIdx;
}

export function isInBookSpan(moveIdx: number, moves: AnalyzedMove[]): boolean {
  const chapter = computeOpeningChapter(moves);
  if (!chapter) return false;
  return moveIdx >= chapter.startIdx && moveIdx <= chapter.endIdx;
}

export function openingNameMentionsQueensGambit(name: string): boolean {
  return /queen'?s gambit/i.test(name);
}
