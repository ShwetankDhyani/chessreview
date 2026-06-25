import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalyzedMove, ReviewSummary } from "../types";
import { COACH_BANNED_SUBSTRINGS } from "./coachPhraseBank";
import {
  describePositionForCoach,
  getPositionAwareMoveComment,
  playerCp,
} from "./coachPositionContext";
import { streamerCoachStyleNote } from "./coachStreamerPhrases";
import { formatWinChanceLoss } from "./evalDisplay";
import { isLeftBookMove } from "./openingContext";
import {
  clearCoachPhraseMemory,
  getUsedCoachPhraseTemplates,
  isRoboticRepetition,
  rememberCoachPhrase,
} from "./coachVariety";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

let genAI: GoogleGenerativeAI | null = null;
const recentLines: string[] = [];
const MAX_RECENT = 30;

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
  rememberCoachPhrase(t);
}

export function clearCoachMemory() {
  recentLines.length = 0;
  clearCoachPhraseMemory();
}

export interface MoveCommentContext {
  moveIdx?: number;
  recentPhrases?: string[];
  openingHint?: string;
  moves?: AnalyzedMove[];
}

function playerEvalCp(move: AnalyzedMove, when: "before" | "after"): string {
  return (playerCp(move, when) / 100).toFixed(1);
}

function allRecentForDedup(ctx: MoveCommentContext): string[] {
  return [
    ...(ctx.recentPhrases ?? []),
    ...recentLines,
    ...getUsedCoachPhraseTemplates(),
  ];
}

// ─── Live move comment ────────────────────────────────────────────────────────
export async function getMovComment(
  move: AnalyzedMove,
  ctx: MoveCommentContext = {}
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const loss = Math.abs(move.deltaE);
  const lossText = formatWinChanceLoss(loss);
  const moveNum = `${move.moveNumber}${move.color === "w" ? "." : "..."}`;
  const recent = allRecentForDedup(ctx).slice(-MAX_RECENT);
  const recentBlock =
    recent.length > 0
      ? `Comments you already gave earlier in this review (do NOT reuse words, rhythm, or opener):\n${recent.map((l) => `- ${l}`).join("\n")}\n`
      : "";

  const moveIdx = ctx.moveIdx ?? 0;
  const leftBook =
    ctx.moves != null && isLeftBookMove(moveIdx, ctx.moves);
  const streamerNote = streamerCoachStyleNote(move.classification, leftBook);

  const prompt = `You are a warm, sharp chess coach speaking directly to your student during a live review.

Move: ${moveNum}${move.san}
Classification: ${move.classification ?? "unknown"}
Student color: ${move.color === "w" ? "White" : "Black"}
Eval (student view) before → after: ${playerEvalCp(move, "before")} → ${playerEvalCp(move, "after")}
${lossText ? `Eval swing: ~${lossText}` : ""}
${move.bestMoveSan && move.uci !== move.bestMove ? `Stronger try: ${move.bestMoveSan}` : ""}
${move.pvLine?.length ? `Engine line: ${move.pvLine.slice(0, 4).join(" ")}` : ""}
${ctx.openingHint ? `Opening context: ${ctx.openingHint}` : ""}
${streamerNote ? `Voice note: ${streamerNote}` : ""}
${recentBlock}
Position context (match tone to reality — do not cheer a lost game):
${describePositionForCoach(move)}

Write ONE coaching note (2 short sentences, max 200 characters).

Style:
- Sound human and conversational — like a coach beside the board, not a report.
- Explain the chess idea (tactics, space, king safety, piece activity, pawn breaks, tempo).
- Vary sentence openers every move: never start two comments the same way in one game.
- If brilliant while still losing: admire the idea but note it may be too late; do not pretend the game is fine.
- If blunder while already losing badly: matter-of-fact, no false hope or generic pep talk.
- If already winning and accurate: calm satisfaction, not over-the-top praise.
- Do NOT repeat phrasing from the list above.
- Do NOT say "this move", "the move", "engine wanted/suggests", "lets advantage slip", or restate the classification label.
- Never use these clichés: clean and precise, accurate and well timed, timely and precise, solid technique, exactly what the position demanded, engine's top choice.
- No markdown, bullets, emojis, or quotes.`;

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.95,
      maxOutputTokens: 110,
      topP: 0.92,
    },
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent(
        attempt === 0
          ? prompt
          : `${prompt}\n\nYour last draft was too generic or repetitive. Use a fresh opener and a concrete chess idea unique to THIS ply.`
      );
      const text = result.response
        .text()
        .trim()
        .replace(/\*+/g, "")
        .replace(/^["']|["']$/g, "")
        .slice(0, 220);

      if (text && !isRoboticRepetition(text, recent, COACH_BANNED_SUBSTRINGS)) {
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
  openingHint?: string,
  moveIdx = 0,
  moves?: AnalyzedMove[]
): string | null {
  return getPositionAwareMoveComment(move, moveIdx, openingHint, true, moves);
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
