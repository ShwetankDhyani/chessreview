import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalyzedMove, ReviewSummary } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const BANNED_PHRASES = [
  "lets some advantage slip",
  "lets advantage slip",
  "engine wanted",
  "engine suggests",
  "worth revisiting",
  "the right move",
  "this move",
  "the move",
  "not bad but",
  "slight imprecision",
  "still playable",
];

let genAI: GoogleGenerativeAI | null = null;
const recentLines: string[] = [];
const MAX_RECENT = 8;

function getClient() {
  if (!API_KEY || API_KEY === "your_api_key_here") return null;
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY);
  return genAI;
}

export function rememberCoachLine(line: string) {
  const t = line.trim();
  if (!t) return;
  recentLines.push(t);
  if (recentLines.length > MAX_RECENT) recentLines.shift();
}

export function clearCoachMemory() {
  recentLines.length = 0;
}

export function getRecentCoachLines(): string[] {
  return [...recentLines];
}

export interface MoveCommentContext {
  moveIdx?: number;
  recentPhrases?: string[];
  openingHint?: string;
}

function playerEvalCp(move: AnalyzedMove, when: "before" | "after"): string {
  const cp = (when === "before" ? move.evalBefore?.cp : move.evalAfter?.cp) ?? 0;
  const signed = move.color === "w" ? cp : -cp;
  return (signed / 100).toFixed(1);
}

function looksRepetitive(text: string, recent: string[]): boolean {
  const lower = text.toLowerCase();
  if (BANNED_PHRASES.some((p) => lower.includes(p))) return true;
  for (const prev of recent) {
    const a = lower.split(/\s+/).filter(Boolean);
    const b = prev.toLowerCase().split(/\s+/).filter(Boolean);
    if (a.length < 6 || b.length < 6) continue;
    const overlap = a.filter((w) => b.includes(w)).length;
    if (overlap / Math.min(a.length, b.length) > 0.55) return true;
  }
  return false;
}

// ─── Live move comment ────────────────────────────────────────────────────────
export async function getMovComment(
  move: AnalyzedMove,
  ctx: MoveCommentContext = {}
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const loss = Math.abs(move.deltaE);
  const lossText = loss >= 0.05 ? `${loss.toFixed(2)} pawns` : null;
  const moveNum = `${move.moveNumber}${move.color === "w" ? "." : "..."}`;
  const recent = [...(ctx.recentPhrases ?? []), ...recentLines].slice(-MAX_RECENT);
  const recentBlock =
    recent.length > 0
      ? `Comments you already gave earlier in this review (write something DIFFERENT):\n${recent.map((l) => `- ${l}`).join("\n")}\n`
      : "";

  const prompt = `You are a warm, sharp chess coach speaking directly to your student during a live review.

Move: ${moveNum}${move.san}
Classification: ${move.classification ?? "unknown"}
Student color: ${move.color === "w" ? "White" : "Black"}
Eval (student view) before → after: ${playerEvalCp(move, "before")} → ${playerEvalCp(move, "after")}
${lossText ? `Eval swing: ~${lossText}` : ""}
${move.bestMoveSan && move.uci !== move.bestMove ? `Stronger try: ${move.bestMoveSan}` : ""}
${move.pvLine?.length ? `Engine line: ${move.pvLine.slice(0, 4).join(" ")}` : ""}
${ctx.openingHint ? `Opening context: ${ctx.openingHint}` : ""}
${recentBlock}
Write ONE coaching note (2 short sentences, max 200 characters).

Style:
- Sound human and conversational — like a coach beside the board, not a report.
- Explain the chess idea (tactics, space, king safety, piece activity, pawn breaks, tempo).
- Vary openings: question, observation, encouragement, or concrete advice.
- Do NOT repeat phrasing from the list above.
- Do NOT say "this move", "the move", "engine wanted/suggests", "lets advantage slip", or restate the classification label.
- No markdown, bullets, emojis, or quotes.`;

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.92,
      maxOutputTokens: 110,
      topP: 0.95,
    },
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(
        attempt === 0
          ? prompt
          : `${prompt}\n\nYour last draft was too generic or repetitive. Be more specific to THIS position.`
      );
      const text = result.response
        .text()
        .trim()
        .replace(/\*+/g, "")
        .replace(/^["']|["']$/g, "")
        .slice(0, 220);

      if (text && !looksRepetitive(text, recent)) {
        rememberCoachLine(text);
        return text;
      }
    } catch {
      break;
    }
  }

  return null;
}

