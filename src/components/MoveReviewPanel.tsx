import React, { useState, useEffect, useMemo, useRef } from "react";
import { Chess } from "chess.js";
import type { AnalyzedMove, EvalResult } from "../types";
import { getMeta } from "../utils/classificationMeta";
import { ClassificationIcon } from "./ClassificationIcon";
import { CoachIcon } from "./CoachIcon";
import { evaluateFen } from "../engine/evaluationService";

export interface MoveReviewPanelProps {
  move: AnalyzedMove | null;
  moveIdx: number;
  moves?: AnalyzedMove[];
  onContinuationFen?: (fen: string | null) => void;
  onContinuationEval?: (eval_: EvalResult | null) => void;
  onContinuationActive?: (active: boolean) => void;
  onContinuationArrow?: (arrow: { from: string; to: string } | null) => void;
}

// ── Opening database with progressive names ──────────────────────────────────
interface OpeningEntry {
  moves: string[];       // SAN sequence to match
  name: string;
  ideas: string;         // Why this variation is played
  threats?: string;      // What to watch out for
}

const OPENINGS_DB: OpeningEntry[] = [
  // Sicilian lines
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

  // Ruy López
  { moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Be7"],
    name: "Ruy López, Closed", ideas: "The mainline — Black develops solidly and prepares ...b5, ...d6.", threats: "White will build center pressure with d4 and Re1. Black must time ...d5 carefully." },
  { moves: ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4"],
    name: "Ruy López, Morphy Defense", ideas: "White retreats the bishop to maintain pressure on c6 and e5.", threats: "Black should play ...Nf6 and ...Be7 before ...b5 to avoid tactical tricks." },
  { moves: ["e4","e5","Nf3","Nc6","Bb5","a6"],
    name: "Ruy López, Morphy Defense", ideas: "...a6 forces White to decide the bishop's future. The most popular line.", threats: "Bxc6 (Exchange Variation) gives White a long-term structural advantage." },
  { moves: ["e4","e5","Nf3","Nc6","Bb5"],
    name: "Ruy López", ideas: "White pressures the e5 defender indirectly. Deep, strategic chess.", threats: "The Berlin Defense (...Nf6) leads to endgames. ...a6 is the classical answer." },

  // Italian
  { moves: ["e4","e5","Nf3","Nc6","Bc4","Bc5","c3"],
    name: "Italian, Giuoco Piano", ideas: "White prepares d4 to build a strong pawn center.", threats: "After d4, the center opens — whoever is better developed will benefit." },
  { moves: ["e4","e5","Nf3","Nc6","Bc4","Nf6"],
    name: "Italian, Two Knights Defense", ideas: "Black develops aggressively, challenging e4 immediately.", threats: "The Fried Liver Attack (Ng5) is dangerous if Black plays ...d5 carelessly." },
  { moves: ["e4","e5","Nf3","Nc6","Bc4"],
    name: "Italian Game", ideas: "White aims the bishop at f7, the weakest square in Black's camp.", threats: "Sharp tactical lines like the Evans Gambit (b4) and Fried Liver lurk here." },

  // French
  { moves: ["e4","e6","d4","d5","Nc3","Nf6"], name: "French, Classical", ideas: "Black develops the knight and pressures e4.", threats: "White can play e5, locking the center and launching a kingside attack." },
  { moves: ["e4","e6","d4","d5","Nd2"], name: "French, Tarrasch", ideas: "White avoids the pin on Nc3 and keeps a flexible structure.", threats: "Black should challenge the center with ...c5 before White consolidates." },
  { moves: ["e4","e6","d4","d5","e5"], name: "French, Advance", ideas: "White gains space but the center becomes rigid.", threats: "Black attacks the d4-e5 chain with ...c5 and ...f6. Don't let White's space crush you." },
  { moves: ["e4","e6","d4","d5"], name: "French Defense", ideas: "Black establishes a solid central presence with ...d5.", threats: "The c8-bishop can become trapped. Plan ...b6 and ...Ba6, or ...Bd7-e8-g6." },
  { moves: ["e4","e6"], name: "French Defense", ideas: "Solid and strategic. Black builds a strong pawn structure.", threats: "The light-squared bishop on c8 is French's eternal problem — plan its development early." },

  // Caro-Kann
  { moves: ["e4","c6","d4","d5","Nc3","dxe4","Nxe4"], name: "Caro-Kann, Classical", ideas: "Black exchanges in the center and develops freely.", threats: "After ...Bf5 or ...Nd7, White must decide on a setup. The endgames favor Black." },
  { moves: ["e4","c6","d4","d5","e5"], name: "Caro-Kann, Advance", ideas: "White grabs space, similar to the French Advance.", threats: "Black must undermine the chain with ...c5 and ...e6. Don't be passive." },
  { moves: ["e4","c6","d4","d5"], name: "Caro-Kann Defense", ideas: "Black prepares ...d5 with pawn support, avoiding the French bishop problem.", threats: "White's main tries: 3.Nc3 (Classical), 3.e5 (Advance), 3.exd5 (Exchange)." },
  { moves: ["e4","c6"], name: "Caro-Kann Defense", ideas: "Solid and reliable. ...c6 prepares ...d5 with structural soundness.", threats: "Favored by players who enjoy endgames — Black's structure is often superior." },

  // Queen's Gambit
  { moves: ["d4","d5","c4","e6","Nc3","Nf6","Bg5"], name: "Queen's Gambit Declined, Orthodox", ideas: "White pins the knight and pressures d5.", threats: "Black must be careful about ...Nbd7 vs ...Be7 — wrong order allows tactical shots." },
  { moves: ["d4","d5","c4","e6","Nc3"], name: "Queen's Gambit Declined", ideas: "A pillar of classical chess. Black holds the center solidly.", threats: "White will press on d5 and try to create a minority attack on the queenside." },
  { moves: ["d4","d5","c4","dxc4"], name: "Queen's Gambit Accepted", ideas: "Black takes the pawn and aims to hold it or develop freely.", threats: "White gets a strong center with e4. Black must not waste time defending c4." },
  { moves: ["d4","d5","c4","e6"], name: "Queen's Gambit Declined", ideas: "Black defends d5 solidly. Safe, respectable, deep theory.", threats: "Can become passive if Black doesn't find active counterplay with ...c5 or ...e5." },
  { moves: ["d4","d5","c4"], name: "Queen's Gambit", ideas: "White challenges the d5 pawn. A gambit in name — taking c4 is risky for Black.", threats: "If Black takes, White gets a big center. If Black declines, a strategic battle follows." },

  // King's Indian
  { moves: ["d4","Nf6","c4","g6","Nc3","Bg7","e4","d6"], name: "King's Indian Defense", ideas: "Black allows White a big center, planning to strike with ...e5 or ...c5.", threats: "White's space advantage can be crushing if Black doesn't act fast. Time is critical." },
  { moves: ["d4","Nf6","c4","g6"], name: "King's Indian Setup", ideas: "Black fianchettoes, aiming for a flexible, fighting position.", threats: "White can go Classical (Nf3, Be2), Sämisch (f3), or Four Pawns Attack (f4)." },

  // Generic
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

// Find the best matching opening for the current move sequence
function detectOpeningProgressive(moves: AnalyzedMove[], upToIdx: number): OpeningEntry | null {
  const sans = moves.slice(0, upToIdx + 1).map(m => m.san);
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

// Context-aware commentary that helps learners understand WHY, not just WHAT
function buildComment(move: AnalyzedMove, moveIdx?: number, moves?: AnalyzedMove[]): string | null {
  const c = move.classification;
  if (!c) return null;
  const { san, bestMoveSan: best, deltaE, isSacrifice, evalBefore, evalAfter } = move;
  const loss = Math.abs(deltaE);
  const lossStr = loss >= 0.1 ? `${loss.toFixed(1)} pawns` : null;

  // Eval context
  const cpAfter = evalAfter?.cp ?? 0;
  const playerCp = move.color === "w" ? cpAfter : -cpAfter;
  const mateIn = evalAfter?.mate;
  const wasWinning = (() => {
    const cpB = evalBefore?.cp ?? 0;
    return (move.color === "w" ? cpB : -cpB) > 200;
  })();

  switch (c) {
    case "brilliant":
      return isSacrifice
        ? `${san}!! A sound sacrifice — you gave up material for a lasting advantage the engine confirms. Study this pattern.`
        : `${san}!! A creative best move in a critical position — the engine's top choice when it mattered.`;

    case "great":
      return `${san}! A critical move — ${
        playerCp < -100
          ? "this is the best defense under real pressure. Finding this in a losing position shows resilience."
          : "this capitalizes perfectly on the opponent's error. Recognizing the moment to strike is a key skill."
      }`;

    case "best":
      return `${san} is the engine's top choice. ${
        mateIn !== undefined && mateIn > 0 ? `Mate in ${Math.abs(mateIn)} — the winning path is found.`
        : wasWinning ? "Converting a winning position cleanly — no unnecessary risks."
        : playerCp > 100 ? "This builds the advantage precisely."
        : playerCp < -100 ? "The best try in a difficult position — making the opponent prove their advantage."
        : "Exact move in an equal position — good understanding of the demands here."
      }`;

    case "excellent":
      return `${san} is nearly perfect${lossStr ? ` (only ~${lossStr} from engine best)` : ""}. ${
        best && best !== san ? `The engine slightly preferred ${best}, but the difference is minimal.`
        : "Practically indistinguishable from the top engine line."
      }`;

    case "good":
      return `${san} is reasonable${lossStr ? ` (~${lossStr} from the best move)` : ""}. ${
        best ? `${best} was slightly more accurate — ${playerCp > 100 ? "tightening the grip on the advantage" : playerCp < -100 ? "putting up more resistance" : "maintaining more tension"}.`
        : "Solid, but there was a slightly sharper option."
      }`;

    case "book": {
      // Progressive opening commentary
      if (moves && moveIdx !== undefined) {
        const opening = detectOpeningProgressive(moves, moveIdx);
        if (opening) {
          // Check if this is a NEW opening name vs the previous move
          const prevOpening = moveIdx > 0 ? detectOpeningProgressive(moves, moveIdx - 1) : null;
          const nameChanged = !prevOpening || prevOpening.name !== opening.name;
          const isFirstBook = moveIdx === 0 || moves[moveIdx - 1]?.classification !== "book";

          if (isFirstBook || nameChanged) {
            // Announce the opening
            return `📖 ${opening.name}. ${opening.ideas}${opening.threats ? ` ⚠ ${opening.threats}` : ""}`;
          } else {
            // Continuing in same opening — just explain the move's role
            return `${san} — ${opening.name}. ${opening.threats ? `Watch for: ${opening.threats}` : opening.ideas}`;
          }
        }
      }
      return `${san} — book move. Still in known theory.`;
    }

    case "inaccuracy":
      return `${san} lets some advantage slip${lossStr ? ` (~${lossStr})` : ""}. ${
        best ? `${best} was more precise — `
          + (playerCp > 0 ? "it keeps the initiative and doesn't give the opponent counterplay."
            : "it creates more practical problems for the opponent to solve.")
        : "The position is still playable, but the opponent's task just got easier."
      } Tip: Look for what your opponent's best response is before committing.`;

    case "mistake":
      return `${san} is a clear error${lossStr ? ` (costs ~${lossStr})` : ""}. ${
        best ? `${best} was the right move — `
          + (mateIn !== undefined ? "it maintains the mating attack."
            : wasWinning ? "it keeps the conversion straightforward."
            : playerCp < -200 ? "it was the only way to stay in the game."
            : `it holds the balance that ${san} throws away.`)
        : "The evaluation swings significantly here."
      } Ask yourself: what does my opponent threaten after this move?`;

    case "blunder":
      return `${san} is a game-changing error${lossStr ? ` (loses ~${lossStr})` : ""}! ${
        best ? `${best} was essential — `
          + (mateIn !== undefined && mateIn < 0 ? "now there's a forced mate."
            : wasWinning ? "a winning position has been thrown away."
            : playerCp < -300 ? "the position goes from playable to lost."
            : "this oversight changes the entire game.")
        : "This is the kind of move to circle and study — understanding why it fails builds pattern recognition."
      }`;

    default:
      return null;
  }
}

// ── Continuation step-through ────────────────────────────────────────────────
interface ContinuationViewerProps {
  firstMove: string;
  line: string[];
  startFen: string;
  accentColor?: string;
  label?: string;
  onFenChange?: (fen: string | null) => void;
  onEvalChange?: (eval_: EvalResult | null) => void;
  onActiveChange?: (active: boolean) => void;
  onArrowChange?: (arrow: { from: string; to: string } | null) => void;
}

// Pre-compute UCIs from SANs given a starting FEN
function computeUcis(startFen: string, sans: string[]): string[] {
  const ucis: string[] = [];
  try {
    const chess = new Chess(startFen);
    for (const san of sans) {
      const result = chess.move(san);
      if (!result) break;
      ucis.push(result.from + result.to);
    }
  } catch { /* ignore */ }
  return ucis;
}

const ContinuationViewer: React.FC<ContinuationViewerProps> = ({
  firstMove, line, startFen, accentColor = "#6daa6d", label = "Best continuation",
  onFenChange, onEvalChange, onActiveChange, onArrowChange,
}) => {
  const allMoves = [firstMove, ...line];
  const [step, setStep] = useState(0);
  const evalCache = useRef<Map<string, EvalResult>>(new Map());
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFenChangeRef = useRef(onFenChange);
  const onEvalChangeRef = useRef(onEvalChange);
  const onArrowChangeRef = useRef(onArrowChange);
  const onActiveChangeRef = useRef(onActiveChange);
  const continuationActiveRef = useRef(false);
  onFenChangeRef.current = onFenChange;
  onEvalChangeRef.current = onEvalChange;
  onArrowChangeRef.current = onArrowChange;
  onActiveChangeRef.current = onActiveChange;

  const setContinuationActive = (active: boolean) => {
    if (continuationActiveRef.current === active) return;
    continuationActiveRef.current = active;
    onActiveChangeRef.current?.(active);
  };

  // Pre-compute FEN after each move in the continuation
  const stepFens = useMemo(() => {
    const fens: string[] = [];
    try {
      const chess = new Chess(startFen);
      for (const san of allMoves) {
        const result = chess.move(san);
        if (!result) break;
        fens.push(chess.fen());
      }
    } catch { /* ignore */ }
    return fens;
  }, [startFen, firstMove, line.join(",")]);

  // Pre-compute UCIs for arrow/highlight animation
  const stepUcis = useMemo(() => computeUcis(startFen, allMoves), [startFen, firstMove, line.join(",")]);

  // stepFens[i] = FEN after allMoves[i] (0-indexed from first move)
  // step 0 = no move played yet (show game position)
  // step 1 = after allMoves[0] (firstMove), so use stepFens[step - 1]
  useEffect(() => {
    if (step > 0 && stepFens[step - 1]) {
      const fen = stepFens[step - 1];
      onFenChangeRef.current?.(fen);
      const uci = stepUcis[step - 1];
      if (uci) {
        onArrowChangeRef.current?.({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
      }
      const cached = evalCache.current.get(fen);
      if (cached) {
        onEvalChangeRef.current?.(cached);
      } else {
        evaluateFen(fen, 12).then(ev => {
          evalCache.current.set(fen, ev);
          onEvalChangeRef.current?.(ev);
        }).catch(() => {});
      }
    } else if (step === 0) {
      onFenChangeRef.current?.(null);
      onEvalChangeRef.current?.(null);
      onArrowChangeRef.current?.(null);
    }
    setContinuationActive(step > 0);
  }, [step, stepFens, stepUcis]);

  // Reset when the line changes
  useEffect(() => {
    setStep(0);
    evalCache.current.clear();
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      setContinuationActive(false);
      onFenChangeRef.current?.(null);
      onEvalChangeRef.current?.(null);
      onArrowChangeRef.current?.(null);
    };
  }, [firstMove, line.join(",")])  // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to a step — no animation needed since stepping is sequential
  const goToStep = (nextStep: number) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    if (nextStep <= 0) { setStep(0); return; }
    if (nextStep > allMoves.length) return;
    setStep(nextStep);
  };

  return (
    <div className="border border-chess-border rounded-lg bg-chess-panel flex flex-col gap-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 pt-2 text-xs font-semibold uppercase tracking-wider text-chess-muted">
        <span>🔍</span>
        <span>{label}</span>
        <span className="ml-auto font-mono text-chess-muted/60">{step}/{allMoves.length}</span>
      </div>

      {/* Move display row */}
      <div className="flex items-center gap-1.5 px-2.5 flex-wrap">
        {allMoves.map((m, i) => (
          <button
            key={i}
            onClick={() => { goToStep(i + 1); }}
            className="font-mono text-sm font-bold px-2 py-0.5 rounded transition-all"
            style={
              i === step - 1
                ? { backgroundColor: `${accentColor}33`, color: accentColor, boxShadow: `0 0 0 1px ${accentColor}66` }
                : i < step - 1
                  ? { color: "#666", textDecoration: "line-through" }
                  : { color: "#888" }
            }
          >
            {m}
          </button>
        ))}
      </div>

      {/* Commentary for current step */}
      <div
        className="mx-2.5 mb-2 px-2 py-1.5 rounded text-xs text-chess-muted leading-relaxed"
        style={{ background: `${accentColor}0d` }}
      >
        {step === 0
          ? <><span className="font-bold" style={{ color: accentColor }}>{allMoves[0]}</span> was the engine's best move here.</>
          : <>After <span className="font-bold" style={{ color: accentColor }}>{allMoves[step - 1]}</span>, {
              step % 2 === 1
                ? " continuing the best line."
                : " this is the engine's response."
            }</>
        }
      </div>

      {/* Prev / Next controls */}
      <div className="flex border-t border-chess-border">
        <button
          onClick={() => goToStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex-1 py-1.5 text-xs font-semibold text-chess-muted disabled:opacity-30 hover:text-chess-text transition-colors border-r border-chess-border"
        >
          ← Prev
        </button>
        <button
          onClick={() => goToStep(Math.min(allMoves.length, step + 1))}
          disabled={step === allMoves.length}
          className="flex-1 py-1.5 text-xs font-semibold disabled:opacity-30 transition-colors hover:brightness-125"
          style={{ color: accentColor }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────

// Cache AI comments so we don't re-fetch when clicking back to the same move
const aiCommentCache = new Map<string, string>();

export const MoveReviewPanel: React.FC<MoveReviewPanelProps> = ({
  move,
  moveIdx,
  moves,
  onContinuationFen,
  onContinuationEval,
  onContinuationActive,
  onContinuationArrow,
}) => {
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch AI commentary for interesting moves
  useEffect(() => {
    if (!move) { setAiComment(null); return; }

    const cacheKey = `${moveIdx}:${move.san}`;

    // Check cache first
    if (aiCommentCache.has(cacheKey)) {
      setAiComment(aiCommentCache.get(cacheKey)!);
      return;
    }

    // Only skip AI for 'best' (routine). Book moves now get AI for richer opening insights.
    if (move.classification === "best" || !move.classification) {
      setAiComment(null);
      return;
    }

    let cancelled = false;
    setAiComment(null);
    setAiLoading(true);

    import("../utils/geminiCoach").then(({ getMovComment, isGeminiConfigured }) => {
      if (!isGeminiConfigured() || cancelled) { setAiLoading(false); return; }
      getMovComment(move).then(result => {
        if (cancelled) return;
        if (result) {
          aiCommentCache.set(cacheKey, result);
          setAiComment(result);
        }
        setAiLoading(false);
      }).catch(() => { if (!cancelled) setAiLoading(false); });
    });

    return () => { cancelled = true; };
  }, [moveIdx, move]);

  if (!move) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-chess-muted text-xs gap-2 p-6 text-center">
        <CoachIcon color="#6daa6d" size={36} />
        <p>Select a move to see coach notes, eval, and engine lines.</p>
      </div>
    );
  }

  const meta = move.classification ? getMeta(move.classification) : null;
  const accent = meta?.color ?? "#6daa6d";
  const staticComment = buildComment(move, moveIdx, moves);
  const displayComment = aiComment ?? staticComment;

  const isNegative = ["inaccuracy", "mistake", "blunder"].includes(move.classification ?? "");
  const isBrilliant = move.classification === "brilliant";
  const isGreat = move.classification === "great";
  const lossText = Math.abs(move.deltaE) >= 0.1
    ? `${move.deltaE > 0 ? "-" : "+"}${Math.abs(move.deltaE).toFixed(2)} pawns`
    : null;

  const showContinuation = move.bestMoveSan && (
    isNegative || isBrilliant || isGreat || move.classification === "excellent"
  );

  const playedBest =
    move.bestMove &&
    move.uci === move.bestMove;

  return (
    <div className="flex flex-col gap-3 p-3 text-sm flex-1">
      {/* Move + classification */}
      <div className="flex items-start gap-2">
        <div
          className="flex-shrink-0 rounded-full p-0.5 mt-0.5"
          style={{ background: `${accent}14` }}
        >
          <CoachIcon color={accent} size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-chess-muted text-xs font-mono">
              {move.moveNumber}
              {move.color === "w" ? "." : "..."}
            </span>
            <span className="font-bold text-chess-text font-mono text-base">
              {move.san}
            </span>
            {meta && (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                <ClassificationIcon type={move.classification!} size="sm" />
                {meta.label}
              </span>
            )}
          </div>
          {move.bestMoveSan && !playedBest && isNegative && (
            <p className="text-[11px] text-chess-muted mt-1">
              Engine suggests{" "}
              <span className="font-mono font-semibold text-move-best">
                {move.bestMoveSan}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Comment — AI or static fallback */}
      {displayComment && (
        <div
          className="text-xs leading-relaxed rounded p-2 transition-opacity duration-300"
          style={{
            color: meta?.color ?? "#aaa",
            backgroundColor: meta ? `${meta.color}11` : "transparent",
            opacity: aiLoading ? 0.6 : 1,
          }}
        >
          <p>{displayComment}</p>
          {aiComment && (
            <span className="inline-block mt-1 text-chess-muted opacity-40" style={{ fontSize: "9px" }}>✨ AI insight</span>
          )}
        </div>
      )}
      {aiLoading && !displayComment && (
        <div className="text-xs text-chess-muted px-2 py-1 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-chess-muted animate-pulse" />
          Thinking...
        </div>
      )}

      {/* Eval change */}
      {lossText && isNegative && (
        <div className="flex items-center gap-1.5 text-xs text-chess-muted">
          <span>Eval change:</span>
          <span className="font-semibold text-red-400">{lossText}</span>
        </div>
      )}

      {/* Interactive continuation */}
      {showContinuation && move.bestMoveSan && (
        <ContinuationViewer
          key={`${moveIdx}-${move.bestMoveSan}`}
          firstMove={move.bestMoveSan}
          line={move.pvLine ?? []}
          startFen={move.fenBefore}
          accentColor={isNegative ? "#6daa6d" : meta?.color ?? "#6daa6d"}
          label={
            isNegative
              ? "Better line from here"
              : playedBest
                ? "Engine line after your move"
                : "Engine's top line from here"
          }
          onFenChange={onContinuationFen}
          onEvalChange={onContinuationEval}
          onActiveChange={onContinuationActive}
          onArrowChange={onContinuationArrow}
        />
      )}
    </div>
  );
};
