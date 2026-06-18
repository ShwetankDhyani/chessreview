import React, { useMemo, useState, useEffect, useRef } from "react";
import { CoachIcon } from "./CoachIcon";
import type { AnalyzedMove, ReviewSummary } from "../types";
import {
  getMovComment,
  getGameReport,
  getFallbackMoveComment,
  isGeminiConfigured,
  type CoachReport,
} from "../utils/geminiCoach";

interface CoachPanelProps {
  moves: AnalyzedMove[];
  summary: ReviewSummary | null;
  currentMove: AnalyzedMove | null;
  currentMoveIdx: number;
  onJumpToMove: (idx: number) => void;
  keyMomentsOnly?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectOpening(moves: AnalyzedMove[]): string {
  const s = moves.slice(0, 6).map(m => m.san).join(" ");
  if (s.match(/Nf6/) && s.match(/d4/) && s.match(/Bb4/)) return "Nimzo-Indian Defense";
  if (s.match(/Nf6/) && s.match(/d4/)) return "Indian Defense";
  if (s.match(/e4/) && s.match(/c5/)) return "Sicilian Defense";
  if (s.match(/e4/) && s.match(/e6/)) return "French Defense";
  if (s.match(/e4/) && s.match(/c6/)) return "Caro-Kann Defense";
  if (s.match(/e4/) && s.match(/e5/)) return "Open Game";
  if (s.match(/d4/) && s.match(/d5/) && s.match(/c4/)) return "Queen's Gambit";
  if (s.match(/c4/)) return "English Opening";
  if (s.match(/Nf3/) && !s.match(/d4/)) return "Réti Opening";
  if (s.match(/d4/)) return "Queen's Pawn Game";
  return "this opening";
}

type LiveMood = "brilliant" | "blunder" | "mistake" | "inaccuracy" | "good" | "neutral";

function getLiveMood(c: string | null): LiveMood {
  if (c === "brilliant" || c === "great") return "brilliant";
  if (c === "blunder") return "blunder";
  if (c === "mistake") return "mistake";
  if (c === "inaccuracy") return "inaccuracy";
  if (c === "best" || c === "excellent") return "good";
  return "neutral";
}

const MOOD_STYLES: Record<LiveMood, { border: string; bg: string; text: string; face: string }> = {
  brilliant:  { border: "#1baca6", bg: "#1baca611", text: "#1baca6", face: "🤩" },
  blunder:    { border: "#ca3c3c", bg: "#ca3c3c11", text: "#ca3c3c", face: "😱" },
  mistake:    { border: "#e07b39", bg: "#e07b3911", text: "#e07b39", face: "😬" },
  inaccuracy: { border: "#e6c84a", bg: "#e6c84a11", text: "#e6c84a", face: "🤔" },
  good:       { border: "#6daa6d", bg: "#6daa6d11", text: "#6daa6d", face: "😊" },
  neutral:    { border: "#3a3a3a", bg: "#1a1a1a",   text: "#888",    face: "🔬" },
};

function buildTips(moves: AnalyzedMove[], summary: ReviewSummary) {
  const blunders = moves.filter(m => m.classification === "blunder");
  const mistakes = moves.filter(m => m.classification === "mistake");
  const brilliant = moves.filter(m => m.classification === "brilliant");
  const opening = detectOpening(moves);
  const openingBad = moves.slice(0, 12).filter(m => ["blunder","mistake","inaccuracy"].includes(m.classification ?? ""));
  const endgameMoves = moves.slice(Math.floor(moves.length * 0.7));
  const endgameBad = endgameMoves.filter(m => ["blunder","mistake"].includes(m.classification ?? ""));
  const isRookEndgame = endgameMoves.some(m => m.san.startsWith("R"));
  const wAcc = summary.accuracy.white, bAcc = summary.accuracy.black;

  const tips: Array<{ color: string; bg: string; icon: string; title: string; body: string; moveIdx?: number }> = [];

  if (brilliant.length > 0) tips.push({
    color: "#1baca6", bg: "#1baca611", icon: "⭐",
    title: `${brilliant.length} Brilliant Move${brilliant.length>1?"s":""}!`,
    body: "You have real tactical instincts. That kind of play wins games.",
  });

  if (blunders.length > 0) {
    const worst = [...blunders].sort((a,b) => Math.abs(b.deltaE)-Math.abs(a.deltaE))[0];
    tips.push({
      color: "#ca3c3c", bg: "#ca3c3c11", icon: "💀",
      title: `${blunders.length} Blunder${blunders.length>1?"s":""}`,
      body: `Worst: move ${worst.moveNumber}${worst.color==="w"?".":"…"}${worst.san}${worst.bestMoveSan ? ` — missed ${worst.bestMoveSan}` : ""}. Work on calculating 2-3 moves ahead before committing.`,
      moveIdx: moves.indexOf(worst),
    });
  }

  if (mistakes.length >= 2) tips.push({
    color: "#e07b39", bg: "#e07b3911", icon: "🎯",
    title: `${mistakes.length} Mistakes`,
    body: "Solving 10 tactics puzzles daily will sharpen pattern recognition and cut these down.",
  });

  if (openingBad.length >= 2) tips.push({
    color: "#a88865", bg: "#a8886511", icon: "📚",
    title: `Opening Study: ${opening}`,
    body: `${openingBad.length} imprecisions in the opening. Knowing your lines to move 12 gives a huge head-start.`,
  });

  if (endgameBad.length >= 2) tips.push({
    color: "#5c8bb0", bg: "#5c8bb011", icon: isRookEndgame ? "♜" : "♔",
    title: isRookEndgame ? "Rook Endgame Technique" : "Endgame Accuracy",
    body: isRookEndgame
      ? "Study the Lucena and Philidor positions — they're the foundation of all rook endgames."
      : "King activation and pawn structure in endgames needs work. K+P endgames are a great starting point.",
  });

  if (Math.min(wAcc, bAcc) < 60) tips.push({
    color: "#888", bg: "#88888811", icon: "🧠",
    title: "Slow Down",
    body: "Accuracy under 60% often means moving too fast. Pause before each move and ask: what's my opponent's threat?",
  });

  if (tips.length === 0) tips.push({
    color: "#6daa6d", bg: "#6daa6d11", icon: "🏆",
    title: `Solid Game! ${wAcc.toFixed(0)}% / ${bAcc.toFixed(0)}%`,
    body: "No glaring patterns. Review the subtle inaccuracies and you'll keep improving.",
  });

  return tips;
}

// ─── Clickable move tokens in speech ────────────────────────────────────────
function renderComment(
  text: string,
  moves: AnalyzedMove[],
  onJump: (idx: number) => void,
  accentColor: string,
  currentMoveIdx: number
): React.ReactNode {
  const sanRe = /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O-O|O-O)\b/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = sanRe.exec(text)) !== null) {
    const token = m[1];
    if (last < m.index) parts.push(text.slice(last, m.index));

    // Find the closest move to currentMoveIdx that matches this SAN
    const candidates = moves
      .map((mv, i) => ({ mv, i }))
      .filter(({ mv }) => mv.san === token);
    let best = candidates[0];
    if (candidates.length > 1) {
      best = candidates.reduce((closest, c) =>
        Math.abs(c.i - currentMoveIdx) < Math.abs(closest.i - currentMoveIdx) ? c : closest
      );
    }

    if (best) {
      parts.push(
        <button
          key={m.index}
          onClick={() => onJump(best.i)}
          className="font-mono font-bold underline underline-offset-2 hover:brightness-125 transition-all"
          style={{ color: accentColor }}
        >
          {token}
        </button>
      );
    } else {
      parts.push(token);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const CoachPanel: React.FC<CoachPanelProps> = ({
  moves, summary, currentMove, currentMoveIdx, onJumpToMove, keyMomentsOnly = false,
}) => {
  const gemini = isGeminiConfigured();

  // AI live comment — stable per move index to stop flickering
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const lastCommentedIdx = useRef<number>(-99);

  // Stable static comment per move — computed once per move, not every render
  const staticComment = useRef<string>("");
  const staticCommentIdx = useRef<number>(-99);

  // AI game report state
  const [report, setReport] = useState<CoachReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const reportFetched = useRef(false);

  const staticTips = useMemo(() => summary ? buildTips(moves, summary) : [], [moves, summary]);

  const keyMoments = useMemo(() =>
    [...moves]
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => ["blunder", "mistake", "brilliant"].includes(m.classification ?? ""))
      .sort((a, b) => Math.abs(b.m.deltaE) - Math.abs(a.m.deltaE))
      .slice(0, 5),
    [moves]
  );

  useEffect(() => {
    if (!currentMove || currentMoveIdx === lastCommentedIdx.current) return;
    lastCommentedIdx.current = currentMoveIdx;
    setAiComment(null);

    const opening = detectOpening(moves);
    const openingHint = opening !== "this opening" ? opening : undefined;

    if (!gemini) {
      staticComment.current =
        getFallbackMoveComment(currentMove, openingHint, currentMoveIdx) ??
        `${currentMove.san} — select another move for more detail.`;
      setCommentLoading(false);
      return;
    }

    setCommentLoading(true);
    getMovComment(currentMove, {
      moveIdx: currentMoveIdx,
      openingHint,
    })
      .then((c) => {
        setAiComment(c);
        staticComment.current =
          c ??
          getFallbackMoveComment(currentMove, openingHint, currentMoveIdx) ??
          staticComment.current;
        setCommentLoading(false);
      })
      .catch(() => {
        staticComment.current =
          getFallbackMoveComment(currentMove, openingHint, currentMoveIdx) ?? staticComment.current;
        setCommentLoading(false);
      });
  }, [currentMoveIdx, currentMove, gemini, moves]);

  // Fetch AI game report once
  useEffect(() => {
    if (!moves.length || !summary || reportFetched.current || !gemini) return;
    reportFetched.current = true;
    setReportLoading(true);
    getGameReport(moves, summary, "you").then(r => {
      setReport(r);
      setReportLoading(false);
    });
  }, [moves, summary, gemini]);

  const mood = currentMove ? getLiveMood(currentMove.classification) : "neutral";
  const style = MOOD_STYLES[mood];

  if (currentMove && currentMoveIdx !== staticCommentIdx.current) {
    staticCommentIdx.current = currentMoveIdx;
    staticComment.current =
      getFallbackMoveComment(currentMove, undefined, currentMoveIdx) ?? "";
  }

  const displayComment = aiComment
    ?? (commentLoading ? null
      : currentMove ? staticComment.current
      : moves.length > 0 ? "Click any move to get my live take on it."
      : "Analyse a game and I'll coach you through it!");

  const displayTips = report?.tips ?? staticTips;

  // Empty state
  if (!moves.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full p-4 text-center">
        <div className="text-5xl animate-bounce">🔬</div>
        <p className="text-sm font-bold text-chess-subtext">Coach</p>
        <p className="text-xs text-chess-muted leading-relaxed">
          Load a game, run the analysis, and get clear notes on what to improve.
        </p>
        {!gemini && (
          <p className="text-xs text-chess-muted leading-relaxed mt-1">
            Load a game and step through moves for coaching tips.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Coach avatar + live commentary ── (hidden in keyMomentsOnly mode) */}
      {keyMomentsOnly ? null : (<>
      <div
        className="p-3 border-b border-chess-border flex-shrink-0"
        style={{ height: "9rem" }}
      >
        <div className="flex items-start gap-3 h-full">
          <div
            className="flex-shrink-0 select-none"
            style={{ filter: `drop-shadow(0 0 8px ${style.border}88)` }}
          >
            <CoachIcon color={style.border} size={48} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <div className="flex items-center gap-1.5 mb-1.5 flex-shrink-0">
              <span className="text-xs font-bold" style={{ color: style.border }}>Coach</span>
              {gemini && <span className="text-xs px-1 rounded" style={{ background: "#1baca622", color: "#1baca6" }}>AI</span>}
            </div>
            <div
              className="rounded-xl rounded-tl-none px-3 py-2 text-xs leading-relaxed flex-1 overflow-y-auto"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}44`,
                color: "#d0d0d0",
              }}
            >
              {commentLoading ? (
                <span className="flex items-center gap-1.5 text-chess-muted italic">
                  <span className="inline-block w-2 h-2 rounded-full bg-move-brilliant animate-pulse" />
                  Thinking…
                </span>
              ) : displayComment ? renderComment(displayComment, moves, onJumpToMove, style.border, currentMoveIdx) : null}
            </div>
          </div>
        </div>
      </div>
      </>)}

      {/* ── Key moments ── */}
      {keyMoments.length > 0 && (
        <div className="p-3 border-b border-chess-border flex-shrink-0">
          <div className="text-xs font-bold text-chess-muted uppercase tracking-wider mb-2">⚡ Key Moments</div>
          <div className="flex flex-col gap-1.5">
            {keyMoments.map(({ m, i }) => {
              const c = m.classification;
              const isBrilliant = c === "brilliant";
              const isBlunder = c === "blunder";
              const color = isBrilliant ? "#1baca6" : isBlunder ? "#ca3c3c" : "#e07b39";
              const icon = isBrilliant ? "⭐" : isBlunder ? "💀" : "❗";
              const glyph = isBrilliant ? "!!" : isBlunder ? "??" : "?!";
              const glyphTitle = isBrilliant
                ? `Brilliant! Creative sacrifice the engine loves. Eval: +${Math.abs(m.deltaE).toFixed(1)} pawns.`
                : isBlunder
                  ? `Blunder — major mistake. Eval loss: −${Math.abs(m.deltaE).toFixed(1)} pawns.${m.bestMoveSan ? ` Engine wanted ${m.bestMoveSan}.` : ""}`
                  : `Mistake — advantage slipped. Eval loss: −${Math.abs(m.deltaE).toFixed(1)} pawns.${m.bestMoveSan ? ` Better: ${m.bestMoveSan}.` : ""}`;
              return (
                <button
                  key={i}
                  onClick={() => onJumpToMove(i)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left w-full"
                  style={{ background: `${color}15`, border: `1px solid ${color}44` }}
                >
                  <span className="text-base select-none flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-bold text-chess-text">
                      {m.moveNumber}{m.color === "w" ? "." : "…"}{m.san}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color }}>
                      {isBrilliant ? "Brilliant move" : isBlunder ? "Blunder" : "Mistake"}
                      {!isBrilliant && ` · −${Math.abs(m.deltaE).toFixed(1)}♟`}
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold font-mono px-1.5 py-0.5 rounded flex-shrink-0 cursor-help"
                    style={{ background: `${color}25`, color }}
                    title={glyphTitle}
                    onClick={e => e.stopPropagation()}
                  >
                    {glyph}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AI game summary ── */}
      {report?.summary && (
        <div className="px-3 pt-3 pb-0 flex-shrink-0">
          <div className="text-xs leading-relaxed text-chess-subtext italic border-l-2 border-move-brilliant pl-2">
            {report.summary}
          </div>
        </div>
      )}

      {/* ── Training plan ── */}
      <div className="p-3 flex flex-col gap-2.5">
        <div className="text-xs font-bold text-chess-muted uppercase tracking-wider flex items-center gap-1.5">
          🧪 Training Plan
          {reportLoading && <span className="inline-block w-2 h-2 rounded-full bg-move-brilliant animate-pulse" />}
        </div>
        {displayTips.map((tip, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 flex gap-2.5 items-start ${tip.moveIdx !== undefined ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
            style={{ background: tip.bg, border: `1px solid ${tip.color}44` }}
            onClick={() => tip.moveIdx !== undefined && onJumpToMove(tip.moveIdx!)}
          >
            <span className="text-xl flex-shrink-0">{tip.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold mb-1" style={{ color: tip.color }}>{tip.title}</div>
              <div className="text-xs text-chess-muted leading-relaxed">{tip.body}</div>
            </div>
            {tip.moveIdx !== undefined && (
              <span className="text-sm flex-shrink-0" style={{ color: tip.color }}>→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