// ─── Short fallback when AI is off or fails ───────────────────────────────────
export function getFallbackMoveComment(
  move: AnalyzedMove,
  openingHint?: string
): string | null {
  const c = move.classification;
  if (!c) return null;
  const { san, bestMoveSan: best } = move;
  const loss = Math.abs(move.deltaE);
  const lossBit = loss >= 0.15 ? ` (~${loss.toFixed(1)} pawns)` : "";

  switch (c) {
    case "brilliant":
      return move.isSacrifice
        ? `${san} — a bold sacrifice with real point behind it.`
        : `${san} — sharp and exactly what the position called for.`;
    case "great":
      return `${san} — you found the critical resource here.`;
    case "best":
      return `${san} — clean and precise.`;
    case "excellent":
      return best && best !== san
        ? `${san} — very strong; ${best} was only a touch more exact.`
        : `${san} — accurate and well timed.`;
    case "good":
      return best && best !== san
        ? `${san} — playable, though ${best} was a bit more demanding.`
        : `${san} — keeps the game balanced.`;
    case "book":
      return openingHint
        ? `${san} — ${openingHint}`
        : `${san} — still in known theory.`;
    case "inaccuracy":
      return best
        ? `${san}${lossBit} — ${best} would have kept more pressure.`
        : `${san}${lossBit} — a small loosening; check opponent replies first.`;
    case "mistake":
      return best
        ? `${san}${lossBit} — ${best} was the way to stay in the game.`
        : `${san}${lossBit} — the evaluation shifts here.`;
    case "blunder":
      return best
        ? `${san}${lossBit} — ${best} avoids the tactical leak.`
        : `${san}${lossBit} — a turning point in the game.`;
    default:
      return null;
  }
}

// ─── Full game coaching report ────────────────────────────────────────────────
export interface CoachReport {
  summary: string;
  tips: Array<{
    icon: string;
    title: string;
    body: string;
    color: string;
    bg: string;
    moveIdx?: number;
  }>;
}

export async function getGameReport(
  moves: AnalyzedMove[],
  summary: ReviewSummary,
  playerName: string
): Promise<CoachReport | null> {
  const client = getClient();
  if (!client) return null;

  const blunders = moves.filter((m) => m.classification === "blunder");
  const mistakes = moves.filter((m) => m.classification === "mistake");
  const brilliant = moves.filter((m) => m.classification === "brilliant");
  const opening = moves.slice(0, 6).map((m) => m.san).join(" ");
  const wAcc = summary.accuracy.white.toFixed(1);
  const bAcc = summary.accuracy.black.toFixed(1);
  const worstBlunder = [...blunders].sort(
    (a, b) => Math.abs(b.deltaE) - Math.abs(a.deltaE)
  )[0];

  const prompt = `You are a chess coach writing a post-game training report for ${playerName}.

Game stats:
- Accuracy: White ${wAcc}%, Black ${bAcc}%
- Blunders: ${blunders.length}, Mistakes: ${mistakes.length}, Brilliant moves: ${brilliant.length}
- Opening moves: ${opening}
${worstBlunder ? `- Worst blunder: move ${worstBlunder.moveNumber}${worstBlunder.color === "w" ? "." : "..."}${worstBlunder.san}${worstBlunder.bestMoveSan ? `, should have played ${worstBlunder.bestMoveSan}` : ""}` : ""}

Write a JSON response with this exact structure (no markdown, just raw JSON):
{
  "summary": "A warm 2-sentence overall assessment of the game",
  "tips": [
    {
      "icon": "emoji",
      "title": "Short title (4-6 words)",
      "body": "1-2 sentences of specific, actionable coaching advice",
      "color": "one of: #1baca6 #6daa6d #e6c84a #e07b39 #ca3c3c #5c8bb0 #a88865"
    }
  ]
}

Give 3-4 tips. Be specific and conversational. Never reuse the same sentence opener twice.`;

  try {
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0.85, maxOutputTokens: 600 },
    });
    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .trim()
      .replace(/^```json\n?/, "")
      .replace(/^```\n?/, "")
      .replace(/\n?```$/, "");
    const parsed = JSON.parse(text) as {
      summary: string;
      tips: Array<{ icon: string; title: string; body: string; color: string }>;
    };

    return {
      summary: parsed.summary,
      tips: parsed.tips.map((t) => ({
        ...t,
        bg: t.color + "18",
        color: t.color,
      })),
    };
  } catch {
    return null;
  }
}

export function isGeminiConfigured(): boolean {
  return !!API_KEY && API_KEY !== "your_api_key_here";
}
