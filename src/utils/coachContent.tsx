import React, { useMemo } from "react";
import type { AnalyzedMove } from "../types";
import { getPositionAwareMoveComment } from "./coachPositionContext";

export type CoachMood =
  | "brilliant"
  | "blunder"
  | "excellent"
  | "great"
  | "mistake"
  | "inaccuracy"
  | "good"
  | "book"
  | "quiet"
  | "neutral";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CLASSIFIED = new Set([
  "brilliant",
  "great",
  "excellent",
  "mistake",
  "blunder",
  "inaccuracy",
  "good",
  "best",
  "book",
]);

// ── Opening detection ────────────────────────────────────────────────────────
const OPENINGS: { pattern: RegExp; name: string; flavor: string }[] = [
  { pattern: /Nf6.*d4.*Bb4/, name: "Nimzo-Indian Defense", flavor: "Black pins the knight on c3, putting immediate pressure on White's d4 pawn. One of the most respected and theoretically rich defenses." },
  { pattern: /e4.*c5/, name: "Sicilian Defense", flavor: "The most popular reply to 1.e4. Black fights for the center asymmetrically — sharp, complex, and unbalanced. A fighting player's choice." },
  { pattern: /e4.*e6/, name: "French Defense", flavor: "Solid and somewhat cramped. Black accepts a passive bishop on c8 but gets a very firm pawn structure. Positional, patient chess." },
  { pattern: /e4.*c6/, name: "Caro-Kann Defense", flavor: "Solid and reliable. Black builds a strong pawn chain without the French bishop problem. Favored by players who like endgames." },
  { pattern: /e4.*e5.*Nf3.*Nc6.*Bb5/, name: "Ruy López", flavor: "One of the oldest openings. White pressures Black's e5 support immediately. Deep, deep theory — games here can go 40 moves of preparation." },
  { pattern: /e4.*e5.*Nf3.*Nc6.*Bc4/, name: "Italian Game", flavor: "Classical development toward the center. White eyes the f7 pawn early. Sharp lines like the Evans Gambit lurk here." },
  { pattern: /e4.*e5.*Nf3.*f5/, name: "Latvian Gambit", flavor: "A wild, aggressive counter-gambit. Black goes for the throat immediately. Objectively dubious but dangerous if you don't know the lines." },
  { pattern: /e4.*e5/, name: "Open Game", flavor: "The classical 1.e4 e5. Symmetrical and direct — both sides fight for the center from move one. Huge amount of theory." },
  { pattern: /d4.*d5.*c4.*e6/, name: "Queen's Gambit Declined", flavor: "A pillar of classical chess. Black holds the center solidly. The go-to for players who want a safe, respectable position." },
  { pattern: /d4.*d5.*c4/, name: "Queen's Gambit", flavor: "White offers a pawn to control the center. If accepted, White gets rapid development. One of the most studied openings ever." },
  { pattern: /d4.*Nf6.*c4.*g6/, name: "King's Indian Defense", flavor: "Black lets White build a center, then strikes back with …e5 or …c5. Hyper-aggressive counter-play. Kasparov's weapon of choice." },
  { pattern: /d4.*Nf6.*c4/, name: "Indian Defense", flavor: "Black avoids early pawn exchanges and fights for center control with pieces. Rich, complex territory." },
  { pattern: /c4/, name: "English Opening", flavor: "A hypermodern flank opening. White controls d5 from afar before committing pawns. Flexible and tricky — many transpositions." },
  { pattern: /Nf3/, name: "Réti Opening", flavor: "Hypermodern — White develops before committing the center. Can transpose into many things. A tool for players who want flexibility." },
  { pattern: /d4/, name: "Queen's Pawn Game", flavor: "Solid and classical. White stakes a claim in the center with the d-pawn. Leads to a wide variety of structures." },
  { pattern: /e4/, name: "King's Pawn Opening", flavor: "The most direct fight for the center. Sharp, tactical, and complex. The traditional choice of attacking players." },
];

function detectOpening(moves: AnalyzedMove[]): { name: string; flavor: string } | null {
  const s = moves.slice(0, 10).map(m => m.san).join(" ");
  for (const o of OPENINGS) {
    if (o.pattern.test(s)) return { name: o.name, flavor: o.flavor };
  }
  return null;
}

// ── Per-move opening commentary ───────────────────────────────────────────────
// Keyed by SAN — what this specific move does in opening theory
const MOVE_COMMENTS: Record<string, string[]> = {
  "e4":  ["Staking a claim in the center. The most popular first move — direct and principled.", "Fights for the center immediately. Everything flows from here."],
  "e5":  ["Matching White's center claim. The classical symmetrical response.", "Black counters in the center. Sets up an open, direct fight."],
  "d4":  ["Solid center control with the d-pawn. Leads to closed, strategic games.", "The Queen's Pawn — less sharp than e4 but equally deep."],
  "d5":  ["Black establishes a strong central foothold. Fights for equality directly.", "Countering in the center. Classical and principled."],
  "Nf3": ["Developing the knight toward the center, eyeing e5. Also prepares castling.", "A flexible developing move — doesn't commit the center yet."],
  "Nc6": ["Developing the knight while defending e5. The most natural move.", "Active development. The knight puts pressure on d4 and e5."],
  "Nf6": ["Attacking e4 immediately — active development with tempo.", "The most popular Black knight development. Fights for the center from the start."],
  "Bc4": ["The Italian bishop — eyes the f7 square and the center. Sharp possibilities ahead.", "Developing to an active diagonal. The Evans Gambit and many sharp lines start here."],
  "Bb5": ["The Ruy López bishop — pressuring the e5 defender on c6.", "Pins the knight indirectly. White questions Black's center right away."],
  "Bc5": ["Black develops the bishop actively, eyeing f2 and the center.", "A fighting reply — Black develops with tempo and counter-pressure."],
  "c3":  ["Prepares d4 to build a strong pawn center. The Italian Giuoco Pianissimo.", "Quiet but purposeful — White prepares to expand with d4."],
  "c4":  ["The English Opening move. Controls d5 from afar — hypermodern approach.", "Challenges the center from the flank. Very flexible — many transpositions possible."],
  "c5":  ["The Sicilian counter — Black fights for d4 asymmetrically rather than mirroring.", "Sharp and unbalanced. Black avoids symmetry and creates complex counter-play."],
  "c6":  ["The Caro-Kann setup — preparing d5 with a solid pawn structure.", "Prepares a strong center advance. Solid and less committal than …e6."],
  "e6":  ["The French/QGD setup — solid but limits the c8 bishop.", "Solid central support. Black accepts some passivity for structural soundness."],
  "d6":  ["Preparing …Nf6 or …e5 advance. Flexible and solid.", "A waiting move that keeps options open — King's Indian or Pirc territory."],
  "g6":  ["Fianchetto setup — the bishop will go to g7, controlling the long diagonal.", "Hypermodern. Black lets White take the center, plans to strike back later."],
  "Bg4": ["Pinning the Nf3 — Black fights against White's central control indirectly.", "An aggressive pin. Creates immediate tension and pressures the center."],
  "Bb4": ["Pinning the Nc3 — the Nimzo-Indian idea. Pressures White's d4 support.", "The Nimzo-Indian pin. Creates long-term structural questions for White."],
  "Be7": ["Solid and safe bishop development. Prepares kingside castling.", "A quiet but reliable move. Keeps the position solid."],
  "Be2": ["Solid bishop development, giving up the bishop pair ambition for solidity.", "A modest but solid square. Prepares castling and avoids complications."],
  "Bg2": ["The fianchetto bishop — dominates the long diagonal from g2.", "Powerful fianchetto. The bishop on g2 can be a monster in the endgame."],
  "Bg7": ["The fianchetto bishop on g7 — a powerful long-diagonal piece.", "Controls the long diagonal. This bishop often becomes the key piece in the game."],
  "O-O": ["Castling kingside — the king finds safety before the middlegame battle.", "King safety achieved. Now the rook is active and development is nearly complete."],
  "O-O-O": ["Queenside castling — the king goes to the queenside, rook becomes active.", "Aggressive kingside-queenside castle setup. Mutual attacks may follow."],
  "d3":  ["Solid and flexible — supports e4, prepares bishop development. The Slow Italian.", "The quiet system. White avoids early confrontation and develops methodically."],
  "Nc3": ["Developing the knight to its ideal central square, supporting e4.", "Active knight development. Controls d5 and supports the center."],
  "a3":  ["The Anderssen move in the Ruy López — prevents …Bb4 pin.", "Prophylaxis. Prevents Black from pinning with …Bb4."],
  "a6":  ["The Morphy Defense in the Ruy López — forces White's bishop to declare.", "Challenges the Bb5 immediately. One of the most popular moves in chess history."],
  "exd5": ["Capturing in the center — opens the position and changes the pawn structure.", "The exchange. Now the structure is defined for both sides."],
  "cxd5": ["Recapturing to maintain pawn tension or open the c-file.", "Keeps central tension. The resulting structure shapes the whole game."],
  "Nxe5": ["Winning a pawn — but requires careful handling of the follow-up.", "A sharp capture. Must know what comes next — there are forced lines here."],
  "Re1":  ["Developing the rook — eyes the open e-file and supports the center.", "The rook becomes active. Often prepares future central operations."],
  "Qd3":  ["Centralizing the queen — active and flexible.", "The queen enters the game. Threatens ideas on both flanks."],
  "Qe2":  ["A common queen move — supports e4 and prepares Re1.", "Avoids early queen exchanges and keeps the position flexible."],
  "h3":   ["A prophylactic move — prevents …Bg4 pin on the knight.", "Stops the bishop pin. Keeps the knight free to maneuver."],
  "h6":   ["Prevents …Bg5 — a useful prophylactic move on Black's side.", "Stops White's bishop from pinning the knight. Gives the king luft too."],
  "Bf4":  ["Active bishop development — controls e5 and d6.", "A fighting bishop placement. Applies pressure to Black's position."],
  "Nbd2": ["A flexible knight development — avoids blocking the c-pawn.", "Keeps the c-file option open. The knight can go to f1 or b3 next."],
  "Nd2":  ["Rerouting the knight — heading for f1, e3 or b3.", "A maneuver. The knight is going to a better square."],
  "Nge2": ["Unusual knight development — keeps the f-pawn mobile.", "Sidesteps normal development to preserve flexibility."],
  "f4":   ["An aggressive pawn advance — claiming space and preparing attack.", "Kingside ambitions. White plays for direct attacking chances."],
  "f5":   ["Sharpening the game — closing the center or launching kingside attack.", "A committal pawn advance. The game becomes sharp quickly."],
};

function getMoveComment(san: string, openingName: string | null): string | null {
  // Try exact match first
  if (MOVE_COMMENTS[san]) return pick(MOVE_COMMENTS[san]);
  // Try strip check/capture symbols
  const base = san.replace(/[+#x]/g, "");
  if (MOVE_COMMENTS[base]) return pick(MOVE_COMMENTS[base]);
  // Fallback: contextual generic with opening name if available
  if (openingName) return pick([
    `A known line in the ${openingName}. Theory runs deep here.`,
    `${san} is well-established in the ${openingName}.`,
    `This variation of the ${openingName} has been played at the highest level.`,
  ]);
  return null;
}

// ── Move character detection ─────────────────────────────────────────────────
function isCapture(san: string) { return san.includes("x"); }
function isCheck(san: string) { return san.includes("+"); }
function isMate(san: string) { return san.includes("#"); }
function isCastle(san: string) { return san.startsWith("O-"); }
function isPawnPush(san: string) { return /^[a-h][1-8]/.test(san); }
function isPromotion(san: string) { return san.includes("="); }
function isQuietMove(san: string) { return !isCapture(san) && !isCheck(san) && !isCastle(san) && /^[A-Z]/.test(san); }

// Detect if the eval is extremely close (zugzwang-like) and it's likely a critical waiting move
function likelyZugzwang(move: AnalyzedMove): boolean {
  if (!move.evalBefore || !move.evalAfter) return false;
  const cp = move.evalBefore.cp ?? 0;
  const after = move.evalAfter.cp ?? 0;
  // Eval flips significantly even for what looks like a calm move
  return Math.abs(cp) < 80 && Math.abs(after - cp) > 120 && !isCapture(move.san) && !isCheck(move.san);
}

// ── Content builder ──────────────────────────────────────────────────────────
export interface CoachContent {
  mood: CoachMood;
  color: string;
  lines: string[];
}

export function buildCoachContent(
  move: AnalyzedMove,
  allMoves: AnalyzedMove[],
  moveIdx: number
): CoachContent {
  const c = move.classification;

  if (c && CLASSIFIED.has(c)) {
    const opening = detectOpening(allMoves);
    const line = getPositionAwareMoveComment(
      move,
      moveIdx,
      opening ? `${opening.name} — ${opening.flavor}` : undefined,
      false
    );
    if (line) {
      const moodColors: Partial<Record<string, { mood: CoachMood; color: string }>> = {
        brilliant: { mood: "brilliant", color: "#1baca6" },
        great: { mood: "great", color: "#4a7eb8" },
        excellent: { mood: "excellent", color: "#5c9e47" },
        blunder: { mood: "blunder", color: "#ca3c3c" },
        mistake: { mood: "mistake", color: "#e07b39" },
        inaccuracy: { mood: "inaccuracy", color: "#e6c84a" },
        good: { mood: "good", color: "#6daa6d" },
        book: { mood: "book", color: "#a88865" },
        best: { mood: "good", color: "#6daa6d" },
      };
      const meta = moodColors[c] ?? { mood: "neutral" as CoachMood, color: "#888" };
      return { ...meta, lines: [line] };
    }
  }

  // Null classification — analyze character of the move
  // Zugzwang-like
  if (likelyZugzwang(move)) return {
    mood: "quiet", color: "#9b7fd4",
    lines: [pick([
      `${move.san} — look at how the eval shifts on what looks like a quiet move. Classic zugzwang. Every move costs something here.`,
      `Fascinating. ${move.san} in what looks like a normal position — but whoever has to move next is in trouble. That's zugzwang.`,
    ])],
  };

  // Promotion
  if (isPromotion(move.san)) return {
    mood: "quiet", color: "#6daa6d",
    lines: [pick([
      `That pawn made it! ${move.san} — endgame technique paying off.`,
      `${move.san} — promotion. That's what all that endgame work was for.`,
      `Promotion with ${move.san}. The pawn runner did its job.`,
    ])],
  };

  // Checkmate
  if (isMate(move.san)) return {
    mood: "brilliant", color: "#1baca6",
    lines: [pick([
      `That's mate! ${move.san} — well played. Game over.`,
      `Checkmate with ${move.san}. Clean finish.`,
      `${move.san} — and it's over. Nice.`,
    ])],
  };

  // Check
  if (isCheck(move.san)) return {
    mood: "quiet", color: "#e6c84a",
    lines: [pick([
      `${move.san} — check. Keep that king uncomfortable.`,
      `Check with ${move.san}. Always worth asking what the king has to deal with next.`,
      `${move.san}+ — on the run. See if there's a way to keep the pressure going.`,
    ])],
  };

  // Castling
  if (isCastle(move.san)) return {
    mood: "quiet", color: "#6daa6d",
    lines: [pick([
      `Good — king tucked away. Now the real game starts.`,
      `Castles. Safety sorted. Let's see how the middlegame shapes up.`,
      `${move.san} — sensible. Better the king is off the center before things get sharp.`,
    ])],
  };

  // Capture
  if (isCapture(move.san)) return {
    mood: "quiet", color: "#9b8860",
    lines: [pick([
      `${move.san} — taking. Worth checking the recapture works out cleanly.`,
      `Exchange with ${move.san}. Are we happy with what's left on the board?`,
      `${move.san} — material changes. Pause and see whose pieces are better after this.`,
    ])],
  };

  // Quiet piece move
  if (isQuietMove(move.san)) return {
    mood: "quiet", color: "#7a9ec4",
    lines: [pick([
      `${move.san} — quiet, but there's a point to it. What is it setting up?`,
      `${move.san}. Improving the piece. Nothing dramatic, just good chess habits.`,
      `Interesting — ${move.san}. That move is either preparing something or stopping something.`,
      `${move.san}. A thinking move. Probably more going on here than it looks.`,
    ])],
  };

  // Pawn push
  if (isPawnPush(move.san)) return {
    mood: "quiet", color: "#9b8860",
    lines: [pick([
      `${move.san} — pawn moves change the structure permanently. Worth thinking about what it gives and takes.`,
      `${move.san}. Claiming space. Pawns don't go backwards so this matters.`,
      `${move.san} — interesting pawn decision. Changes the whole character of the position.`,
    ])],
  };

  // Generic fallback
  return {
    mood: "neutral", color: "#888",
    lines: [pick([
      `${move.san}. Let's see where this goes.`,
      `${move.san} — watching how things develop.`,
      `Interesting. ${move.san}. Curious to see the follow-up.`,
    ])],
  };
}

const INSIGHT_MOODS = new Set<CoachMood>(["brilliant", "blunder", "excellent", "great"]);

export function shouldShowCoachInsight(content: CoachContent): boolean {
  if (!content.lines.length) return false;
  return INSIGHT_MOODS.has(content.mood);
}

export interface MoveCommentaryProps {
  move: AnalyzedMove | null;
  moveIdx: number;
  moves?: AnalyzedMove[];
}

export const MoveCommentary: React.FC<MoveCommentaryProps> = ({
  move,
  moveIdx,
  moves = [],
}) => {
  const content = useMemo<CoachContent | null>(() => {
    if (!move) return null;
    return buildCoachContent(move, moves, moveIdx);
  }, [moveIdx, move, moves]);

  if (!content || !move) {
    return (
      <div className="px-3 py-2 text-xs text-chess-muted italic opacity-40">
        Select a move to see commentary.
      </div>
    );
  }

  if (shouldShowCoachInsight(content)) return null;
  if (!content.lines.length) return null;

  const { color, lines, mood } = content;

  const tagLabel: Partial<Record<CoachMood, string>> = {
    book: "📖 Theory",
    quiet: "🔍 Insight",
    inaccuracy: "⚠ Inaccuracy",
    mistake: "❌ Mistake",
    good: "✓ Good",
  };

  return (
    <div
      key={moveIdx}
      className="px-3 py-2 border-t border-chess-border"
      style={{ animation: "genieTextIn 0.25s ease-out forwards" }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-semibold" style={{ color }}>
          {move.san}
        </span>
        {tagLabel[mood] && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: `${color}18`, color }}
          >
            {tagLabel[mood]}
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-chess-subtext">
        {lines[0]}
      </p>
      {lines[1] && (
        <p className="text-xs leading-relaxed text-chess-muted mt-1 italic">
          {lines[1]}
        </p>
      )}
    </div>
  );
};
